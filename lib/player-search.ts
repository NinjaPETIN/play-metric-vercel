import {teamNames} from './team-overview';
/** Normalize once per imported player, rather than once per keystroke. */
export const normalizeSearch=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
export function createPlayerSearchIndex(players:readonly {id:string;name:string;team:string;currentTeam?:string|null}[]){
 return new Map(players.map(p=>[p.id,playerSearchText(p)]));
}
/** Words may appear anywhere, allowing searches such as "tatum bos". */
export function matchesPlayerSearch(indexedText:string,normalizedQuery:string){
 return !normalizedQuery||normalizedQuery.split(' ').every(word=>indexedText.includes(word));
}

export function playerSearchText(p:{name:string;team:string;currentTeam?:string|null}){const team=p.currentTeam===undefined?p.team:p.currentTeam;return normalizeSearch(p.name+' '+(team??'')+' '+(team?teamNames[team]??'':''));}
