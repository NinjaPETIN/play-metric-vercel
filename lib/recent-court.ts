import type {BoxData} from './live-boxscore';
import {classifyShot} from './match-player-shots';
type Play=NonNullable<BoxData['context']>['plays'][number];
export function recentCourt(plays:Play[],teams:readonly string[]){
 // Source order preserves the order of events sharing the same clock.
 const action=plays.at(-1);
 const timeout=!!action&&/\btime[\s-]?out\b/i.test(action.text)&&!/\b(violation|technical)\b/i.test(action.text);
 const shot = timeout ? null : latestShot(plays,action?.period);
 return {action,timeout,timeoutTeam:timeout&&action?.team&&teams.includes(action.team)?action.team:null,shot};
}

function latestShot(plays:Play[],period:number|undefined){
 for(let index=plays.length-1;index>=0;index--){
  const play=plays[index];
  if(play.period!==period) break;
  const shot=play.shot??classifyShot(play.text,/\b(makes|misses)\b/i.test(play.text),play.pointsAdded??0);
  if(shot) return {play,...shot};
 }
 return null;
}
