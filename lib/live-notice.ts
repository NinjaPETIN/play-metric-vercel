import type {LiveFeed,LiveGame} from './live-scores';
export type LiveNoticeTracker={seen:string[];previous:Record<string,LiveGame['state']>};
export function freshLiveNoticeFeed(feed:LiveFeed|null,now:number,failed=false):feed is LiveFeed{
 const age=feed?.fetchedAt?now-Date.parse(feed.fetchedAt):Infinity;
 return !failed&&feed?.status==='ready'&&age>=-5000&&age<=90000;
}
export function readLiveNoticeSeen(raw:string|null):string[]{
 try{const ids:unknown=JSON.parse(raw??'[]');return Array.isArray(ids)?[...new Set(ids.filter((id):id is string=>typeof id==='string'&&/^\d{10}$/.test(id)))].slice(-64):[];}catch{return [];}
}
export function nextLiveNotice(tracker:LiveNoticeTracker,feed:LiveFeed|null,now:number,failed=false){
 if(!freshLiveNoticeFeed(feed,now,failed))return {tracker,games:[] as LiveGame[],started:false};
 const seen=new Set(tracker.seen),previous={...tracker.previous};
 const games=feed.games.filter(game=>game.state==='live'&&game.nbaId&&!seen.has(game.nbaId)&&tracker.previous[game.nbaId]!=='final'&&Math.abs(Date.parse(game.startsAt)-now)<48*3600000);
 const started=games.length>0&&games.every(game=>['scheduled','delayed'].includes(tracker.previous[game.nbaId!]));
 for(const game of feed.games)if(game.nbaId){if(game.state==='live')seen.add(game.nbaId);previous[game.nbaId]=previous[game.nbaId]==='final'?'final':game.state;}
 return {tracker:{seen:[...seen].slice(-64),previous},games,started};
}
