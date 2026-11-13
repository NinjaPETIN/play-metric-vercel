import type {BoxData} from './live-boxscore';
import {playerShots} from './match-player-shots';
import {identityName} from './player-identity';

type Player=BoxData['teams'][number]['players'][number];
type Play=NonNullable<BoxData['context']>['plays'][number];
export const periodLabel=(period:number|null)=>period===null?'Todos':period<=4?'C'+period:'TE'+(period-4);
export function matchPeriodCount(data:BoxData){
 return Math.max(data.game.period,...(data.context?.plays??[]).map(p=>p.period),...(data.context?.periods??[]).map(t=>t.scores.length));
}

export function periodStats(plays:Play[],player:Player,period:number,team:string){
 const unavailable={points:null,rebounds:null,assists:null,fieldGoals:null,threes:null,freeThrows:null};
 if(player.didNotPlay||!plays.some(p=>p.period===period))return unavailable;
 const shots=playerShots(plays,player.id,null);
 const selected=shots.filter(p=>p.period===period);
 const points=(list:typeof shots)=>list.reduce((sum,p)=>sum+(p.shot.made?p.shot.value:0),0);
 const tally=(list:typeof shots,value?:number)=>{
  const attempts=list.filter(p=>value===undefined?p.shot.value>1:p.shot.value===value);
  return attempts.filter(p=>p.shot.made).length+'-'+attempts.length;
 };
 const count=(events:Play[],total:number|null)=>total===events.length?events.filter(p=>p.period===period).length:null;
 const rebounds=plays.filter(p=>p.athleteId===player.id&&/\b(offensive|defensive) rebound\b/i.test(p.text)&&!/\bteam rebound\b/i.test(p.text));
 const name=identityName(player.name);
 const assists=plays.filter(p=>{
  if(p.team!==team||!p.pointsAdded||p.pointsAdded<2)return false;
  const assister=/\(([^()]+) assists\)\s*$/i.exec(p.text)?.[1];
  return assister!==undefined&&identityName(assister)===name;
 });
 return {
  points:points(shots)===player.points?points(selected):null,
  rebounds:count(rebounds,player.rebounds),
  assists:count(assists,player.assists),
  fieldGoals:tally(shots)===player.fieldGoals?tally(selected):null,
  threes:tally(shots,3)===player.threes?tally(selected,3):null,
  freeThrows:tally(shots,1)===player.freeThrows?tally(selected,1):null,
 };
}
