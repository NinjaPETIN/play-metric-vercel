import {z} from 'zod';
const score=z.number().int().min(0).max(300);
export const liveContextSchema=z.object({periods:z.array(z.object({team:z.string().max(4),scores:z.array(score).max(20)})).max(2),plays:z.array(z.object({id:z.string().max(40),text:z.string().max(600),period:z.number().int().min(1).max(20),clock:z.string().max(20),awayScore:score,homeScore:score,team:z.string().max(4).nullable()})).max(1500)});
export function normalizeLiveContext(raw:unknown,away:string,home:string){
 const r=raw as {header?:{competitions?:{competitors?:unknown[]}[]};plays?:unknown[]};
 const competitors=z.array(z.object({id:z.string(),team:z.object({abbreviation:z.string()}),linescores:z.array(z.object({displayValue:z.string()})).max(20).optional()})).safeParse(r.header?.competitions?.[0]?.competitors);
 const aliases:Record<string,string>={GS:'GSW',NY:'NYK',SA:'SAS',NO:'NOP',UTAH:'UTA',WSH:'WAS'};
 const teams=competitors.success?competitors.data.map(c=>({...c,code:aliases[c.team.abbreviation]??c.team.abbreviation})):[];
 const periods=teams.filter(t=>[away,home].includes(t.code)&&t.linescores?.length&&t.linescores.every(s=>/^\d{1,3}$/.test(s.displayValue))).map(t=>({team:t.code,scores:t.linescores!.map(s=>Number(s.displayValue))}));
 const plays=(Array.isArray(r.plays)?r.plays.slice(-1500):[]).flatMap(p=>{
 const parsed=z.object({id:z.string().max(40),text:z.string().min(1).max(600),period:z.object({number:z.number().int().min(1).max(20)}),clock:z.object({displayValue:z.string().max(20)}),awayScore:score,homeScore:score,team:z.object({id:z.string()}).optional()}).safeParse(p);if(!parsed.success)return [];const q=parsed.data;
 return [{id:q.id,text:q.text,period:q.period.number,clock:q.clock.displayValue,awayScore:q.awayScore,homeScore:q.homeScore,team:teams.find(t=>t.id===q.team?.id)?.code??null}];
 });
 const result=liveContextSchema.safeParse({periods,plays:Array.from(new Map(plays.map(p=>[p.id,p])).values())});return result.success?result.data:{periods:[],plays:[]};
}
