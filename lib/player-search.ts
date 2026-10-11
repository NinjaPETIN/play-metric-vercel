/** Normalize once per imported player, rather than once per keystroke. */
export const normalizeSearch=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
export function createPlayerSearchIndex(players:readonly {id:string;name:string;team:string}[]){
 return new Map(players.map(p=>[p.id,normalizeSearch(p.name+' '+p.team)]));
}
/** Words may appear anywhere, allowing searches such as "tatum bos". */
export function matchesPlayerSearch(indexedText:string,normalizedQuery:string){
 return !normalizedQuery||normalizedQuery.split(' ').every(word=>indexedText.includes(word));
}
