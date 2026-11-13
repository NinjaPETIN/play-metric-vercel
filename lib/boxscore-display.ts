import type {BoxData} from './live-boxscore';
type Team=BoxData['teams'][number];
export function courtKnown(team:Team,state:BoxData['game']['state'],stale=false){return state==='live'&&!stale&&team.players.every(p=>typeof p.onCourt==='boolean')&&team.players.filter(p=>p.onCourt===true).length===5&&!team.players.some(p=>p.onCourt&&p.didNotPlay);}
export function playerGroups(team:Team,state:BoxData['game']['state'],stale=false){
 const players=team.players.slice().sort((a,b)=>(b.points??-1)-(a.points??-1));
 if(courtKnown(team,state,stale))return [{title:'En cancha',players:players.filter(p=>p.onCourt===true)},{title:'Banco',players:players.filter(p=>p.onCourt!==true)}];
 return [{title:'Titulares',players:players.filter(p=>p.starter)},{title:'Suplentes',players:players.filter(p=>!p.starter)}];
}
