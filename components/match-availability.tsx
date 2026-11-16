'use client';

import {useEffect,useState} from 'react';
import {injuryReportUrl,type MatchAvailability as Availability} from '../lib/match-availability';
import type {Competition} from '../lib/competitions';
import TeammateComparison from './teammate-comparison';
import TeamLogo from './team-logo';

const timestamp = new Intl.DateTimeFormat('es-AR',{
  timeZone:'America/Argentina/Buenos_Aires',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:false,
});

export default function MatchAvailability({id,away,home,date,season,competition}:{
  id:string; away:string; home:string; date:string; season?:number; competition:Competition;
}) {
  const [feed,setFeed] = useState<Availability|null|undefined>();
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
        const payload:{data:Availability|null}=await response.json();
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
      <a href={injuryReportUrl(date)} target="_blank" rel="noopener noreferrer">Informe oficial NBA ↗</a>
    </div>
    {feed&&<p>ESPN · Lectura del {timestamp.format(new Date(feed.fetchedAt))} ARG{(feed.dataStale||failed)&&' · Datos sin actualizar'}</p>}
    {!feed&&<p role="status">{failed?'La fuente no está disponible en este momento.':feed===undefined?'Consultando los equipos…':'Sin datos de disponibilidad para este partido.'}</p>}
    <div className="sl-match-availability-grid">
      {[away,home].map(code=>{
        const team=feed?.teams.find(entry=>entry.code===code);
        return <article key={code}>
          <h3><TeamLogo team={code} size={26}/>{code}</h3>
          <h4>Disponibilidad</h4>
          {team?.injuries?.length ? <ul>{team.injuries.map(entry=><li key={entry.id}>
            {season ? <button type="button" className="match-play-player" aria-expanded={selected?.code===code&&selected.name===entry.name}
              onClick={()=>setSelected(old=>old?.code===code&&old.name===entry.name?null:{code,name:entry.name})}>{entry.name}</button> : <strong>{entry.name}</strong>}<span>{entry.status}</span>
            <time dateTime={entry.reportedAt}>{timestamp.format(new Date(entry.reportedAt))} ARG</time>
          </li>)}</ul> : <p>{team?.injuries ? 'Sin novedades en ESPN.' : 'Sin reporte para este equipo.'}</p>}
          <h4>Titulares</h4>
          {team?.starters ? <ul className="sl-match-starters">{team.starters.map(name=><li key={name}>{season?<button type="button" className="match-play-player" aria-expanded={selected?.code===code&&selected.name===name} onClick={()=>setSelected(old=>old?.code===code&&old.name===name?null:{code,name})}>{name}</button>:name}</li>)}</ul> :
            <p>Alineación pendiente de confirmación.</p>}
        </article>;
      })}
    </div>
    {selected&&season&&<TeammateComparison key={selected.code+':'+selected.name} team={selected.code} season={season} competition={competition} teammateName={selected.name} before={date}/>}
  </section>;
}
