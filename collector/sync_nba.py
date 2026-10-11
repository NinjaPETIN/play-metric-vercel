"""NBA.com -> Play Metric. Credentials stay in environment variables."""
import argparse
import json
import math
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path


def season_candidates(now=None):
    now = now or datetime.now(timezone.utc)
    year = now.year if now.month >= 10 else now.year - 1
    return [f'{year}-{(year+1)%100:02d}', f'{year-1}-{year%100:02d}']


SEASON_TYPES = {"regular": "Regular Season", "preseason": "Pre Season", "playoffs": "Playoffs"}
EXTRA_STATS = {"STL":"steals","BLK":"blocks","TOV":"turnovers","FGA":"fieldGoalsAttempted","FGM":"fieldGoalsMade","FTA":"freeThrowsAttempted","FTM":"freeThrowsMade","OREB":"offensiveRebounds","DREB":"defensiveRebounds","FG3A":"threeAttempts"}

def normalize(rows, season, competition="regular"):
    players, seen = {}, set()
    # A traded player's team comes from their latest completed game.
    for row in sorted(rows, key=lambda r: str(r.get('GAME_DATE', '')), reverse=True):
        try:
            pid = int(row['PLAYER_ID'])
            key = (pid, str(row['GAME_ID']))
            if key in seen or row.get('WL') not in ('W', 'L'):
                continue
            fields = [float(row[k]) for k in ('MIN', 'PTS', 'REB', 'AST', 'FG3M')]
            if not all(math.isfinite(v) and v >= 0 for v in fields) or fields[0] <= 0:
                continue
            minutes, points, rebounds, assists, threes = fields
            matchup = str(row['MATCHUP'])
            if ' vs. ' not in matchup and ' @ ' not in matchup:
                continue
            date = datetime.fromisoformat(str(row['GAME_DATE']).replace('Z', '+00:00')).date().isoformat()
            player = players.setdefault(pid, {'id': pid, 'name': str(row['PLAYER_NAME']), 'team': str(row.get('TEAM_ABBREVIATION') or matchup.split()[0]), 'games': []})
            player['games'].append({'gameId': str(row['GAME_ID']), 'team': str(row.get('TEAM_ABBREVIATION') or matchup.split()[0]), 'date': date, 'opponent': matchup.split()[-1], 'home': ' vs. ' in matchup, 'minutes': minutes, 'points': points, 'rebounds': rebounds, 'assists': assists, 'threes': threes, 'played': True})
            for field, name in EXTRA_STATS.items():
                try:
                    number = float(row[field])
                    if math.isfinite(number) and number >= 0: player['games'][-1][name] = number
                except (KeyError, ValueError, TypeError): pass
            seen.add(key)
        except (KeyError, ValueError, TypeError):
            continue
    for player in players.values():
        player['games'].sort(key=lambda g: g['date'], reverse=True)
    return {'source': 'nba_api', 'competition': competition, 'season': season, 'fetchedAt': datetime.now(timezone.utc).isoformat(), 'players': list(players.values())}



def normalize_team_games(rows):
    pairs = {}
    for row in rows:
        try:
            gid,team,matchup=str(row['GAME_ID']),str(row['TEAM_ABBREVIATION']),str(row['MATCHUP'])
            score=float(row['PTS']); date=datetime.fromisoformat(str(row['GAME_DATE']).replace('Z','+00:00')).date().isoformat()
            if not re.fullmatch(r'\d{10}',gid) or row.get('WL') not in ('W','L') or not math.isfinite(score) or score<0 or not score.is_integer(): continue
            if ' vs. ' not in matchup and ' @ ' not in matchup: continue
            pairs.setdefault(gid,{})[team]={'team':team,'opponent':matchup.split()[-1],'home':' vs. ' in matchup,'score':int(score),'date':date,'won':row['WL']=='W'}
        except (KeyError,ValueError,TypeError): continue
    games=[]
    for gid,teams in pairs.items():
        if len(teams)!=2: continue
        home=next((x for x in teams.values() if x['home']),None); away=next((x for x in teams.values() if not x['home']),None)
        if not home or not away or home['date']!=away['date'] or home['opponent']!=away['team'] or away['opponent']!=home['team'] or home['score']==away['score'] or home['won']!=(home['score']>away['score']) or away['won']==home['won']: continue
        games.append({'id':gid,'date':home['date'],'home':home['team'],'away':away['team'],'homeScore':home['score'],'awayScore':away['score']})
    return sorted(games,key=lambda g:(g['date'],g['id']),reverse=True)


