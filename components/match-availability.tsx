'use client';

import {useEffect,useState} from 'react';
import {injuryReportUrl,type MatchAvailability as Availability} from '../lib/match-availability';
import type {Competition} from '../lib/competitions';
import TeammateComparison from './teammate-comparison';
import TeamLogo from './team-logo';
import PositionDefenseView from './position-defense';
import {identityName} from '../lib/player-name';
import type {OfficialReport} from '../lib/nba-official-report';

const timestamp = new Intl.DateTimeFormat('es-AR',{
  timeZone:'America/Argentina/Buenos_Aires',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:false,
});

export default function MatchAvailability({id,away,home,date,season,competition,leaders}:{
  id:string; away:string; home:string; date:string; season?:number; competition:Competition;
  leaders?:Record<string,{id:string;name:string}|undefined>;
}) {
  const [feed,setFeed] = useState<(Availability&{officialReport?:OfficialReport|null})|null|undefined>();
  const [failed,setFailed] = useState(false);
  const [selected,setSelected] = useState<{code:string;name:string}|null>(null);
  useEffect(()=>{
    let active=true;
    let request:AbortController|undefined;
    async function refresh(){
      if (document.hidden||request) return;
      const controller=new AbortController();
      request=controller;
      try {
        const response=await fetch('/api/nba/availability/'+id,{signal:controller.signal});
        if (!response.ok) throw Error();
        const payload:{data:(Availability&{officialReport?:OfficialReport|null})|null}=await response.json();
        if (active) {setFeed(payload.data);setFailed(false);}
      } catch {if(active)setFailed(true);}
      finally {request=undefined;}
    }
    void refresh();
    const timer=setInterval(refresh,60_000);
    document.addEventListener('visibilitychange',refresh);
    return ()=>{active=false;request?.abort();clearInterval(timer);document.removeEventListener('visibilitychange',refresh);};
  },[id]);
  return <section className="card sl-match-availability" aria-labelledby="sl-match-availability">
    <div className="sl-explorer-heading">
      <h2 id="sl-match-availability">Bajas y alineaciones</h2>
      <a href={feed?.officialReport?.url??injuryReportUrl(date)} target="_blank" rel="noopener noreferrer">Informe oficial NBA{feed?.officialReport?' · '+feed.officialReport.clock:''} ↗</a>
    </div>
    {!feed&&<p role="status">{failed?'No pudimos cargar la disponibilidad.':feed===undefined?'Consultando los equipos…':'Sin datos de disponibilidad para este partido.'}</p>}
    <div className="sl-match-availability-grid">
      {[away,home].map(code=>{
        const team=feed?.teams.find(entry=>entry.code===code);
        const leader=leaders?.[code];
        const injury=leader&&team?.injuries?.find(row=>identityName(row.name)===identityName(leader.name));
        return <article key={code} className="availability-team">
          <h3><TeamLogo team={code} size={26}/>{code}</h3>
          {leader&&<p><strong>{leader.name}</strong> · {injury?.status??'Sin estado individual publicado'}{injury&&<> · {timestamp.format(new Date(injury.reportedAt))} ARG</>}</p>}
          <h4>Disponibilidad</h4>
          {team?.injuries?.length ? <ul>{team.injuries.map(entry=><li key={entry.id}>
            {season ? <button type="button" className="match-play-player" aria-expanded={selected?.code===code&&selected.name===entry.name}
            onClick={()=>setSelected(old=>old?.code===code&&old.name===entry.name?null:{code,name:entry.name})}>{entry.name}</button> : <strong>{entry.name}</strong>}<span className="availability-status" data-state={entry.status==='Fuera'?'out':entry.status==='Disponible'?'available':'questionable'}>{entry.status}</span>
            <time dateTime={entry.reportedAt}>{timestamp.format(new Date(entry.reportedAt))} ARG</time>
          </li>)}</ul> : <p>{team?.injuries ? 'Sin novedades en ESPN.' : 'Sin reporte para este equipo.'}</p>}
          <h4>Titulares</h4>
          {team?.starters ? <ul className="sl-match-starters">{team.starters.map(name=><li key={name}>{season?<button type="button" className="match-play-player" aria-expanded={selected?.code===code&&selected.name===name} onClick={()=>setSelected(old=>old?.code===code&&old.name===name?null:{code,name})}>{name}</button>:name}</li>)}</ul> :
            <p>Alineación pendiente de confirmación.</p>}
          {season&&<PositionDefenseView opponent={code===away?home:away} season={season} competition={competition} before={date}/>}
        </article>;
      })}
    </div>
    {selected&&season&&<TeammateComparison key={selected.code+':'+selected.name} team={selected.code} season={season} competition={competition} teammateName={selected.name}
      playerId={leaders?.[selected.code]&&identityName(leaders[selected.code]!.name)!==identityName(selected.name)?leaders[selected.code]!.id:undefined} before={date}/>}
  </section>;
}
