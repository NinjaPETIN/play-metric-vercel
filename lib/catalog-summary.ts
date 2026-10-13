import {analyze,markets,type Market} from './analytics';
import type {Player} from './data';
export const overviewMarkets=['points','rebounds','assists','threes'] as const;
export type CatalogStat={n:number;average:number|null;rate:number|null;hits:number|null;pushes:number|null;line:number|null};
export type CatalogOptions={market:Market|'all';last:number;venue:string;opponent:string;minutes:number;side:'over'|'under'};
export const defaultCatalogOptions:CatalogOptions={market:'points',last:10,venue:'all',opponent:'all',minutes:0,side:'over'};
export function summarizeCatalogPlayer(p:Player,options=defaultCatalogOptions):Partial<Record<Market,CatalogStat>>{
 const games=p.games.filter(g=>g.played&&g.minutes>0&&(options.venue==='all'||g.home===(options.venue==='home'))&&(options.opponent==='all'||g.opponent===options.opponent)&&g.minutes>=options.minutes).sort((a,b)=>String(b.date??'').localeCompare(String(a.date??''))).slice(0,options.last||undefined);
 return Object.fromEntries((options.market==='all'?overviewMarkets:[options.market]).map(m=>{const line=Number.isFinite(p.lines?.[m])?p.lines[m]:null,a=analyze(games,m,line??0,options.side);return [m,{n:a.n,average:a.average,rate:line===null?null:a.rate,hits:line===null?null:a.hits,pushes:line===null?null:a.pushes,line}];}));
}
export function catalogStat(p:Player,market:Market,last:number,side:'over'|'under',filter:(p:Player)=>Player['games'],line:(p:Player,m:Market)=>number):CatalogStat{
 if(p.catalogStats)return p.catalogStats[market]??{n:0,average:null,rate:null,hits:null,pushes:null,line:null};
 const threshold=line(p,market),a=analyze(filter(p).slice(0,last||undefined),market,threshold,side);return {...a,line:threshold};
}
export function catalogRows(players:Player[],market:Market|'all',settings:{sort:string;minGames:number;minRate:number;minLine:number;maxLine:number}){
 const m=market==='all'?'points':market;
 return players.flatMap(p=>{const a=p.catalogStats?.[m];return a&&a.n>=settings.minGames&&(market==='all'||(a.rate??0)>=settings.minRate/100&&(a.line??0)>=settings.minLine&&(a.line??0)<=settings.maxLine)?[{p,m,a}]:[];}).sort((a,b)=>settings.sort==='name'?a.p.name.localeCompare(b.p.name,'es'):settings.sort==='average'||market==='all'?(b.a.average??-1)-(a.a.average??-1)||a.p.name.localeCompare(b.p.name,'es'):(b.a.rate??-1)-(a.a.rate??-1)||b.a.n-a.a.n||a.p.name.localeCompare(b.p.name,'es'));
}
