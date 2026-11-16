import type { Game } from './analytics';

const fields = [
 'gameId','team','date','opponent','home','minutes','points','rebounds','assists','threes','played',
 'steals','blocks','turnovers','fieldGoalsAttempted','fieldGoalsMade','freeThrowsAttempted',
 'freeThrowsMade','offensiveRebounds','defensiveRebounds','threeAttempts',
] as const;

export function compactDashboard<T extends {players:{games:Game[]}[]}>(data:T) {
 return {...data,gameFields:fields,players:data.players.map(player=>({
  ...player,games:player.games.map(game=>fields.map(key=>game[key]??null)),
 }))};
}

function record(value:unknown): value is Record<string,unknown> {
 return typeof value==='object'&&value!==null;
}

export function packDashboard(value:unknown): unknown {
 if(!record(value)||!Array.isArray(value.players)||
  !value.players.every((player:unknown)=>record(player)&&Array.isArray(player.games)))return value;
 return compactDashboard({...value,players:value.players as {games:Game[]}[]});
}

export function expandDashboard(data:unknown): unknown {
 if(!record(data)||!Array.isArray(data.gameFields)||!Array.isArray(data.players))return data;
 const {gameFields,...rest}=data;
 const keys=gameFields as string[];
 return {...rest,players:data.players.map((player:{games:unknown[][]})=>({
  ...player,games:player.games.map(row=>{
   const game:Record<string,unknown>={};
   for(let i=0;i<keys.length;i++){
    if(row[i]!==null&&keys[i]!=='__proto__')game[keys[i]]=row[i];
   }
   return game;
  }),
 }))};
}
