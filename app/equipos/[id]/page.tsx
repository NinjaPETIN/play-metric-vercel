import {notFound} from 'next/navigation';
import Dashboard from '../../dashboard';
import {getChatGPTUser} from '../../chatgpt-auth';
import {isCompetition} from '../../../lib/competitions';
import {markets,type Market} from '../../../lib/analytics';
import {teamNames} from '../../../lib/team-overview';
export async function generateMetadata({params}:{params:Promise<{id:string}>}){const {id}=await params,team=teamNames[id.toUpperCase()];return {title:team?team+': estadísticas NBA · Statlane':'Equipo NBA · Statlane',description:'Explorá jugadores, partidos e históricos del equipo por temporada.',robots:{index:!!team,follow:true},alternates:{canonical:'/equipos/'+id.toUpperCase()}};}
export const dynamic='force-dynamic';
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{competition?:string;season?:string;market?:string}>}){
 const [{id},q,user]=await Promise.all([params,searchParams,getChatGPTUser()]);if(!(id.toUpperCase() in teamNames))notFound();
 return <Dashboard initialTeam={id.toUpperCase()} initialCompetition={q.competition&&isCompetition(q.competition)?q.competition:null} initialSeason={q.season&&/^20\d{2}$/.test(q.season)?q.season:''} initialMarket={q.market&&q.market in markets?q.market as Market:'points'} user={user?{name:user.displayName}:null}/>;
}
