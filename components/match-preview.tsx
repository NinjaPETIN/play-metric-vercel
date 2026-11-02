'use client';
import {useEffect,useState} from 'react';
import {loadCachedData} from '../lib/client-data-cache';
import {matchContext} from '../lib/calendar-context';
import type {Calendar} from '../lib/nba-snapshot';
import type {ScheduledGame} from './calendar-panel';
import TeamLogo from './team-logo';
export default function MatchPreview({match,onHistorical,onPlayers}:{match:ScheduledGame;onHistorical?:()=>void;onPlayers?:()=>void}){
 const [calendar,setCalendar]=useState<Calendar|null>(null),[failed,setFailed]=useState(false);
 useEffect(()=>{let active=true;loadCachedData<Calendar>('/api/nba/calendar').then(data=>{if(active)setCalendar(data);}).catch(()=>{if(active)setFailed(true);});return()=>{active=false;};},[]);
 const context=calendar?matchContext(calendar.games,match):null;
 return <section className="card match-preview"><h2>Previa del encuentro</h2><p>{match.awayName} vs. {match.homeName}</p>{context?<><div className="match-preview-grid">{context.teams.map(t=><article key={t.team}><TeamLogo team={t.team} size={60}/><h3>{t.team}</h3><h4>Últimos 5 partidos</h4><div className="calendar-form"><span>{t.form.length?t.form.map((r,i)=><i key={i} className={r==='V'?'win':'loss'}>{r}</i>):'Sin registros'}</span></div><h4>Descanso previo</h4><p>{t.restDays===null?'Sin registros':t.restDays+' '+(t.restDays===1?'día':'días')}</p></article>)}</div><h3>Cruces de esta temporada</h3><p>{context.meetings?match.away+' '+context.awayWins+' — '+context.homeWins+' '+match.home:'Sin cruces registrados.'}</p><small>Resultados importados de esta competición, anteriores al encuentro.</small></>:<p role="status">{failed?'Previa no disponible por el momento.':'Cargando previa…'}</p>}<div className="match-preview-actions">{onHistorical&&<button className="button subtle" onClick={onHistorical}>Ver historial</button>}{onPlayers&&<button className="button subtle" onClick={onPlayers}>Ver jugadores</button>}</div></section>;
}
