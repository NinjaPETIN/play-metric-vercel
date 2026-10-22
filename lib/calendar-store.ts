import {createHash} from 'node:crypto';
import {database} from './database-env';
import {clearNbaReadCache} from './read-cache';
import type {Calendar} from './nba-snapshot';
export class CalendarConflict extends Error{}
const hash=(payload:string)=>createHash('sha256').update(payload).digest('hex');
export async function storeCalendar(data:Calendar){
 const payload=JSON.stringify(data),expires='2099-01-01T00:00:00.000Z';
 // Backup and replacement share one transaction; an older concurrent writer cannot win.
 await database.batch([
  database.prepare("insert into provider_cache(key,payload,expires_at) select 'nba_backup:calendar',payload,? from provider_cache where key='nba_calendar' and julianday(json_extract(payload,'$.fetchedAt'))<julianday(?) on conflict(key) do update set payload=excluded.payload,expires_at=excluded.expires_at").bind(expires,data.fetchedAt),
  database.prepare("insert into provider_cache(key,payload,expires_at) values('nba_calendar',?,?) on conflict(key) do update set payload=excluded.payload,expires_at=excluded.expires_at where julianday(json_extract(provider_cache.payload,'$.fetchedAt'))<julianday(json_extract(excluded.payload,'$.fetchedAt'))").bind(payload,expires),
 ]);
 const saved=await database.prepare("select payload from provider_cache where key='nba_calendar'").first<{payload:string}>();
 if(!saved||saved.payload!==payload)throw new CalendarConflict('Ya hay un calendario más reciente o distinto con esa fecha.');
 clearNbaReadCache('calendar');
 return {ok:true,verified:true,games:data.games.length,fetchedAt:data.fetchedAt,sha256:hash(payload)};
}
