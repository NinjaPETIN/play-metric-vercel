'use client';
import {useSyncExternalStore} from 'react';
import {liveFeedSchema} from './live-scores';
import {createLiveScoreChannel} from './live-score-channel';
const channel=createLiveScoreChannel({
 now:()=>Date.now(),
 visible:()=>document.visibilityState!=='hidden',
 onVisibility(listener){document.addEventListener('visibilitychange',listener);return()=>document.removeEventListener('visibilitychange',listener);},
 schedule(callback,delay){const timer=setTimeout(callback,delay);return()=>clearTimeout(timer);},
 async read(signal){const response=await fetch('/api/nba/live',{cache:'no-store',credentials:'omit',signal});if(!response.ok)throw Error('HTTP '+response.status);return liveFeedSchema.parse(await response.json());},
});
export function useLiveScores(){return useSyncExternalStore(channel.subscribe,channel.getSnapshot,channel.getServerSnapshot);}
