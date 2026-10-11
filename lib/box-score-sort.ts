import type {Game} from './analytics';
export type BoxSort='minutes'|'points'|'rebounds'|'assists'|'threes';
export function sortBoxRows<T extends {name:string;g:Game}>(rows:T[],metric:BoxSort,direction:'asc'|'desc'='desc'){
 return [...rows].sort((a,b)=>(direction==='desc'?b.g[metric]-a.g[metric]:a.g[metric]-b.g[metric])||b.g.points-a.g.points||b.g.minutes-a.g.minutes||a.name.localeCompare(b.name));
}
