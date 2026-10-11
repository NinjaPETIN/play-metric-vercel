'use client';
import {useMemo} from 'react';
import type {Player} from '../lib/data';
import type {TeamGame} from '../lib/nba-snapshot';
import type {ScheduledGame} from './calendar-panel';
import TeamBoxScore from './team-box-score';
import TeamLogo from './team-logo';
import {teamBoxScore} from '../lib/team-box-score';
import {OpponentContext} from './analysis-tools';
export default function MatchDetails({match,players,games,resultAllowed=true}:{match:ScheduledGame;players:Player[];games:TeamGame[];resultAllowed?:boolean}){
 const result=resultAllowed?games.find(g=>g.id===match.id):undefined;
 const leaders=useMemo(()=>result?[...teamBoxScore(players,result,result.away).rows,...teamBoxScore(players,result,result.home).rows].sort((a,b)=>b.g.points-a.g.points).slice(0,3):[],[players,result]);
 return <section className="match-details"><h2>Resumen del partido</h2>{result?<><div className="match-stars">{leaders.map(({id,name,g})=><article className="card" key={id}><img src={`https://cdn.nba.com/headshots/nba/latest/260x190/${id}.png`} srcSet={`https://cdn.nba.com/headshots/nba/latest/260x190/${id}.png 260w, https://cdn.nba.com/headshots/nba/latest/1040x760/${id}.png 1040w`} sizes="(min-width: 1180px) 180px, 140px" decoding="async" alt="" loading="lazy"/><b className="match-star-name"><TeamLogo team={g.team??'—'} size={24}/>{name}</b><span>{g.points} PTS · {g.rebounds} REB · {g.assists} AST</span></article>)}</div><TeamBoxScore key={result.id} game={result} team="all" players={players}/></>:<p className="card">{match.status===3?'Las estadísticas individuales de este partido todavía no están disponibles en el historial seleccionado.':'Las estadísticas de este partido se mostrarán cuando la NBA publique el resultado y el historial.'}</p>}<div className="match-boxes">{[match.away,match.home].map(t=><div key={t}><OpponentContext team={t} players={players} games={games}/><section className="card"><h3 className="team-label"><TeamLogo team={t}/>Últimos resultados de {t}</h3><div className="recent-match-list">{games.filter(g=>g.home===t||g.away===t).sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id)).slice(0,5).map(g=><div key={g.id}><small>{g.date}</small><span>{g.away} <b>{g.awayScore}–{g.homeScore}</b> {g.home}</span></div>)}</div></section></div>)}</div></section>;
}
