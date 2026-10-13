import directory from './player-directory.json';
type Identity={id:string;name:string};
export function playerSlug(name:string){return name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
export function createPlayerPaths(players:Identity[]){
 const counts=new Map<string,number>();for(const p of players){const s=playerSlug(p.name);counts.set(s,(counts.get(s)??0)+1);}
 return players.map(p=>({...p,slug:playerSlug(p.name)+(counts.get(playerSlug(p.name))!>1?'-'+p.id:'')}));
}
const players=createPlayerPaths(directory),byId=new Map(players.map(p=>[p.id,p])),bySlug=new Map(players.map(p=>[p.slug,p]));
export function playerPath(player:Identity){return '/jugadores/'+(byId.get(player.id)?.slug??((playerSlug(player.name)||'jugador')+'-'+player.id));}
export function resolvePlayerPath(segment:string){if(/^\d{1,10}$/.test(segment))return {id:segment,player:byId.get(segment)};const known=bySlug.get(segment);if(known)return {id:known.id,player:known};const match=/^[a-z0-9]+(?:-[a-z0-9]+)*-(\d{1,10})$/.exec(segment);return match?{id:match[1],player:byId.get(match[1])}:null;}