def fetch_snapshot(season, attempts=3, competition="regular"):
    from nba_api.stats.endpoints import playergamelogs, leaguegamelog
    for attempt in range(attempts):
        try:
            dataset = playergamelogs.PlayerGameLogs(season_nullable=season, season_type_nullable=SEASON_TYPES[competition], timeout=25).get_normalized_dict()
            # Empty success is different from a failed request: only empty seasons allow fallback.
            if 'PlayerGameLogs' not in dataset:
                raise ValueError('Missing PlayerGameLogs')
            snapshot=normalize(dataset['PlayerGameLogs'], int(season[:4]), competition)
            if snapshot['players']:
                team_data=leaguegamelog.LeagueGameLog(season=season,season_type_all_star=SEASON_TYPES[competition],player_or_team_abbreviation='T',timeout=25).get_normalized_dict()
                if 'LeagueGameLog' not in team_data: raise ValueError('Missing LeagueGameLog')
                snapshot['teamGames']=normalize_team_games(team_data['LeagueGameLog'])
                if not snapshot['teamGames']: raise ValueError('Missing team results')
            return snapshot
        except Exception:
            if attempt + 1 == attempts:
                raise RuntimeError('NBA.com no respondió. Se conservan los datos anteriores.') from None
            time.sleep(2 ** attempt)


def upload(snapshot, origin):
    import requests
    from urllib.parse import urlparse
    parsed = urlparse(origin)
    if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password or parsed.path not in ('', '/') or parsed.query or parsed.fragment:
        raise RuntimeError('Use un origen HTTPS sin ruta ni credenciales.')
    token = os.environ.get('PLAY_METRIC_SERVICE_TOKEN')
    if not token:
        raise RuntimeError('Falta PLAY_METRIC_SERVICE_TOKEN.')
    try:
        response = requests.post(origin.rstrip('/') + '/api/nba/import', json=snapshot, headers={'Authorization': 'Bearer ' + token}, timeout=90, allow_redirects=False)
        response.raise_for_status()
        receipt = response.json()
        check = requests.get(origin.rstrip('/') + '/api/props', params={'season': snapshot['season'], 'competition': snapshot.get('competition', 'regular')}, headers={'Authorization': 'Bearer ' + token, 'Cache-Control': 'no-cache'}, timeout=45, allow_redirects=False)
        check.raise_for_status()
        current = check.json()
        if current.get('fetchedAt') != snapshot['fetchedAt'] or len(current.get('players', [])) != len(snapshot['players']) or ('teamGames' in snapshot and len(current.get('teamGames', [])) != len(snapshot['teamGames'])):
            raise RuntimeError('La lectura posterior no coincide con la importación.')
        return receipt
    except requests.RequestException:
        raise RuntimeError('Falló la importación o la lectura posterior. No se marcará como actualizada.') from None


