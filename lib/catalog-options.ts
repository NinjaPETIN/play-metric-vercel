import {markets,type Market} from './analytics';
import {teamNames} from './team-overview';
import {PlanError} from './account-plan';
import type {CatalogOptions} from './catalog-summary';
export function catalogOptions(url:string):CatalogOptions{
 const q=new URL(url).searchParams,market=q.get('stat')??'points',last=Number(q.get('last')??10),venue=q.get('venue')??'all',opponent=q.get('opponent')??'all',minutes=Number(q.get('minutes')??0),side=q.get('side')??'over';
 if(!(market==='all'||Object.hasOwn(markets,market))||![0,5,10,20,30].includes(last)||!['all','home','away'].includes(venue)||!(opponent==='all'||Object.hasOwn(teamNames,opponent))||!Number.isFinite(minutes)||minutes<0||minutes>60||!['over','under'].includes(side))throw new PlanError(400,'Filtros de catálogo no válidos.');
 return {market:market as Market|'all',last,venue,opponent,minutes,side:side as 'over'|'under'};
}
