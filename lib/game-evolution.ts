import type {BoxData} from './live-boxscore';
export function elapsedSeconds(period:number,clock:string){
 if(!/^(?:\d{1,2}:\d{2}(?:\.\d+)?|\d{1,2}(?:\.\d+)?)$/.test(clock))return null;
 const duration=period<=4?720:300,parts=clock.split(':'),remaining=parts.length===2?Number(parts[0])*60+Number(parts[1]):Number(clock);
 if(parts.length===2&&Number(parts[1])>=60)return null;
 if(!Number.isFinite(remaining)||remaining<0||remaining>duration||period<1)return null;
 return (period<=4?(period-1)*720:2880+(period-5)*300)+duration-remaining;
}
export function gameEvolution(data:BoxData){
 const plays=data.context?.plays??[],seen=new Set<string>();
 const points=plays.flatMap((p,index)=>{const seconds=elapsedSeconds(p.period,p.clock);if(seconds===null||seen.has(p.id))return [];seen.add(p.id);return [{...p,seconds,index}];}).sort((a,b)=>a.seconds-b.seconds||a.period-b.period||a.index-b.index);
 let awayLead=0,homeLead=0,changes=0,lastLeader=0;
 for(const p of points){const margin=p.awayScore-p.homeScore,leader=Math.sign(margin);awayLead=Math.max(awayLead,margin);homeLead=Math.max(homeLead,-margin);if(leader&&lastLeader&&leader!==lastLeader)changes++;if(leader)lastLeader=leader;}
 const last=points.at(-1),start=points[Math.max(0,points.length-9)];
 return {points,awayLead,homeLead,changes,recent:last&&start?{away:last.awayScore-start.awayScore,home:last.homeScore-start.homeScore}:null};
}
