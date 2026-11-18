import {defenseMetrics,type DefenseMetric,type DefenseRank} from './team-defense';

export const positionLabels = {guard:'Bases y escoltas',forward:'Aleros',center:'Pívots'} as const;
export type PositionGroup=keyof typeof positionLabels;
export type DefensePeriod='game'|'q1'|'h1';
export type PositionDefense=Partial<Record<PositionGroup,Record<string,DefenseRank[]>>>;
export type DefensiveSample={gameId:string;opponent:string;position:PositionGroup;stats:Record<DefenseMetric,number|null>};

export function positionGroup(position:string):PositionGroup|null{
 const primary=position.trim().toUpperCase().split(/[-/]/)[0].trim();
 if(['G','PG','SG','GUARD','POINT GUARD','SHOOTING GUARD'].includes(primary))return 'guard';
 if(['F','SF','PF','FORWARD','SMALL FORWARD','POWER FORWARD'].includes(primary))return 'forward';
 if(['C','CENTER'].includes(primary))return 'center';
 return null;
}

export function rankPositionDefense(samples:DefensiveSample[]):PositionDefense{
 const fixtures=new Map<string,DefensiveSample[]>();
 for(const row of samples){
  const key=[row.gameId,row.opponent,row.position].join(':');
  const rows=fixtures.get(key)??[];
  rows.push(row);fixtures.set(key,rows);
 }
 const result:PositionDefense={};
 for(const position of Object.keys(positionLabels) as PositionGroup[]){
  const output:Record<string,DefenseRank[]>={};
  for(const metric of defenseMetrics){
   const teams=new Map<string,{sum:number;games:number}>();
   for(const rows of fixtures.values()){
    const {opponent,position:group}=rows[0];
    if(position!==group||rows.some(row=>row.stats[metric]===null))continue;
    const total=teams.get(opponent)??{sum:0,games:0};
    total.sum+=rows.reduce((sum,row)=>sum+(row.stats[metric]??0),0);
    total.games++;teams.set(opponent,total);
   }
   const eligible=[...teams].filter(([,data])=>data.games>=5).map(([team,d])=>({team,games:d.games,average:d.sum/d.games})).sort((a,b)=>a.average-b.average);
   if(eligible.length<10)continue;
   let rank=0;
   eligible.forEach(({team,average,games},i)=>{
    if(i===0||average!==eligible[i-1].average)rank=i+1;
    (output[team]??=[]).push({metric,average,games,rank,teams:eligible.length});
   });
  }
  result[position]=output;
 }
 return result;
}
