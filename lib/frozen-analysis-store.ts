import {database} from './database-env';
export const gameReferencePrefix=(userId:string)=>'pm:game-reference:'+userId+':';
export async function saveFrozenNote(userId:string,matchId:string,playerId:string,market:string,note:string){
 const updated=await database.prepare("update provider_cache set payload=json_set(payload,'$.note',?) where key=? returning key").bind(note,gameReferencePrefix(userId)+[matchId,playerId,market].join(':')).first();
 return Boolean(updated);
}
