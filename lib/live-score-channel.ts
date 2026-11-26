import type {LiveFeed} from './live-scores';
import {LIVE_POLL_MS} from './live-refresh';
export type LiveScoreSnapshot={feed:LiveFeed|null;failed:boolean;now:number};
const empty:LiveScoreSnapshot={feed:null,failed:false,now:0};
type Environment={read:(signal:AbortSignal)=>Promise<LiveFeed>;now:()=>number;visible:()=>boolean;onVisibility:(listener:()=>void)=>()=>void;schedule:(callback:()=>void,delay:number)=>()=>void};
/** One public scoreboard read per tab, shared by every mounted consumer. */
export function createLiveScoreChannel(environment:Environment){
 const listeners=new Set<()=>void>();
 let snapshot=empty,stopVisibility:(()=>void)|undefined,cancelPoll:(()=>void)|undefined;
 let pending:{controller:AbortController;cancelDeadline:()=>void}|undefined;
 const publish=(next:LiveScoreSnapshot)=>{snapshot=next;for(const listener of listeners)listener();};
 function update(){
  cancelPoll?.();cancelPoll=undefined;
  if(!listeners.size||!environment.visible()||pending)return;
  const controller=new AbortController();
  const job={controller,cancelDeadline:environment.schedule(()=>controller.abort(),25000)};
  pending=job;
  publish({...snapshot,now:environment.now()});
  void environment.read(controller.signal).then(feed=>{
   if(pending===job&&listeners.size)publish({feed,failed:feed.status==='unavailable',now:environment.now()});
  }).catch(()=>{
   if(pending===job&&listeners.size)publish({...snapshot,failed:true,now:environment.now()});
  }).finally(()=>{
   job.cancelDeadline();
   if(pending!==job)return;
   pending=undefined;
   if(listeners.size&&environment.visible())cancelPoll=environment.schedule(update,LIVE_POLL_MS);
  });
 }
 return {
  getSnapshot:()=>snapshot,
  getServerSnapshot:()=>empty,
  subscribe(listener:()=>void){
   listeners.add(listener);
   if(listeners.size===1){
    stopVisibility=environment.onVisibility(()=>{if(environment.visible())update();else{cancelPoll?.();cancelPoll=undefined;}});
    cancelPoll=environment.schedule(update,0);
   }
   return()=>{
    listeners.delete(listener);
    if(listeners.size)return;
    cancelPoll?.();cancelPoll=undefined;stopVisibility?.();stopVisibility=undefined;
    const old=pending;pending=undefined;old?.cancelDeadline();old?.controller.abort();
    snapshot=empty;
   };
  },
 };
}
