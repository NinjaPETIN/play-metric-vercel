'use client';
import {useMemo} from 'react';
import type {Game} from '../lib/analytics';
import {analyze} from '../lib/analytics';
import TeamLogo from './team-logo';
export default function RivalSummary({games,opponent}:{games:Game[];opponent:string}){
 const summary=useMemo(()=>({points:analyze(games,'points',0),rebounds:analyze(games,'rebounds',0),assists:analyze(games,'assists',0),threes:analyze(games,'threes',0)}),[games]);
 const number=(v:number|null)=>v===null?'—':v.toLocaleString('es-AR',{maximumFractionDigits:1});
 return <section className="card rival-summary"><h3 className="team-label"><TeamLogo team={opponent} size={28}/>Rendimiento contra {opponent}</h3><p className="muted">{games.length} partidos con participación · mismos filtros de localía y minutos · historial completo seleccionado, sin límite L5/L10.</p><div className="stats-grid">{(['points','rebounds','assists','threes'] as const).map((m,i)=><div key={m}><small>{['Puntos','Rebotes','Asistencias','Triples'][i]} promedio</small><strong>{number(summary[m].average)}</strong><small>{summary[m].n} partidos con dato</small></div>)}</div><p className="muted">{games.length?`Último enfrentamiento: ${new Date(games[0].date+'T12:00:00Z').toLocaleDateString('es-AR')}.`:'No hay enfrentamientos disponibles con estos filtros.'}</p></section>;
}
