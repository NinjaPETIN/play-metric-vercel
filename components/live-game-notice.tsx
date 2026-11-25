'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {Radio,X} from 'lucide-react';
import type {LiveFeed} from '../lib/live-scores';
import {freshLiveNoticeFeed,nextLiveNotice,readLiveNoticeSeen,type LiveNoticeTracker} from '../lib/live-notice';
const storageKey='statlane:live-notices:v1';
let memorySeen:string[]=[];
export default function LiveGameNotice({feed,now,failed}:{feed:LiveFeed|null;now:number;failed:boolean}){
 const tracker=useRef<LiveNoticeTracker>({seen:[],previous:{}}),initialized=useRef(false);
 const [notice,setNotice]=useState<{ids:string[];started:boolean}|null>(null);
 useEffect(()=>{
  if(!initialized.current){let saved:string[]=[];try{saved=readLiveNoticeSeen(sessionStorage.getItem(storageKey));}catch{}tracker.current.seen=[...new Set([...saved,...memorySeen])].slice(-64);initialized.current=true;}
  const next=nextLiveNotice(tracker.current,feed,now,failed);
  if(!next.games.length){tracker.current=next.tracker;return;}
  let active=true;queueMicrotask(()=>{if(!active)return;tracker.current=next.tracker;memorySeen=next.tracker.seen;try{sessionStorage.setItem(storageKey,JSON.stringify(memorySeen));}catch{}setNotice({ids:next.games.map(game=>game.nbaId!),started:next.started});});
  return()=>{active=false;};
 },[feed,now,failed]);
 if(!notice||!freshLiveNoticeFeed(feed,now,failed))return null;
 const games=feed.games.filter(game=>game.state==='live'&&notice.ids.includes(game.nbaId??''));
 if(!games.length)return null;
 return <aside className="live-game-notice" aria-label="Aviso de partidos en vivo"><div className="live-notice-heading"><Radio size={20} aria-hidden="true"/><p role="status">{notice.started?(games.length===1?'Comenzó el partido':'Comenzaron los partidos'):'NBA en vivo'}</p><button type="button" onClick={()=>setNotice(null)} aria-label="Cerrar aviso de partidos en vivo"><X size={18}/></button></div><div className="live-notice-games">{games.slice(0,2).map(game=><Link key={game.nbaId} href={'/partidos/'+game.nbaId+'?matchTab=live'} aria-label={'Seguir en vivo '+game.awayName+' contra '+game.homeName}><span><i aria-hidden="true"/>EN VIVO · {game.away} vs. {game.home}</span><strong>{game.awayScore??'—'} – {game.homeScore??'—'}</strong><small>{game.detail} · Ver partido →</small></Link>)}</div>{games.length>2&&<Link className="live-notice-more" href="/?view=calendar">Ver jornada · {games.length} partidos en vivo →</Link>}</aside>;
}
