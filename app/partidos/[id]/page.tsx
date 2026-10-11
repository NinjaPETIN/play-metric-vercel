import {notFound} from 'next/navigation';
import Dashboard from '../../dashboard';
import {getChatGPTUser} from '../../chatgpt-auth';
import {loadCalendar} from '../../../lib/provider';
import type {Calendar} from '../../../lib/nba-snapshot';
export const dynamic='force-dynamic';
export default async function MatchPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!/^\d{10}$/.test(id))notFound();
 const [calendar,user]=await Promise.all([loadCalendar() as Promise<Calendar|null>,getChatGPTUser()]);
 const match=calendar?.games.find(g=>g.id===id);if(!match)notFound();
 return <Dashboard initialMatch={match} user={user?{name:user.displayName}:null}/>;
}
