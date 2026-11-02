import {notFound,permanentRedirect} from 'next/navigation';
import {playerPath,resolvePlayerPath} from '../../../lib/player-path';
import Dashboard from '../../dashboard';
import {getChatGPTUser} from '../../chatgpt-auth';
import {isCompetition} from '../../../lib/competitions';
import {markets,type Market} from '../../../lib/analytics';
import {teamNames} from '../../../lib/team-overview';
export async function generateMetadata({params}:{params:Promise<{id:string}>}){const {id}=await params,p=resolvePlayerPath(id);return {title:p?.player?`${p.player.name}: estadísticas y tendencias · Statlane`:'Perfil NBA · Statlane',description:'Consultá tendencias, minutos y rendimiento histórico con una muestra y filtros claros.',robots:{index:p?.id==='2544',follow:true},alternates:{canonical:p?.player?playerPath(p.player):'/jugadores/'+id}};}
export const dynamic='force-dynamic';
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const [{id:segment},q,user]=await Promise.all([params,searchParams,getChatGPTUser()]);const resolved=resolvePlayerPath(segment);if(!resolved)notFound();
 if(resolved.player&&playerPath(resolved.player)!=='/jugadores/'+segment){const query=new URLSearchParams();for(const [key,value] of Object.entries(q)){if(Array.isArray(value))value.forEach(v=>query.append(key,v));else if(value!==undefined)query.set(key,value);}permanentRedirect(playerPath(resolved.player)+(query.size?'?'+query:''));}
 const competition=typeof q.competition==='string'?q.competition:undefined,season=typeof q.season==='string'?q.season:undefined,market=typeof q.stat==='string'?q.stat:typeof q.market==='string'?q.market:undefined;
 return <Dashboard initialPlayer={resolved.id} initialCompetition={competition&&isCompetition(competition)?competition:null} initialSeason={season&&/^20\d{2}$/.test(season)?season:''} initialMarket={market&&market in markets?market as Market:'points'} user={user?{name:user.displayName}:null}/>;
}
