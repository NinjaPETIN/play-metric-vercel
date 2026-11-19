import {markets,type Market} from './analytics';
import {reportPath} from './report-context';
export const homeViews={explore:'Jugadores',calendar:'Partidos',favorites:'Mi jornada',markets:'Estadísticas'} as const;
export type HomeView=keyof typeof homeViews;
export type RecentAnalysis={path:string;name:string;market:Market;summary:string;visitedAt:string};
export type WorkspaceState={home:HomeView;recents:RecentAnalysis[]};
export const defaultWorkspace:WorkspaceState={home:'explore',recents:[]};
export function isHomeView(value:unknown):value is HomeView{return typeof value==='string'&&Object.hasOwn(homeViews,value);}
export function canonicalAnalysisPath(raw:unknown):string|null{
 if(typeof raw!=='string'||raw.length>12000||!/^\/jugadores\/[a-z0-9-]+(?:\?|$)/.test(raw)||raw.includes('\\')||/[\u0000-\u001f]/.test(raw))return null;
 try{const clean=reportPath(raw),url=new URL(clean,'https://statlane.invalid');if(!/^\/jugadores\/[a-z0-9-]+$/.test(url.pathname))return null;
 const q=url.searchParams,stat=q.get('stat');if(!stat||!Object.hasOwn(markets,stat)||!/^20\d{2}$/.test(q.get('season')??''))return null;
 const line=Number(q.get('line'));if(!q.has('line')||!Number.isFinite(line)||line<0||line>200||!['over','under'].includes(q.get('side')??'over'))return null;
 if(q.has('last')&&![0,5,10,20,30].includes(Number(q.get('last'))))return null;
 q.sort();return url.pathname+'?'+q;
 }catch{return null;}
}
export function validRecent(value:unknown):Omit<RecentAnalysis,'visitedAt'>|null{
 if(!value||typeof value!=='object'||Array.isArray(value))return null;const row=value as Record<string,unknown>,path=canonicalAnalysisPath(row.path);
 if(!path||typeof row.name!=='string'||!row.name.trim()||row.name.length>100||typeof row.summary!=='string'||row.summary.length>600||typeof row.market!=='string'||!Object.hasOwn(markets,row.market)||new URL(path,'https://statlane.invalid').searchParams.get('stat')!==row.market)return null;
 return {path,name:row.name.trim(),summary:row.summary,market:row.market as Market};
}
export function resolveHomeView(query:Record<string,unknown>,home:HomeView):HomeView|'markets'{return isHomeView(query.view)||query.view==='markets'?query.view:Object.keys(query).length?'explore':home;}
