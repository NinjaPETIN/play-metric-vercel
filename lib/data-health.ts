export function dataFeedHealth({fetchedAt,checkedAt,lastGameDate,season,currentSeason,attemptStatus}:{fetchedAt:string|null;checkedAt?:string|null;lastGameDate?:string|null;season:number|null;currentSeason:number;attemptStatus?:string},now=Date.now()){
 const valid=(s:string|null|undefined)=>s&&Number.isFinite(Date.parse(s))&&Date.parse(s)<=now+300000?Date.parse(s):null;
 const fetched=valid(fetchedAt),checked=valid(checkedAt),archived=season!==null&&season<currentSeason;
 const importStatus=archived&&fetched?'archived':!fetched?'pending':now-fetched>8*3600000?'stale':'ready';
 const status=archived&&fetched?'archived':checked&&now-checked<=8*3600000?(attemptStatus==='ready'?'ready':attemptStatus==='partial'?'partial':'failed'):importStatus;
 return {fetchedAt,checkedAt:checked?checkedAt:null,lastGameDate:lastGameDate??null,season,status,importStatus};
}
