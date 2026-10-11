"""Bounded, independent advanced NBA imports. No source failure overwrites saved data."""
import os,json,argparse
from datetime import datetime,timezone
from collections import defaultdict
import requests
TYPES={'regular':'Regular Season','preseason':'Pre Season','playoffs':'Playoffs'}

def collect(job,source):
    from nba_api.stats.endpoints import shotchartdetail,playerdashptshots,playerdashptpass,playerdashptshotdefend
    pid=job['playerId'];season=f"{job['season']}-{str(job['season']+1)[-2:]}"
    opts=dict(player_id=pid,team_id=0,season_type_all_star=TYPES[job['competition']],timeout=15)
    classes={'zones':shotchartdetail.ShotChartDetail,'shots':playerdashptshots.PlayerDashPtShots,'passes':playerdashptpass.PlayerDashPtPass,'defense':playerdashptshotdefend.PlayerDashPtShotDefend}
    opts['season_nullable' if source=='zones' else 'season']=season
    if source=='zones':opts['context_measure_simple']='FGA'
    sets=classes[source](**opts).get_normalized_dict()
    if source=='zones':
        rows=sets.get('Shot_Chart_Detail',[]);z=defaultdict(lambda:{'attempts':0,'made':0})
        mapping={'Restricted Area':('rim','Cerca del aro'),'In The Paint (Non-RA)':('paint','Pintura'),'Mid-Range':('mid','Media distancia'),'Left Corner 3':('corner','Triple de esquina'),'Right Corner 3':('corner','Triple de esquina'),'Above the Break 3':('arc','Triple frontal')}
        for r in rows:
            if str(r['PLAYER_ID'])!=pid:raise ValueError('Jugador incorrecto')
            if not r['SHOT_ATTEMPTED_FLAG'] or r['SHOT_ZONE_BASIC'] not in mapping:continue
            k,label=mapping[r['SHOT_ZONE_BASIC']];z[k]['label']=label;z[k]['attempts']+=1;z[k]['made']+=int(r['SHOT_MADE_FLAG'])
        if not z:raise ValueError('Sin intentos publicados')
        return {'zones':[dict(key=k,**v) for k,v in z.items()]}
    if source=='shots':
        rows=sets.get('DribbleShooting',[]);overall=sets.get('Overall',[])
        if not overall or any(str(r['PLAYER_ID'])!=pid for r in rows+overall):raise ValueError('Sin tracking válido')
        dribble=[r for r in rows if str(r['DRIBBLE_RANGE'])!='0 Dribbles'];catch=[r for r in sets.get('GeneralShooting',[]) if r['SHOT_TYPE']=='Catch and Shoot']
        return dict(totalAttempts=int(overall[0]['FGA']),dribbleAttempts=int(sum(r['FGA'] for r in dribble)),dribbleMade=int(sum(r['FGM'] for r in dribble)),catchAttempts=int(sum(r['FGA'] for r in catch)),catchMade=int(sum(r['FGM'] for r in catch)))
    if source=='passes':
        rows=sets.get('PassesMade',[])
        if not rows or any(str(r['PLAYER_ID'])!=pid for r in rows):raise ValueError('Sin pases publicados')
        return dict(games=int(max(r['G'] for r in rows)),passes=int(sum(r['PASS'] for r in rows)),assists=int(sum(r['AST'] for r in rows)))
    rows=[r for r in sets.get('DefendingShots',[]) if r['DEFENSE_CATEGORY']=='Overall']
    if not rows or any(str(r.get('CLOSE_DEF_PERSON_ID',r.get('MATCHUPID')))!=pid for r in rows):raise ValueError('Sin defensa publicada')
    r=rows[0];return dict(games=int(r['GP']),attempts=int(r['D_FGA']),made=int(r['D_FGM']),normalPct=r['NORMAL_FG_PCT'])

def sync_traits(origin,limit=3):
    token=os.environ.get('PLAY_METRIC_SERVICE_TOKEN')
    if not token:raise RuntimeError('Falta acceso de servicio')
    h={'Authorization':'Bearer '+token,'Cache-Control':'no-cache'}
    r=requests.get(origin.rstrip('/')+'/api/nba/traits',headers=h,timeout=45,allow_redirects=False);r.raise_for_status()
    jobs=r.json()['jobs'];now=datetime.now(timezone.utc)
    def stale(v):return not v or (now-datetime.fromisoformat(v['fetchedAt'].replace('Z','+00:00'))).total_seconds()>86400
    jobs=[j for j in jobs if any(stale(j.get('sources',{}).get(s)) for s in ['zones','shots','passes','defense'])]
    jobs.sort(key=lambda j:j.get('requestedAt',''))
    imported=0;failed=0
    for job in jobs[:limit]:
        for source in ['zones','shots','passes','defense']:
            if not stale(job.get('sources',{}).get(source)):continue
            try:data=collect(job,source)
            except Exception:
                failed+=1;print(f"Perfil {job['playerId']} {source}: fuente no disponible; dato anterior conservado.",flush=True);continue
            body={k:job[k] for k in ['playerId','season','competition']};body.update(source=source,fetchedAt=datetime.now(timezone.utc).isoformat(),data=data)
            r=requests.post(origin.rstrip('/')+'/api/nba/traits',headers=h,json=body,timeout=45,allow_redirects=False);r.raise_for_status()
            r=requests.get(origin.rstrip('/')+f"/api/v1/players/{job['playerId']}/traits",params={'season':job['season'],'competition':job['competition']},headers=h,timeout=45,allow_redirects=False);r.raise_for_status();stored=r.json()['sources'].get(source)
            if not stored or stored['fetchedAt']!=body['fetchedAt'] or stored['data']!=data:raise RuntimeError('La lectura avanzada no coincide')
            imported+=1;print(f"Perfil {job['playerId']} {source}: importación y lectura verificadas.",flush=True)
    print(f'Perfiles avanzados: {imported} fuentes verificadas, {failed} fuentes no disponibles, {max(0,len(jobs)-limit)} jugadores pendientes.',flush=True)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--upload',required=True);p.add_argument('--limit',type=int,default=3);a=p.parse_args()
    from urllib.parse import urlparse
    u=urlparse(a.upload)
    if u.scheme!='https' or not u.hostname or u.username or u.password or u.path not in ('','/') or u.query or u.fragment or not 1<=a.limit<=20:p.error('Origen HTTPS o límite no válido')
    sync_traits(a.upload,a.limit)
