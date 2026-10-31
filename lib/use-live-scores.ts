'use client';
import {useEffect,useState} from 'react';
import {LIVE_POLL_MS} from './live-refresh';
import {liveFeedSchema,type LiveFeed} from './live-scores';
export function useLiveScores(){
 const [feed,setFeed]=useState<LiveFeed|null>(null),[failed,setFailed]=useState(false),[now,setNow]=useState(0);
 useEffect(()=>{
  let active=true,busy=false;let controller:AbortController|undefined;
  async function update(){
   if(document.visibilityState==='hidden'||busy)return;busy=true;controller=new AbortController();const timeout=setTimeout(()=>controller?.abort(),25000);setNow(Date.now());
   try{const r=await fetch('/api/nba/live',{cache:'no-store',credentials:'omit',signal:controller.signal});if(!r.ok)throw Error('HTTP '+r.status);const next=liveFeedSchema.parse(await r.json());if(active){setFeed(next);setFailed(next.status==='unavailable');setNow(Date.now());}}
   catch(error){if(active){console.warn('Marcador temporalmente no disponible:',error instanceof Error?error.name:'Error');setFailed(true);setNow(Date.now());}}
   finally{clearTimeout(timeout);busy=false;}
  }
  const initial=setTimeout(()=>void update(),0),timer=setInterval(()=>void update(),LIVE_POLL_MS);
  const resume=()=>{if(document.visibilityState==='visible')void update();};document.addEventListener('visibilitychange',resume);
  return()=>{active=false;controller?.abort();clearTimeout(initial);clearInterval(timer);document.removeEventListener('visibilitychange',resume);};
 },[]);
 return {feed,failed,now};
}