def normalize_calendar(raw, season):
    schedule = raw.get('leagueSchedule', {})
    if schedule.get('seasonYear') != season:
        raise RuntimeError('El calendario no coincide con la temporada solicitada.')
    games, seen = [], set()
    for day in schedule.get('gameDates', []):
        for game in day.get('games', []):
            try:
                gid = str(game['gameId'])
                if gid in seen or not re.fullmatch(r'\d{10}', gid) or gid[2] not in ('1', '2', '4', '6'): continue
                home, away = game['homeTeam'], game['awayTeam']
                if int(home['teamId']) <= 0 or int(away['teamId']) <= 0: continue
                starts = str(game.get('gameDateTimeUTC', ''))
                starts_at = datetime.fromisoformat(starts.replace('Z', '+00:00')).isoformat() if starts and not starts.startswith('1900') else None
                if starts_at and datetime.fromisoformat(starts_at).tzinfo is None: starts_at += '+00:00'
                date = str(game['gameCode'])[:8]
                date = datetime.strptime(date, '%Y%m%d').date().isoformat()
                status = int(game['gameStatus'])
                competition = 'preseason' if gid[2] == '1' else 'playoffs' if gid[2] == '4' else 'regular'
                games.append({'id':gid,'date':date,'startsAt':starts_at,'home':str(home['teamTricode']),'away':str(away['teamTricode']),'homeId':int(home['teamId']),'awayId':int(away['teamId']),'homeName':str(home.get('teamCity','')+' '+home.get('teamName','')).strip(),'awayName':str(away.get('teamCity','')+' '+away.get('teamName','')).strip(),'status':status,'statusText':str(game.get('gameStatusText','')),'homeScore':int(home['score']) if status > 1 and home.get('score') is not None else None,'awayScore':int(away['score']) if status > 1 and away.get('score') is not None else None,'competition':competition})
                seen.add(gid)
            except (KeyError, ValueError, TypeError): continue
    return {'source':'nba_api','season':int(season[:4]),'fetchedAt':datetime.now(timezone.utc).isoformat(),'games':sorted(games,key=lambda g:g['startsAt'] or g['date'])}


def fetch_calendar(season, attempts=3):
    from nba_api.stats.endpoints import scheduleleaguev2
    for attempt in range(attempts):
        try:
            # nba_api's normalized parser may return {} for a valid nested schedule.
            raw = scheduleleaguev2.ScheduleLeagueV2(season=season, timeout=25).get_dict()
            calendar = normalize_calendar(raw, season)
            if not calendar['games']: raise ValueError('Empty calendar')
            return calendar
        except Exception:
            if attempt + 1 == attempts: raise RuntimeError('NBA no devolvió un calendario válido.') from None
            time.sleep(2 ** attempt)


def upload_calendar(calendar, origin):
    import requests
    token = os.environ.get('PLAY_METRIC_SERVICE_TOKEN')
    if not token: raise RuntimeError('Falta PLAY_METRIC_SERVICE_TOKEN.')
    try:
        headers={'Authorization':'Bearer '+token}
        response=requests.post(origin.rstrip('/')+'/api/nba/calendar/import',json=calendar,headers=headers,timeout=60,allow_redirects=False)
        response.raise_for_status()
        check=requests.get(origin.rstrip('/')+'/api/nba/calendar',headers={**headers,'Cache-Control':'no-cache'},timeout=45,allow_redirects=False)
        check.raise_for_status()
        current=check.json()
        if current.get('fetchedAt') != calendar['fetchedAt'] or len(current.get('games',[])) != len(calendar['games']): raise RuntimeError('La lectura del calendario no coincide.')
    except requests.RequestException: raise RuntimeError('Falló la importación o verificación del calendario.') from None


