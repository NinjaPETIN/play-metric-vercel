import type {Player} from './data';
import {summarizeCatalogPlayer,defaultCatalogOptions,type CatalogOptions} from './catalog-summary';
// One fixed example; query strings cannot select another public history.
export const SAMPLE_PLAYER_ID='2544';
export function samplePlayer(id:string|null|undefined,competition='regular'){return id===SAMPLE_PLAYER_ID&&competition==='regular';}
export function publicRead(path:string[],url:string){
 const competition=new URL(url).searchParams.get('competition')??'regular';
 if(path[0]==='players'&&path[1])return path.length<=3&&samplePlayer(path[1],competition)&&(!path[2]||['profile','games','traits'].includes(path[2]));
 return (path[0]==='players'&&path.length===1)||(['teams','games'].includes(path[0])&&path.length<=2);
}
export function publicCatalog(data:any,options:CatalogOptions=defaultCatalogOptions){
 return {roster:data.roster,mode:data.mode,source:data.source,season:data.season,seasons:data.seasons,competition:data.competition,fetchedAt:data.fetchedAt,lastGameDate:data.lastGameDate,supportedMarkets:data.supportedMarkets,teams:data.teams,team:data.team,game:data.game,teamGames:data.teamGames??[],pagination:data.pagination,publicPreview:true,catalogScope:options,players:(data.players??[]).map((p:Player)=>{const played=p.games.filter(g=>g.played&&g.minutes>0);return {id:p.id,name:p.name,team:p.team,currentTeam:p.currentTeam,rosterFetchedAt:p.rosterFetchedAt,position:p.position,color:p.color,base:[0,0,0,0],lines:p.lines,games:[],profile:null,traits:null,leagueContext:null,catalogStats:summarizeCatalogPlayer(p,options),seasonPoints:{n:played.length,average:played.length?played.reduce((s,g)=>s+g.points,0)/played.length:null}};})};
}
