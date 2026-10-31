'use client';
import {useEffect,useState} from 'react';
import {liveFeedSchema,type LiveFeed} from './live-scores';
export function useLiveScores(){
 const [feed,setFeed]=useState<LiveFeed|null>(null),[failed,setFailed]=useState(false),[now,setNow]=useState(0);
 useEffect(()=>{
  let active=true,busy=false;let controller:AbortController|undefined;
  async function update(){
   if(document.visibilityState==='hidden'||busy)return;busy=true;controller=new AbortController();const timeout=setTimeout(()=>controller?.abort(),12000);setNow(Date.now());
   try{const r=await fetch('/api/nba/live',{cache:'no-store',signal:controller.signal});if(!r.ok)throw Error();const next=liveFeedSchema.parse(await r.json());if(active){setFeed(next);setFailed(next.status==='unavailable');setNow(Date.now());}}
   catch{if(active){setFailed(true);setNow(Date.now());}}
   finally{clearTimeout(timeout);busy=false;}
  }
  const initial=setTimeout(()=>void update(),0),timer=setInterval(()=>void update(),30000);
  const resume=()=>{if(document.visibilityState==='visible')void update();};document.addEventListener('visibilitychange',resume);
  return()=>{active=false;controller?.abort();clearTimeout(initial);clearInterval(timer);document.removeEventListener('visibilitychange',resume);};
 },[]);
 return {feed,failed,now};
}
