import {database} from './database-env';
import type {Player} from './data';
import type {TeamGame} from './nba-snapshot';
import {boxDataSchema} from './live-boxscore';
import {periodStats} from './match-period-stats';
import {identityName} from './player-name';
import {positionGroup, rankPositionDefense, type DefensiveSample, type DefensePeriod} from './position-defense';

export async function positionDefense(players:Player[],games:TeamGame[],period:DefensePeriod){
 if(!games.length)return {};
 const finals=new Map(games.map(game=>[game.id,game]));
 if(period==='game')return rankPositionDefense(players.flatMap(player=>{
  const position=positionGroup(player.position);
  if(!position)return [];
  return player.games.flatMap(g=>{
   const game=g.gameId&&finals.get(g.gameId);
   if(!game||!g.played||g.minutes<=0||!(g.team===game.home&&g.opponent===game.away||g.team===game.away&&g.opponent===game.home))return [];
   return [{gameId:game.id,opponent:g.opponent,position,stats:{points:g.points,rebounds:g.rebounds,assists:g.assists,threes:g.threes}}];
  });
 }));

 // A complete, reconciled play-by-play is required for each historic segment.
 const earliest=games.reduce((day,g)=>g.date<day?g.date:day,'9999-12-31');
 const latest=games.reduce((day,g)=>g.date>day?g.date:day,'0000-01-01');
 const utcEnd=new Date(Date.parse(latest+'T00:00:00Z')+2*86400_000).toISOString();
 const archived=await database.prepare(`select key from provider_cache where key glob 'pm:box:v1:[0-9]*'
  and key not like '%:lease' and json_extract(payload,'$.data.game.state')='final'
  and json_extract(payload,'$.data.game.startsAt')>=? and json_extract(payload,'$.data.game.startsAt')<?
  order by json_extract(payload,'$.data.game.startsAt') desc limit 150`)
  .bind(earliest,utcEnd)
  .all<{key:string}>();
 const positions=new Map<string,ReturnType<typeof positionGroup>>();
 for(const player of players){
  const key=identityName(player.name);
  positions.set(key,positions.has(key)?null:positionGroup(player.position));
 }
 const samples:DefensiveSample[]=[];
 const seen=new Set<string>();
 for(let offset=0;offset<archived.results.length;offset+=8){
  const keys=archived.results.slice(offset,offset+8);
  const payloads=await Promise.all(keys.map(({key})=>database.prepare('select payload from provider_cache where key=?').bind(key).first<{payload:string}>()));
  for(const row of payloads){
  if(!row)continue;
  const parsed=boxDataSchema.safeParse(JSON.parse(row.payload).data);
  if(!parsed.success)continue;
  const box=parsed.data,id=box.game.nbaId,plays=box.context?.plays;
  const final=id&&finals.get(id);
  if(!id||!final||!plays?.length||seen.has(id)||final.home!==box.game.home||final.away!==box.game.away)continue;
  seen.add(id);
  for(const team of box.teams)for(const player of team.players){
   const position=positions.get(identityName(player.name));
   if(!position||player.didNotPlay||player.minutes===null)continue;
   const first=periodStats(plays,player,1,team.code);
   const second=period==='h1'?periodStats(plays,player,2,team.code):first;
   const sum=(a:number|null,b:number|null)=>a===null||b===null?null:period==='h1'?a+b:a;
   const made=(text:string|null)=>text===null?null:Number(text.split('-')[0]);
   samples.push({gameId:id,opponent:team.code===final.home?final.away:final.home,position,stats:{
    points:sum(first.points,second.points),rebounds:sum(first.rebounds,second.rebounds),
    assists:sum(first.assists,second.assists),threes:sum(made(first.threes),made(second.threes)),
   }});
  }
  }
 }
 return rankPositionDefense(samples);
}
