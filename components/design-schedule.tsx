'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {CalendarDays} from 'lucide-react';
import {loadCachedData} from '../lib/client-data-cache';
import type {Calendar} from '../lib/nba-snapshot';
import TeamLogo from './team-logo';

const zone='America/Argentina/Buenos_Aires';
const time=new Intl.DateTimeFormat('es-AR',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:zone});
const day=new Intl.DateTimeFormat('es-AR',{weekday:'short',day:'numeric',month:'short',timeZone:zone});
const empty:Calendar['games']=[];
export function useUpcomingGames(){
 const [state,setState]=useState<{games:Calendar['games'];failed:boolean}|null>(null);
 useEffect(()=>{
  let active=true;
  loadCachedData<Calendar>('/api/nba/calendar').then(calendar=>{
   if(!active)return;
   const now=Date.now();
   setState({games:calendar.games.filter(game=>game.status===1&&game.startsAt&&Date.parse(game.startsAt)>now)
    .sort((a,b)=>Date.parse(a.startsAt!)-Date.parse(b.startsAt!)),failed:false});
  }).catch(()=>{if(active)setState({games:[],failed:true});});
  return()=>{active=false;};
 },[]);
 return {games:state?.games??empty,failed:state?.failed??false,loading:state===null};
}

export function UpcomingFixtures(){
 const {games,failed,loading}=useUpcomingGames();
 return <section className="design-fixtures"><div className="design-fixtures-title"><h2>Próximos partidos</h2><Link href="/?view=calendar">Ver calendario →</Link></div>
  {games.length?<div className="design-fixtures-grid">{games.slice(0,2).map(game=><Link key={game.id} href={'/partidos/'+game.id+'?matchTab=live&liveSection=preview'} prefetch={false}>
   <span><TeamLogo team={game.away} size={54}/><b>{game.awayName}</b></span>
   <span><small>{day.format(new Date(game.startsAt!))}</small><strong>{time.format(new Date(game.startsAt!))}</strong><small>ARG</small></span>
   <span><TeamLogo team={game.home} size={54}/><b>{game.homeName}</b></span>
  </Link>)}</div>:<p role="status">{loading?'Consultando calendario…':failed?'El calendario está temporalmente sin conexión.':'No hay próximos partidos con horario publicado.'}</p>}
 </section>;
}
export function PlayerUpcoming({team}:{team:string|null}){
 const {games}=useUpcomingGames();
 const game=team?games.find(game=>game.away===team||game.home===team):null;
 if(!game)return null;
 const home=game.home===team;
 return <Link className="profile-next-match" href={'/partidos/'+game.id+'?matchTab=live&liveSection=preview'} prefetch={false}>
  <CalendarDays size={18}/><span>Próximo partido <b>{home?'vs. ':'@ '}{home?game.awayName:game.homeName}</b></span>
  <TeamLogo team={home?game.away:game.home} size={29}/>
 </Link>;
}