def write_snapshot(data, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp=path.with_suffix(path.suffix+'.tmp')
    temp.write_text(json.dumps(data,ensure_ascii=False),encoding='utf-8');temp.replace(path)


def sync_profiles(ids, origin, limit=30):
    """Refresh biographies separately; never overwrite a failed player lookup."""
    import requests
    from nba_api.stats.endpoints import commonplayerinfo
    from concurrent.futures import ThreadPoolExecutor
    token=os.environ.get('PLAY_METRIC_SERVICE_TOKEN')
    if not token: raise RuntimeError('Falta PLAY_METRIC_SERVICE_TOKEN.')
    headers={'Authorization':'Bearer '+token,'Cache-Control':'no-cache'}
    try:
        r=requests.get(origin.rstrip('/')+'/api/nba/profiles',headers=headers,timeout=45,allow_redirects=False);r.raise_for_status();known={str(p['id']):p for p in r.json()['profiles']}
    except (requests.RequestException,ValueError,KeyError): raise RuntimeError('No se pudo leer el catálogo biográfico.') from None
    now=datetime.now(timezone.utc)
    needed=[str(i) for i in ids if str(i) not in known or (now-datetime.fromisoformat(known[str(i)]['fetchedAt'].replace('Z','+00:00'))).days>=30]
    needed.sort(key=lambda i:(i in known,int(i)))
    def collect(pid):
        try:
            rows=commonplayerinfo.CommonPlayerInfo(player_id=pid,timeout=12).get_normalized_dict()['CommonPlayerInfo']
            row=rows[0]
            if str(row['PERSON_ID'])!=pid: return None
            birth=str(row.get('BIRTHDATE') or '')
            profile={'id':pid,'position':row.get('POSITION') or None,'birthYear':int(birth[:4]) if re.match(r'^(19|20)\d{2}-',birth) else None,'country':row.get('COUNTRY') or None,'fetchedAt':datetime.now(timezone.utc).isoformat()}
            return profile if any(profile[k] is not None for k in ['position','birthYear','country']) else None
        except Exception: return None
    selected=needed[:limit];success=[]
    with ThreadPoolExecutor(max_workers=3) as pool:
        for profile in pool.map(collect,selected):
            if profile: success.append(profile)
    for i in range(0,len(success),50):
        chunk=success[i:i+50]
        try:
            r=requests.post(origin.rstrip('/')+'/api/nba/profiles',headers=headers,json={'profiles':chunk},timeout=60,allow_redirects=False);r.raise_for_status()
            r=requests.get(origin.rstrip('/')+'/api/nba/profiles',headers=headers,timeout=45,allow_redirects=False);r.raise_for_status();current={str(p['id']):p for p in r.json()['profiles']}
            if any(current.get(p['id'],{}).get('fetchedAt')!=p['fetchedAt'] or any(current[p['id']].get(k)!=p[k] for k in ['position','birthYear','country'] if p[k] is not None) for p in chunk): raise RuntimeError('La lectura biográfica no coincide.')
        except requests.RequestException: raise RuntimeError('Falló la importación o verificación biográfica.') from None
    print(f'Biografías: {len(success)} importadas y verificadas, {len(needed)-len(selected)} pendientes.',flush=True)
    if len(success)!=len(selected): raise RuntimeError(f'NBA no entregó {len(selected)-len(success)} biografías; datos anteriores conservados.')


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--season',default='auto')
    parser.add_argument('--competition',choices=['all',*SEASON_TYPES],default='all')
    parser.add_argument('--output',default='nba_snapshot.json')
    parser.add_argument('--upload',help='Private Play Metric HTTPS origin; token via environment')
    parser.add_argument('--skip-calendar',action='store_true')
    parser.add_argument('--profile-limit',type=int,default=30)
    parser.add_argument('--profiles-only',action='store_true')
    args=parser.parse_args()
    if args.season != 'auto' and (not re.fullmatch(r'20\d{2}-\d{2}',args.season) or int(args.season[-2:]) != (int(args.season[:4])+1)%100): parser.error('Use auto o YYYY-YY.')
    if args.upload:
        from urllib.parse import urlparse
        origin=urlparse(args.upload)
        if origin.scheme!='https' or not origin.hostname or origin.username or origin.password or origin.path not in ('','/') or origin.query or origin.fragment: parser.error('Use un origen HTTPS sin ruta ni credenciales.')
    failures=[];output=Path(args.output);profile_ids=set()
    if args.profile_limit<1 or args.profile_limit>1000: parser.error('profile-limit debe estar entre 1 y 1000.')
    if args.profiles_only:
        if not args.upload: parser.error('profiles-only requiere upload.')
        import requests
        for competition in SEASON_TYPES:
            r=requests.get(args.upload.rstrip('/')+'/api/props',params={'competition':competition,'format':'compact'},headers={'Authorization':'Bearer '+os.environ.get('PLAY_METRIC_SERVICE_TOKEN','')},timeout=60,allow_redirects=False);r.raise_for_status();profile_ids.update(str(p['id']) for p in r.json()['players'])
        sync_profiles(profile_ids,args.upload,args.profile_limit);return
    for competition in SEASON_TYPES if args.competition=='all' else [args.competition]:
        try:
            snapshot=None
            for season in season_candidates() if args.season=='auto' else [args.season]:
                candidate=fetch_snapshot(season,competition=competition)
                if candidate['players']: snapshot=candidate;break
            if not snapshot:
                print(f'{competition}: sin partidos completos; historial conservado.');continue
            path=output.with_name(output.stem+'_'+competition+output.suffix) if args.competition=='all' else output
            profile_ids.update(str(p['id']) for p in snapshot['players'])
            write_snapshot(snapshot,path)
            print(f"{competition}: {len(snapshot['players'])} jugadores, {snapshot['season']}, último partido {max(g['date'] for p in snapshot['players'] for g in p['games'])}.",flush=True)
            if args.upload: upload(snapshot,args.upload);print(f'{competition}: importación y lectura verificadas.',flush=True)
        except (RuntimeError,ImportError) as e: failures.append(competition+': '+str(e))
    if not args.skip_calendar:
        try:
            season=season_candidates()[0] if args.season=='auto' else args.season
            calendar=fetch_calendar(season);write_snapshot(calendar,output.with_name(output.stem+'_calendar'+output.suffix))
            print(f"Calendario: {len(calendar['games'])} partidos, temporada {season}.",flush=True)
            if args.upload: upload_calendar(calendar,args.upload);print('Calendario: importación y lectura verificadas.',flush=True)
        except (RuntimeError,ImportError) as e: failures.append('calendar: '+str(e))
    if args.upload and profile_ids:
        try: sync_profiles(profile_ids,args.upload,args.profile_limit)
        except (RuntimeError,ImportError) as e: failures.append('profiles: '+str(e))
    if args.upload:
        try:
            import requests,importlib.util,tempfile
            r=requests.get(args.upload.rstrip('/')+'/collector/sync_league_traits.py',headers={'Authorization':'Bearer '+os.environ.get('PLAY_METRIC_SERVICE_TOKEN','')},timeout=45,allow_redirects=False);r.raise_for_status()
            with tempfile.TemporaryDirectory() as tmp:
                path=Path(tmp)/'sync_league_traits.py';path.write_bytes(r.content)
                spec=importlib.util.spec_from_file_location('pm_league_traits',path);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);module.sync_league_traits(args.upload)
        except Exception as e: failures.append('league traits: '+type(e).__name__+'; datos anteriores conservados.')
    if args.upload:
        try:
            # Download the sibling through the same service channel; execute current hosted code.
            import requests,importlib.util,tempfile
            r=requests.get(args.upload.rstrip('/')+'/collector/sync_traits.py',headers={'Authorization':'Bearer '+os.environ.get('PLAY_METRIC_SERVICE_TOKEN','')},timeout=45,allow_redirects=False);r.raise_for_status()
            with tempfile.TemporaryDirectory() as tmp:
                trait_path=Path(tmp)/'sync_traits.py';trait_path.write_bytes(r.content)
                spec=importlib.util.spec_from_file_location('pm_traits',trait_path);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);module.sync_traits(args.upload,3)
        except Exception as e: failures.append('traits: '+type(e).__name__+'; datos anteriores conservados.')
    if failures: raise SystemExit('\n'.join(failures))


if __name__=='__main__': main()
