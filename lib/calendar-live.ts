import type {Calendar} from './nba-snapshot';
import type {LiveFeed,LiveGame} from './live-scores';

export type CalendarGame=Calendar['games'][number]&{
 live?:{state:LiveGame['state'];detail:string;fetchedAt:string;stale:boolean};
};

// Keep live readings separate from the imported calendar and historical player data.
export function calendarWithLive(calendar:Calendar|null,feed:LiveFeed|null,now:number,failed=false):CalendarGame[]{
 const age=feed?.fetchedAt?now-Date.parse(feed.fetchedAt):Infinity;
 if(!feed?.fetchedAt||!['ready','stale'].includes(feed.status)||age< -5000||age>=300000)return calendar?.games??[];
 const stale=failed||feed.status!=='ready'||age>90000;
 return (calendar?.games??[]).map(g=>{
  const matches=feed.games.filter(l=>l.nbaId===g.id&&l.home===g.home&&l.away===g.away&&
   new Date(l.startsAt).toLocaleDateString('en-CA',{timeZone:'America/New_York'})===g.date&&
   Math.abs(Date.parse(l.startsAt)-now)<=48*3600000);
  if(matches.length!==1)return g;
  const l=matches[0];
  // Never turn a confirmed final back into a live or scheduled game.
  if(g.status===3&&l.state!=='final'||g.status===2&&l.state==='scheduled')return g;
  const scored=l.state==='live'||l.state==='final';
  if(scored&&(l.homeScore===null||l.awayScore===null))return g;
  return {...g,startsAt:l.startsAt,status:l.state==='final'?3:l.state==='live'?2:g.status,
   ...(scored?{homeScore:l.homeScore,awayScore:l.awayScore}:{}),
   live:{state:l.state,detail:l.detail,fetchedAt:feed.fetchedAt!,stale}};
 });
}
