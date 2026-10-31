import {notFound} from 'next/navigation';
import Dashboard from '../../dashboard';
import {getChatGPTUser} from '../../chatgpt-auth';
import {loadCalendar} from '../../../lib/provider';
import type {Calendar} from '../../../lib/nba-snapshot';
import {readRecentNbaBoxscore} from '../../../lib/live-boxscore-store';
export const dynamic='force-dynamic';
export default async function MatchPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!/^\d{10}$/.test(id))notFound();
 const [calendar,user]=await Promise.all([loadCalendar() as Promise<Calendar|null>,getChatGPTUser()]);
 const match=calendar?.games.find(g=>g.id===id);if(!match)notFound();
 const initialLiveBox=await readRecentNbaBoxscore(id,calendar).catch(()=>null);
 return <Dashboard initialMatch={match} initialLiveBox={initialLiveBox} user={user?{name:user.displayName}:null}/>;
}
