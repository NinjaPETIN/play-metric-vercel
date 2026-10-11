/** Keep every player list within the selected match and team. */
export function playersForSelection<T extends {team:string}>(players:T[],match:{home:string;away:string}|null,team:string):T[]{
 return players.filter(p=>(!match||p.team===match.home||p.team===match.away)&&(team==='all'||p.team===team));
}
