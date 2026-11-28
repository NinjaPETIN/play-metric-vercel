import type {BoxData} from './live-boxscore';
import {classifyShot} from './match-player-shots';
export type CourtPlay=NonNullable<BoxData['context']>['plays'][number];
export type CourtSelection={id:string;plays:CourtPlay[]};
export function courtShot(play:CourtPlay){return play.shot===undefined?classifyShot(play.text,!!play.shotLocation||/\b(makes|misses)\b/i.test(play.text),play.pointsAdded??0):play.shot;}
export function playbackFrame(plays:CourtPlay[],selection:CourtSelection|null){
 if(!selection)return {plays,action:plays.at(-1),missing:false};
 const index=plays.findIndex(p=>p.id===selection.id),source=index<0?selection.plays:plays,end=source.findIndex(p=>p.id===selection.id);
 const frame=end<0?[]:source.slice(0,end+1);return {plays:frame,action:frame.at(-1),missing:index<0};
}
export function shootingAt(plays:CourtPlay[],throughId:string,athlete:string,value:1|2|3,team:string|null){
 const end=plays.findIndex(p=>p.id===throughId);if(end<0)return null;
 let made=0,attempts=0;const seen=new Set<string>();
 for(const p of plays.slice(0,end+1)){if(seen.has(p.id))continue;seen.add(p.id);if(p.athleteId!==athlete||(team&&p.team!==team))continue;const shot=courtShot(p);if(shot?.value===value){attempts++;if(shot.made)made++;}}
 return [made,attempts];
}
