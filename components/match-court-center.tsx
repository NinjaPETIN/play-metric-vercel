'use client';
import {useEffect,useState} from 'react';
import type {BoxData} from '../lib/live-boxscore';
import type {MatchPreviewData} from '../lib/match-preview';
import CourtPlayback from './court-playback';
import type {CourtSelection,CourtPlay} from '../lib/court-playback';
import Portrait from './match-player-portrait';
import TeamLogo from './team-logo';
import styles from './match-court-center.module.css';
const tabs=[['stats','Estadísticas'],['form','Forma'],['meetings','Cruces'],['roster','Plantel']] as const;
type Tab=typeof tabs[number][0];
export default function MatchCourtCenter({data,onPlayer,selection,onSelect}:{data:BoxData;onPlayer:(id:string)=>void;selection:CourtSelection|null;onSelect:(play:CourtPlay|null)=>void}){
 const [tab,setTab]=useState<Tab>('stats'),[team,setTeam]=useState(data.teams[0].code),[history,setHistory]=useState<MatchPreviewData|null>(null),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0);
 const needsHistory=tab==='form'||tab==='meetings',id=data.game.nbaId,expectedTeams=data.teams.map(t=>t.code).join(':');
 useEffect(()=>{if(!needsHistory||history||!id)return;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);let active=true;
 void fetch('/api/nba/preview/'+id,{credentials:'omit',signal:controller.signal}).then(async r=>{if(!r.ok)throw Error();return r.json() as Promise<MatchPreviewData>;}).then(d=>{if(!Array.isArray(d.teams)||!expectedTeams.split(':').every(code=>d.teams.some(x=>x.team===code)))throw Error();if(active){setHistory(d);setFailed(false);}}).catch(()=>{if(active)setFailed(true);}).finally(()=>clearTimeout(timer));return()=>{active=false;clearTimeout(timer);controller.abort();};
 },[needsHistory,history,id,retry,expectedTeams]);
 const selected=data.teams.find(t=>t.code===team)??data.teams[0];
 const display=(n:number|null)=>n===null?'—':n.toLocaleString('es-AR',{maximumFractionDigits:1});
 const total=(t:BoxData['teams'][number],key:'rebounds'|'assists'|'turnovers')=>{const players=t.players.filter(p=>!p.didNotPlay);return players.length&&players.every(p=>p[key]!==null)?players.reduce((s,p)=>s+p[key]!,0):null;};
 const shooting=(t:BoxData['teams'][number],key:'fieldGoals'|'threes'|'freeThrows')=>{const players=t.players.filter(p=>!p.didNotPlay);if(!players.length||players.some(p=>!p[key]))return null;const pairs=players.map(p=>p[key]!.split('-').map(Number)),made=pairs.reduce((s,p)=>s+p[0],0),attempts=pairs.reduce((s,p)=>s+p[1],0);return {made,attempts,rate:attempts?made/attempts*100:null};};
 return <section className={styles.center} aria-label="Centro de cancha">
 <header className={styles.heading}><span><i className={data.game.state==='live'?styles.live:undefined}/>{data.game.state==='final'?'Final':'En juego'} · {data.game.period<=4?'C'+data.game.period:'TE'+(data.game.period-4)} · {data.game.clock}</span><b>{data.game.away} {data.game.awayScore}–{data.game.homeScore} {data.game.home}</b></header>
 <CourtPlayback data={data} selection={selection} onSelect={onSelect} onPlayer={onPlayer}/>
 <div className={styles.tabs} role="group" aria-label="Paneles de la cancha">{tabs.map(([key,label])=><button type="button" key={key} aria-pressed={tab===key} onClick={()=>setTab(key)}>{label}</button>)}</div>
 <div className={styles.panel}>
 {tab==='stats'&&<><div className={styles.teams}>{data.teams.map(t=><span key={t.code}><TeamLogo team={t.code} size={24}/>{t.code}</span>)}</div>{(['fieldGoals','threes','freeThrows'] as const).map((key,i)=>{const values=data.teams.map(t=>shooting(t,key));return <div className={styles.stat} key={key}><div><b>{values[0]?display(values[0].rate)+(values[0].rate===null?'':'%'):'—'}</b><span>{['Tiros de campo','Triples','Tiros libres'][i]}</span><b>{values[1]?display(values[1].rate)+(values[1].rate===null?'':'%'):'—'}</b></div><div className={styles.meters}>{values.map((v,j)=><meter key={j} min="0" max="100" value={v?.rate??0} aria-label={data.teams[j].code+' '+key}/>)}</div><small>{values.map(v=>v?v.made+'/'+v.attempts:'—').join(' · ')}</small></div>;})}{(['rebounds','assists','turnovers'] as const).map((key,i)=><div className={styles.simple} key={key}><b>{display(total(data.teams[0],key))}</b><span>{['Rebotes','Asistencias','Pérdidas'][i]}</span><b>{display(total(data.teams[1],key))}</b></div>)}</>}
 {needsHistory&&!history&&(failed?<p role="status">No pudimos cargar el historial. <button type="button" onClick={()=>{setFailed(false);setRetry(n=>n+1);}}>Reintentar</button></p>:<p role="status">Consultando el historial…</p>)}
 {tab==='form'&&history&&<><p className={styles.note}>Últimos partidos terminados antes de este encuentro.</p><div className={styles.form}>{history.teams.map(t=><article key={t.team}><h4><TeamLogo team={t.team} size={24}/>{t.team}</h4>{t.recent.length?t.recent.slice().reverse().map(g=><a key={g.id} href={'/partidos/'+g.id}><b className={g.result==='V'?styles.win:styles.loss}>{g.result}</b><span>{g.opponent}</span><strong>{g.score}–{g.against}</strong></a>):<p>Sin resultados anteriores.</p>}<small>Promedio anotado: {display(t.points)} · {t.n} PJ</small></article>)}</div></>}
 {tab==='meetings'&&history&&<><p className={styles.note}>Enfrentamientos anteriores de esta temporada.</p>{history.meetings.length?history.meetings.map(g=><a className={styles.meeting} href={'/partidos/'+g.id} key={g.id}><small>{g.date}</small><span>{g.away} <b>{g.awayScore}–{g.homeScore}</b> {g.home}</span></a>):<p>Sin enfrentamientos previos disponibles.</p>}</>}
 {tab==='roster'&&<><div className={styles.tabs} role="group" aria-label="Plantel del equipo">{data.teams.map(t=><button type="button" aria-pressed={team===t.code} key={t.code} onClick={()=>setTeam(t.code)}><TeamLogo team={t.code} size={20}/>{t.code}</button>)}</div><div className={styles.roster}>{selected.players.map(p=><button type="button" onClick={()=>onPlayer(p.id)} key={p.id}><Portrait person={p}/><span><strong>{p.name}</strong><small>{p.didNotPlay?'Sin participación':`${p.points??'—'} PTS · ${p.rebounds??'—'} REB · ${p.assists??'—'} AST`}{data.game.state==='live'&&p.onCourt===true?' · En cancha':''}</small></span><span aria-hidden="true">↗</span></button>)}</div></>}
 </div></section>;
}
