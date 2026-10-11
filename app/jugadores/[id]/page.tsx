import {notFound} from 'next/navigation';
import Dashboard from '../../dashboard';
import {getChatGPTUser} from '../../chatgpt-auth';
import {isCompetition} from '../../../lib/competitions';
import {markets,type Market} from '../../../lib/analytics';
import {teamNames} from '../../../lib/team-overview';
export const dynamic='force-dynamic';
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{competition?:string;season?:string;market?:string}>}){
 const [{id},q,user]=await Promise.all([params,searchParams,getChatGPTUser()]);if(!(/^\d{1,10}$/.test(id)))notFound();
 return <Dashboard initialPlayer={id} initialCompetition={q.competition&&isCompetition(q.competition)?q.competition:null} initialSeason={q.season&&/^20\d{2}$/.test(q.season)?q.season:''} initialMarket={q.market&&q.market in markets?q.market as Market:'points'} user={user?{name:user.displayName}:null}/>;
}
