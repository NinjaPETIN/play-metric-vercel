"""All-player NBA tracking, independent sources, verified imports, daily refresh."""
import os,json
from datetime import datetime,timezone
import requests
TYPES={'regular':'Regular Season','preseason':'Pre Season','playoffs':'Playoffs'}

def integer(v):
    n=float(v)
    if n<0 or not n.is_integer():raise ValueError('Invalid count')
    return int(n)

def parse(raw,source):
    sets=raw['resultSets'];result={}
    if source=='zones':
        data=sets if isinstance(sets,dict) else sets[0]
        categories=data['headers'][0]['columnNames'];skip=data['headers'][0]['columnsToSkip'];span=data['headers'][0]['columnSpan']
        mapping={'Restricted Area':('rim','Cerca del aro'),'In The Paint (Non-RA)':('paint','Pintura'),'Mid-Range':('mid','Media distancia'),'Left Corner 3':('corner','Triple de esquina'),'Right Corner 3':('corner','Triple de esquina'),'Above the Break 3':('arc','Triple frontal')}
        for row in data['rowSet']:
            pid=str(integer(row[0]));zones={}
            for i,category in enumerate(categories):
                if category not in mapping:continue
                k,label=mapping[category];made=integer(row[skip+i*span] or 0);attempts=integer(row[skip+i*span+1] or 0)
                if made>attempts:raise ValueError('Invalid shot count')
                z=zones.setdefault(k,dict(key=k,label=label,attempts=0,made=0));z['attempts']+=attempts;z['made']+=made
            if sum(z['attempts'] for z in zones.values()):
                if pid in result:raise ValueError('Duplicate player')
                result[pid]={'zones':list(zones.values())}
    else:
        data=sets[0] if isinstance(sets,list) else sets
        for row in data['rowSet']:
            r=dict(zip(data['headers'],row));pid=str(integer(r['PLAYER_ID' if source=='passes' else 'CLOSE_DEF_PERSON_ID']))
            if source=='passes':d=dict(games=integer(r['GP']),passes=integer(r['PASSES_MADE']),assists=integer(r['AST']))
            else:
                d=dict(games=integer(r['GP']),attempts=integer(r['D_FGA']),made=integer(r['D_FGM']),normalPct=float(r['NORMAL_FG_PCT']))
                if d['made']>d['attempts'] or not 0<=d['normalPct']<=1:raise ValueError('Invalid defense')
            if d['games'] and d.get('passes',d.get('attempts',0)):
                if pid in result:raise ValueError('Duplicate player')
                result[pid]=d
    if not result:raise ValueError('No published tracking')
    return result

def collect(season,competition,source):
    from nba_api.stats.endpoints import leaguedashplayershotlocations,leaguedashptstats,leaguedashptdefend
    opts=dict(season=f'{season}-{str(season+1)[-2:]}',season_type_all_star=TYPES[competition],timeout=25)
    if source=='zones':endpoint=leaguedashplayershotlocations.LeagueDashPlayerShotLocations(per_mode_detailed='Totals',**opts)
    elif source=='passes':endpoint=leaguedashptstats.LeagueDashPtStats(player_or_team='Player',pt_measure_type='Passing',per_mode_simple='Totals',**opts)
    else:endpoint=leaguedashptdefend.LeagueDashPtDefend(defense_category='Overall',per_mode_simple='Totals',**opts)
    return parse(endpoint.get_dict(),source)

def sync_league_traits(origin,force=False):
    headers={'Authorization':'Bearer '+os.environ['PLAY_METRIC_SERVICE_TOKEN']};origin=origin.rstrip('/');failures=[]
    for competition in TYPES:
        catalog=requests.get(origin+'/api/props',params={'competition':competition,'format':'compact'},headers=headers,timeout=60,allow_redirects=False);catalog.raise_for_status();catalog=catalog.json();season=int(catalog['season']);ids={str(p['id']) for p in catalog['players']};params=dict(season=season,competition=competition)
        r=requests.get(origin+'/api/nba/traits/bulk',params=params,headers=headers,timeout=60,allow_redirects=False);r.raise_for_status();known={p['playerId']:p for p in r.json()['players']}
        for source in ['zones','passes','defense']:
            fresh=sum(1 for p in known.values() if p.get('sources',{}).get(source) and (datetime.now(timezone.utc)-datetime.fromisoformat(p['sources'][source]['fetchedAt'].replace('Z','+00:00'))).total_seconds()<86400)
            if not force and fresh>=max(1,int(len(ids)*.9)):continue
            try:data=collect(season,competition,source);data={pid:d for pid,d in data.items() if pid in ids}
            except Exception:
                print(f'{competition}/{source}: NBA sin tracking disponible; datos anteriores conservados.',flush=True);continue
            if not data:continue
            fetched=datetime.now(timezone.utc).isoformat();items=[dict(playerId=pid,data=d) for pid,d in data.items()]
            try:
                for i in range(0,len(items),50):
                    r=requests.post(origin+'/api/nba/traits/bulk',headers=headers,json=dict(**params,source=source,fetchedAt=fetched,players=items[i:i+50]),timeout=60,allow_redirects=False);r.raise_for_status()
                r=requests.get(origin+'/api/nba/traits/bulk',params=params,headers=headers,timeout=60,allow_redirects=False);r.raise_for_status();saved={p['playerId']:p for p in r.json()['players']}
                if any(saved.get(pid,{}).get('sources',{}).get(source)!={'fetchedAt':fetched,'data':d} for pid,d in data.items()):raise RuntimeError('Readback mismatch')
                known=saved;print(f'{competition}/{source}: {len(data)} jugadores importados y verificados.',flush=True)
            except Exception:failures.append(f'{competition}/{source}: falló la importación o verificación')
    if failures:raise RuntimeError('; '.join(failures))
