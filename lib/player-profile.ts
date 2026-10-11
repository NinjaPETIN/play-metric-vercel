import {eq} from 'drizzle-orm';
import {getDb} from '../db';
import {providerCache} from '../db/schema';
export type PlayerProfile={id:string;position:string|null;birthYear:number|null;country:string|null;fetchedAt:string};
export function parseProfile(id:string,body:any):PlayerProfile{
 const set=body.resultSets?.find((s:any)=>s.name==='CommonPlayerInfo'),row=set?.rowSet?.[0];if(!row)throw Error('Sin ficha oficial');const fields=Object.fromEntries(set.headers.map((h:string,i:number)=>[h,row[i]]));if(String(fields.PERSON_ID)!==id)throw Error('Jugador incorrecto');const birth=String(fields.BIRTHDATE??'');return {id,position:typeof fields.POSITION==='string'&&fields.POSITION?fields.POSITION:null,birthYear:/^(19|20)\d{2}-/.test(birth)?Number(birth.slice(0,4)):null,country:typeof fields.COUNTRY==='string'&&fields.COUNTRY?fields.COUNTRY:null,fetchedAt:new Date().toISOString()};
}
export async function loadPlayerProfile(id:string){
 const [record]=await getDb().select().from(providerCache).where(eq(providerCache.key,'nba_profile:'+id));
 if(!record)return {id,position:null,birthYear:null,country:null,fetchedAt:null,status:'pending'};
 return {...JSON.parse(record.payload),status:'ready'} as PlayerProfile & {status:string};
}
