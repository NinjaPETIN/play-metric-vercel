import type {BoxData} from './live-boxscore';
import type {recentCourt} from './recent-court';
import {shootingAt,type CourtPlay} from './court-playback';
export function courtShotDetails(shot:ReturnType<typeof recentCourt>['shot'],teams:BoxData['teams'],frame?:{plays:CourtPlay[];throughId:string}){
 if(!shot)return null;
 const team=teams.find(t=>t.code===shot.play.team);
 const matches=(team?[team]:teams).flatMap(t=>t.players.filter(p=>p.id===shot.play.athleteId).map(player=>({player,team:t})));
 const person=matches.length===1?matches[0]:null;
 const pair=(s:string|null|undefined)=>{const m=/^(\d+)-(\d+)$/.exec(s??'');return m&&+m[1]<=+m[2]?[+m[1],+m[2]]:null;};
 const p=person?.player;
 let attempts=shot.value===1?pair(p?.freeThrows):shot.value===3?pair(p?.threes):null;
 if(shot.value===2){const fg=pair(p?.fieldGoals),three=pair(p?.threes);if(fg&&three){const made=fg[0]-three[0],total=fg[1]-three[1];if(made>=0&&total>=made)attempts=[made,total];}}
 if(p?.didNotPlay)attempts=null;
 if(frame)attempts=person?shootingAt(frame.plays,frame.throughId,person.player.id,shot.value,person.team.code):null;
 return {person,team:team??person?.team??null,attempts,percentage:attempts&&attempts[1]>0?attempts[0]/attempts[1]*100:null,label:shot.value===1?'Tiros libres':shot.value===3?'Tiros de 3 puntos':'Tiros de 2 puntos'};
}
