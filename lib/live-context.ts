import {z} from 'zod';
const score=z.number().int().min(0).max(300);
const athleteId=z.string().regex(/^\d{1,12}$/);
export const liveContextSchema=z.object({periods:z.array(z.object({team:z.string().max(4),scores:z.array(score).max(20)})).max(2),plays:z.array(z.object({id:z.string().max(40),text:z.string().max(600),period:z.number().int().min(1).max(20),clock:z.string().max(20),awayScore:score,homeScore:score,team:z.string().max(4).nullable(),athleteId:athleteId.nullable().optional(),pointsAdded:z.number().int().min(0).max(4).optional(),shotLocation:z.object({x:z.number().min(0).max(50),y:z.number().min(0).max(40)}).nullable().optional()})).max(1500)});
export function normalizeLiveContext(raw:unknown,away:string,home:string){
 const r=raw as {header?:{competitions?:{competitors?:unknown[]}[]};plays?:unknown[]};
 const competitors=z.array(z.object({id:z.string(),team:z.object({abbreviation:z.string()}),linescores:z.array(z.object({displayValue:z.string()})).max(20).optional()})).safeParse(r.header?.competitions?.[0]?.competitors);
 const aliases:Record<string,string>={GS:'GSW',NY:'NYK',SA:'SAS',NO:'NOP',UTAH:'UTA',WSH:'WAS'};
 const teams=competitors.success?competitors.data.map(c=>({...c,code:aliases[c.team.abbreviation]??c.team.abbreviation})):[];
 const periods=teams.filter(t=>[away,home].includes(t.code)&&t.linescores?.length&&t.linescores.every(s=>/^\d{1,3}$/.test(s.displayValue))).map(t=>({team:t.code,scores:t.linescores!.map(s=>Number(s.displayValue))}));
 const plays=(Array.isArray(r.plays)?r.plays.slice(-1500):[]).flatMap(p=>{
 const parsed=z.object({id:z.string().max(40),text:z.string().min(1).max(600),period:z.object({number:z.number().int().min(1).max(20)}),clock:z.object({displayValue:z.string().max(20)}),awayScore:score,homeScore:score,team:z.object({id:z.string()}).optional()}).safeParse(p);if(!parsed.success)return [];const q=parsed.data;
 const extras=z.object({participants:z.array(z.object({athlete:z.object({id:athleteId})})).max(10).optional(),coordinate:z.unknown().optional(),shootingPlay:z.boolean().optional(),scoringPlay:z.boolean().optional(),scoreValue:z.number().int().min(0).max(4).optional()}).safeParse(p);
 const coordinate=extras.success?z.object({x:z.number().min(0).max(50),y:z.number().min(0).max(40)}).safeParse(extras.data.coordinate):null;
 const distance=/(\d+)-foot/.exec(q.text);
 // Only publish a shot location when its source coordinates agree with the stated distance from the basket.
 const shotLocation=extras.success&&extras.data.shootingPlay&&coordinate?.success&&distance&&Math.abs(Math.hypot(coordinate.data.x-25,coordinate.data.y)-Number(distance[1]))<=3?coordinate.data:null;
 return [{id:q.id,text:q.text,period:q.period.number,clock:q.clock.displayValue,awayScore:q.awayScore,homeScore:q.homeScore,team:teams.find(t=>t.id===q.team?.id)?.code??null,shotLocation,athleteId:extras.success?extras.data.participants?.[0]?.athlete.id??null:null,pointsAdded:extras.success&&extras.data.scoringPlay?extras.data.scoreValue??0:0}];
 });
 const result=liveContextSchema.safeParse({periods,plays:Array.from(new Map(plays.map(p=>[p.id,p])).values())});return result.success?result.data:{periods:[],plays:[]};
}
