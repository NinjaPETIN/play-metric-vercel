'use client';
import {useMemo,useRef,useState,type ReactNode} from 'react';
import type {Player} from '../lib/data';
import {markets,type Market} from '../lib/analytics';
import {catalogRows,type CatalogStat} from '../lib/catalog-summary';
import {useReadingPreferences} from './reading-preferences';
import {useUpcomingGames} from './design-schedule';
import TeamLogo from './team-logo';
import CatalogTrend from './catalog-trend';
import type {Competition} from '../lib/competitions';

const number=(n:number|null|undefined)=>n==null?'—':n.toLocaleString('es-AR',{maximumFractionDigits:1});
type Settings={sort:string;minGames:number;minRate:number;maxLine:number;minLine:number;side:'over'|'under';venue:string;opponent:string;minMinutes:number};
type Row={p:Player;m:Market;a?:CatalogStat};
function portrait(player:Player){return 'https://cdn.nba.com/headshots/nba/latest/260x190/'+player.id+'.png';}
function Spark({values=[],metric}:{values?:Array<number|null>;metric:string}){
 const max=Math.max(1,...values.map(value=>value??0));
 if(!values.length)return <span className="muted" aria-label="Sin partidos para graficar">—</span>;
 const description=metric+' por partido, del más antiguo al más reciente: '+values.map(value=>value===null?'sin dato':number(value)).join('; ');
 return <span className="design-catalog-spark" data-dense={values.length>10} role="img" aria-label={description}>{values.map((value,index)=><i key={index} className={value===null?'is-missing':undefined} title={value===null?'Sin dato':number(value)} style={{height:Math.max(4,(value??0)/max*100)+'%'}}/>)}</span>;
}
export default function CollectionCatalog({players,favorites,following,market,windowSize,settings,onMinimumGames,onOpen,favorite,competition='regular',season}:{competition?:Competition;season?:number;players:Player[];favorites:string[];following:boolean;market:Market|'all';windowSize:number;settings:Settings;onMinimumGames:()=>void;onOpen:(p:Player,m:Market)=>void;favorite:(p:Player,m:Market)=>ReactNode}){
 const {reduced}=useReadingPreferences();
 const {games}=useUpcomingGames();
 const rivals=useMemo(()=>{
  const teams=new Map<string,string>();
  for(const game of games){
   if(!teams.has(game.away))teams.set(game.away,game.home);
   if(!teams.has(game.home))teams.set(game.home,game.away);
  }
  return teams;
 },[games]);
 const [limit,setLimit]=useState(50);
 const [selected,setSelected]=useState<string|null>(null);
 const panel=useRef<HTMLElement>(null);
 const selection=reduced?{...settings,sort:'name',minRate:0,minLine:0,maxLine:Infinity}:settings;
 const available=catalogRows(players,market,{...selection,minGames:1});
 const rows:Row[]=following?players.flatMap(p=>favorites.filter(id=>id.startsWith(p.id+':')).flatMap(id=>{
  const m=id.split(':')[1] as Market;
  return Object.hasOwn(markets,m)&&(market==='all'||m===market)?[{p,m,a:p.catalogStats?.[m]}]:[];
 })):catalogRows(players,market,selection);
 const key=(row:Row)=>row.p.id+':'+row.m;
 const featured=rows.find(row=>key(row)===selected)??rows[0];
 const sample=windowSize?'Últimos '+windowSize+' partidos':'Temporada completa';
 const chartSample=windowSize?'Últimos '+Math.min(windowSize,30):'Últimos 30';
 const mixed=following&&market==='all';
 const metric=mixed?'Estadísticas guardadas':markets[market==='all'?'points':market];
 const filters=[settings.venue==='home'?'De local':settings.venue==='away'?'De visitante':null,
  settings.opponent!=='all'?'Contra '+settings.opponent:null,settings.minMinutes>0?'Mín. '+settings.minMinutes+' min':null].filter(Boolean);
 function select(row:Row){
  setSelected(key(row));
  if(matchMedia('(max-width: 760px)').matches)requestAnimationFrame(()=>panel.current?.scrollIntoView({block:'nearest'}));
 }
 return <section className="design-catalog" aria-label="Catálogo de estadísticas">
  <div className="design-catalog-title"><h2>{following?'Tu seguimiento':'Jugadores de la NBA'}</h2></div>
  <div className="design-catalog-method" aria-label="Cómo leer el explorador">
   <strong>{metric} · {sample}</strong>
   <p>El promedio toma solo los partidos con minutos jugados y datos para esa estadística. {filters.length>0&&<>Filtros de la muestra: {filters.join(' · ')}. </>}Cada barra representa un partido, del más antiguo al más reciente. {!windowSize&&<>El gráfico muestra hasta 30 partidos. </>}La altura de las barras se ajusta para cada jugador.</p>
  </div>
  {rows.length&&featured?<div className="design-catalog-layout">
   <div className="design-catalog-list">
    <div className="design-catalog-row design-catalog-columns" aria-hidden="true"><span>Jugador</span><span>Próximo rival</span><span>Promedio <small>{mixed?'Por partido':metric+' / partido'}</small></span><span>{chartSample}<small>Partidos</small></span><span/></div>
    {rows.slice(0,limit).map(row=>{
     const {p,m,a}=row;
     const team=p.currentTeam??p.team,rival=rivals.get(team);
     return <article key={key(row)} className={'design-catalog-row'+(key(featured)===key(row)?' is-picked':'')}>
      <button type="button" className="design-catalog-identity" aria-pressed={key(featured)===key(row)} onClick={()=>select(row)}>
       <img src={portrait(p)} width={52} height={42} loading="lazy" decoding="async" alt=""/>
       <span><strong>{p.name}</strong><small>{team}{p.position?' · '+p.position:''}</small></span>
      </button>
      <span className="design-catalog-rival">{rival?<><TeamLogo team={rival} size={23}/><span>{rival}</span></>:<span title="Próximo rival sin confirmar">—</span>}</span>
      <span className="design-catalog-average" aria-label={number(a?.average)+' '+markets[m].toLowerCase()+' por partido en '+(a?.n??0)+' partidos con datos'}>
       <strong>{number(a?.average)}</strong><small>{mixed?markets[m]+' · ':''}{a?.n??0} PJ</small>
      </span>
      <Spark values={a?.recent} metric={markets[m]}/>
      <div className="design-catalog-actions">{favorite(p,m)}</div>
     </article>;
    })}
    {rows.length>limit&&<button className="button subtle" onClick={()=>setLimit(value=>value+50)}>Mostrar 50 más</button>}
   </div>
   <aside className="design-catalog-quick card" ref={panel} aria-label="Vista rápida del jugador">
    <img src={portrait(featured.p)} width={260} height={190} alt="" decoding="async"/>
    <div><h3>{featured.p.name}</h3><p>{featured.p.currentTeam??featured.p.team}</p>
     <b className="design-quick-average">{number(featured.a?.average)}</b><p>{markets[featured.m]} por partido · {featured.a?.n??0} PJ</p>
     <small>{chartSample} partidos</small><Spark values={featured.a?.recent} metric={markets[featured.m]}/>
     {!reduced&&<details><summary>Ver referencia y detalle</summary>
      <p>Referencia {number(featured.a?.line)} · {featured.a?.rate==null?'—':Math.round(featured.a.rate*100)+'%'}</p>
      <div className="design-quick-windows">{['5','10','20'].map(window=>{const stat=featured.a?.windows?.[window];return <span key={window}><small>L{window}</small><b>{stat?.rate==null?'—':Math.round(stat.rate*100)+'%'}</b><small>{stat?.n??0} PJ</small></span>;})}</div>
      <CatalogTrend key={[key(featured),season,competition,windowSize,settings.venue,settings.opponent,settings.minMinutes,settings.side].join(':')} a={featured.a} label={markets[featured.m]} side={settings.side} player={featured.p} options={{market:featured.m,last:windowSize,venue:settings.venue,opponent:settings.opponent,minutes:settings.minMinutes,side:settings.side}} competition={competition} season={season}/>
      </details>}
     <button type="button" className="button subtle" onClick={()=>onOpen(featured.p,featured.m)}>Ver ficha completa →</button>
    </div>
   </aside>
  </div>:<div className="empty"><h2>No hay estadísticas con estos filtros</h2>{!following&&available.length>0&&settings.minGames>1?<button className="button subtle" onClick={onMinimumGames}>Ver desde 1 partido</button>:<p>Probá otra selección o ajustá los filtros.</p>}</div>}
 </section>;
}
