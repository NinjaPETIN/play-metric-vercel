/** Display priority only; source timestamps and game states are never altered. */
export function scoreboardPriority(state:string|number|undefined){
 if(state==='live'||state===2)return 0;
 if(state==='scheduled'||state==='delayed'||state===1)return 1;
 if(state==='final'||state===3)return 3;
 return 2;
}
export function orderScoreboardGames<T extends {id:string;state?:string;status?:number;startsAt?:string|null;date?:string}>(games:readonly T[]):T[]{
 return [...games].sort((a,b)=>scoreboardPriority(a.state??a.status)-scoreboardPriority(b.state??b.status)||(a.startsAt??a.date??'').localeCompare(b.startsAt??b.date??'')||a.id.localeCompare(b.id));
}
