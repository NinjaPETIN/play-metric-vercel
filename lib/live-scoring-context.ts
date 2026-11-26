import type {Game} from './analytics';
import type {BoxData} from './live-boxscore';
type Person=BoxData['teams'][number]['players'][number];
export function liveScoringContext(person:Person,games:Game[]){
 const pair=(s:string|null)=>{const m=/^(\d+)-(\d+)$/.exec(s??'');return m&&Number(m[1])<=Number(m[2])?[Number(m[1]),Number(m[2])]:null;};
 const fg=pair(person.fieldGoals),three=pair(person.threes),ft=pair(person.freeThrows);
 const parts=!person.didNotPlay&&fg&&three&&ft&&three[0]<=fg[0]&&fg[0]*2+three[0]+ft[0]===person.points?{twos:(fg[0]-three[0])*2,threes:three[0]*3,freeThrows:ft[0]}:null;
 const valid=games.filter(g=>g.played&&g.minutes>0);
 const attempts=valid.filter(g=>g.fieldGoalsAttempted!==undefined);
 const freeThrows=valid.filter(g=>g.freeThrowsAttempted!==undefined);
 const shooting=valid.filter(g=>g.fieldGoalsAttempted!==undefined&&g.fieldGoalsMade!==undefined);
 const totalAttempts=shooting.reduce((s,g)=>s+g.fieldGoalsAttempted!,0);
 return {parts,attempts:fg?.[1]??null,efficiency:fg&&fg[1]>0?fg[0]/fg[1]:null,freeThrows:ft?.[1]??null,
  baseline:{attempts:{n:attempts.length,value:attempts.length?attempts.reduce((s,g)=>s+g.fieldGoalsAttempted!,0)/attempts.length:null},freeThrows:{n:freeThrows.length,value:freeThrows.length?freeThrows.reduce((s,g)=>s+g.freeThrowsAttempted!,0)/freeThrows.length:null},efficiency:{n:shooting.length,value:totalAttempts?shooting.reduce((s,g)=>s+g.fieldGoalsMade!,0)/totalAttempts:null}}};
}
