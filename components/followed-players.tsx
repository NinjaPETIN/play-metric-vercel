'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import type {Player} from '../lib/data';
import type {Calendar} from '../lib/nba-snapshot';
import {useLiveScores} from '../lib/use-live-scores';
import {loadCachedData} from '../lib/client-data-cache';
import {boxFeedSchema,type BoxFeed} from '../lib/live-boxscore';
import {LIVE_POLL_MS} from '../lib/live-refresh';
import {useWatchlist,FollowButton} from './watchlist-provider';
import Portrait from './match-player-portrait';
import LiveFollowing from './live-following';
export default function FollowedPlayers({catalog}:{catalog:Player[]}){
 const {watch}=useWatchlist(),[expanded,setExpanded]=useState(false);
 if(!watch.players.length)return null;
 return <details className="card sl-inline-following" onToggle={e=>setExpanded(e.currentTarget.open)}><summary>Tus jugadores <span>{watch.players.length}</span></summary>{expanded&&<FollowedContent catalog={catalog}/>}</details>;
}
function FollowedContent({catalog}:{catalog:Player[]}){
 const {watch,error}=useWatchlist(),live=useLiveScores(),[boxes,setBoxes]=useState<Record<string,BoxFeed>>({}),[calendar,setCalendar]=useState<Calendar|null>(null),[gameFilter,setGameFilter]=useState('all');
 const age=live.feed?.fetchedAt?live.now-Date.parse(live.feed.fetchedAt):Infinity,games=age>=-5000&&age<300000?live.feed?.games??[]:[];
 useEffect(()=>{let active=true;loadCachedData<Calendar>('/api/nba/calendar').then(d=>{if(active)setCalendar(d);}).catch(()=>{});return()=>{active=false;};},[]);
 const playerTeams=catalog.filter(p=>watch.players.includes('nba:'+p.id)).flatMap(p=>{const team=p.currentTeam===undefined?p.team:p.currentTeam;return team?[team]:[];}),teams=[...new Set([...watch.teams,...playerTeams])],hasUnknown=watch.players.some(k=>k.startsWith('espn:')||!catalog.some(p=>'nba:'+p.id===k&&p.currentTeam!==null));
 const wanted=games.filter(g=>g.nbaId&&['live','final'].includes(g.state)&&(hasUnknown||teams.includes(g.home)||teams.includes(g.away))).map(g=>g.nbaId!).sort().join(',');
 useEffect(()=>{if(!wanted)return;let active=true,busy=false;const controller=new AbortController(),last=new Map<string,number>();
  async function update(){if(document.visibilityState==='hidden'||busy)return;busy=true;const queue=wanted.split(',');await Promise.all(Array.from({length:Math.min(3,queue.length)},async()=>{while(queue.length&&active){const id=queue.shift()!;if(Date.now()-(last.get(id)??0)<4500)continue;try{const r=await fetch('/api/nba/live/'+id,{cache:'no-store',credentials:'omit',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(20000)])});if(!r.ok)continue;const next=boxFeedSchema.parse(await r.json());if(next.data?.game.nbaId!==id)continue;if(active){last.set(id,Date.now());setBoxes(prev=>({...Object.fromEntries(Object.entries(prev).filter(([key])=>wanted.split(',').includes(key))),[id]:next}));}}catch{}}}));busy=false;}
  const first=setTimeout(()=>void update(),0),timer=setInterval(()=>void update(),LIVE_POLL_MS),resume=()=>{if(document.visibilityState==='visible')void update();};document.addEventListener('visibilitychange',resume);return()=>{active=false;controller.abort();clearTimeout(first);clearInterval(timer);document.removeEventListener('visibilitychange',resume);};
 },[wanted]);
 const boxData=Object.entries(boxes).filter(([id,b])=>wanted.split(',').includes(id)&&b.data&&b.fetchedAt&&live.now-Date.parse(b.fetchedAt)<300000&&live.now-Date.parse(b.fetchedAt)>=-5000).map(([,b])=>b.data!);

 return <div>{error&&<p role="status">{error}</p>}<div className="sl-inline-saved">{watch.players.map(key=>{const p=catalog.find(p=>'nba:'+p.id===key);return <div key={key}>{p&&<Portrait person={p}/>}<span>{p?<Link href={'/jugadores/'+p.id}>{p.name}</Link>:'Jugador guardado'}<small>{p?(p.currentTeam===null?'Sin confirmar':p.currentTeam??p.team):'Disponible en su partido'}</small></span><FollowButton item={key} name={p?.name??'jugador'}/></div>;})}</div>{boxData.length>1&&<label>Partido <select aria-label="Filtrar seguimiento por partido" value={gameFilter} onChange={e=>setGameFilter(e.target.value)}><option value="all">Todos mis partidos</option>{boxData.map(d=><option key={d.game.id} value={d.game.id}>{d.game.away} - {d.game.home}</option>)}</select></label>}<LiveFollowing games={boxData.filter(d=>gameFilter==='all'||gameFilter===d.game.id)} allowAdd={false} identities={catalog} freshFor={Object.fromEntries(Object.entries(boxes).map(([id,b])=>[id,b.status==='ready'&&!!b.fetchedAt&&live.now-Date.parse(b.fetchedAt)<90000]))} competitions={Object.fromEntries((calendar?.games??[]).map(g=>[g.id,g.competition]))}/></div>;
}
