import directory from './player-directory.json';
export const identityName=(name:string)=>name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const names=new Map<string,string|null>();
for(const p of directory){const name=identityName(p.name);names.set(name,names.has(name)?null:String(p.id));}
export function nbaPlayerId(name:string,catalog?:Array<{id:string;name:string}>){const matches=catalog?.filter(p=>identityName(p.name)===identityName(name));if(matches?.length)return matches.length===1?matches[0].id:null;return names.get(identityName(name))??null;}
export function livePlayerKey(person:{id:string;name:string},catalog?:Array<{id:string;name:string}>){const id=nbaPlayerId(person.name,catalog);return id?'nba:'+id:'espn:'+person.id;}
