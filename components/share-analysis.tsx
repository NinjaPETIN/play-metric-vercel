'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Share2 } from 'lucide-react';
import { markets, summarizeGames, type Game, type Market } from '../lib/analytics';
import type { Competition } from '../lib/competitions';
import type { CardFormat } from '../lib/performance-card';
import { drawAnalysisCard, drawDefenseCard } from '../lib/analysis-card';
import type { DefenseRank } from '../lib/team-defense';
import { teamNames } from '../lib/team-overview';
import { loadCachedData } from '../lib/client-data-cache';
import type {Calendar} from '../lib/nba-snapshot';
import {reportPath} from '../lib/report-context';
import {referenceLabel,type AnalysisReference} from '../lib/market-reference';
import {useReadingPreferences} from './reading-preferences';
import ShareCardDialog from './share-card-dialog';

type Props = {
 reference:AnalysisReference; name: string; playerId: string; team: string; teamCode?: string; games: Game[]; market: Market;
 line: number; side: 'over' | 'under'; season: number; competition: string; competitionKey: Competition;
 windowGames?:Game[];excluded?:string[];sampleKeys?:string[];contextRival?:string;initialRival?: string; position?: string; filters: string;
};

export default function ShareAnalysis(props: Props) {
 const {reduced}=useReadingPreferences();
 const [path, setPath] = useState('');
 const [open, setOpen] = useState(false);

 return <>
  <button className="button subtle" type="button" aria-haspopup="dialog" disabled={!props.games.length} onClick={() => {
   const query=new URL(reportPath(window.location.pathname+window.location.search),'https://statlane.invalid').searchParams;query.set('season',String(props.season));query.set('competition',props.competitionKey);query.set('stat',props.market);query.set('line',String(props.line));query.set('side',props.side);query.set('snapshot','1');if(props.sampleKeys?.length)query.set('sample',props.sampleKeys.join(','));if(props.contextRival&&props.contextRival!=='all')query.set('contextRival',props.contextRival);setPath(window.location.pathname+'?'+query);
   setOpen(true);
  }}><Share2 size={16}/> Compartir análisis</button>
  {open && <AnalysisDialog props={props} reduced={reduced} path={path} onClose={() => setOpen(false)}/>}
 </>;
}

function AnalysisDialog({ props, reduced, path, onClose }: { props: Props; reduced: boolean; path: string; onClose: () => void }) {
 const [rival, setRival] = useState(props.initialRival ?? '');
 const rivalChosen=useRef(false);
 const [view, setView] = useState<'analysis' | 'defense'>('analysis');
 const [response, setResponse] = useState<{ teams: Record<string, DefenseRank[]> } | null>(null);
 const [failed, setFailed] = useState(false);
 const { name, playerId, games, market, line, side, season, competitionKey, teamCode } = props;
 const needsDefense = !reduced && Boolean(rival);
 useEffect(()=>{
  if(props.initialRival||!teamCode||reduced)return;
  let active=true;
  void loadCachedData<Calendar>('/api/nba/calendar').then(calendar=>{
   const game=calendar.games.filter(g=>g.status===1&&(g.home===teamCode||g.away===teamCode)&&g.competition===competitionKey&&g.startsAt&&Date.parse(g.startsAt)>Date.now()-600_000).sort((a,b)=>a.startsAt!.localeCompare(b.startsAt!))[0];
   if(active&&game&&!rivalChosen.current)setRival(game.home===teamCode?game.away:game.home);
  }).catch(()=>{});
  return()=>{active=false;};
 },[props.initialRival,teamCode,competitionKey,reduced]);
 useEffect(() => {
  if (!needsDefense) return;
  let active = true;
  const query = new URLSearchParams({ season: String(season), competition: competitionKey });
  void loadCachedData<{teams: Record<string, DefenseRank[]>}>('/api/nba/team-defense?' + query)
   .then(data => { if (active) { setResponse(data); setFailed(false); } })
   .catch(() => { if (active) setFailed(true); });
  return () => { active = false; };
 }, [season, competitionKey, needsDefense]);

 const rows = response?.teams[rival];
 const rivalName = teamNames[rival] ?? rival;
 const draw = useCallback((canvas: HTMLCanvasElement, format: CardFormat, light: boolean, images: Record<string, HTMLImageElement | undefined>) => {
  if (!reduced && view === 'defense') drawDefenseCard(canvas, format, light, props, rivalName, rival, rows ?? [], images);
  else drawAnalysisCard(canvas, format, light, props, images, reduced ? '' : rival, reduced ? [] : rows ?? [], reduced);
 }, [props, rival, rivalName, rows, view, reduced]);
 const stats = summarizeGames(games, market, line, side);
 const reference = (side === 'over' ? 'Más de ' : 'Menos de ') + line.toLocaleString('es-AR');
 const text = reduced ? [name + ' · ' + markets[market], 'Promedio: ' + (stats.average?.toLocaleString('es-AR', {maximumFractionDigits: 1}) ?? '—') + ' · ' + stats.n + ' partidos'].join('\n') : view === 'defense'
  ? [name + ' vs. ' + rivalName + ' · Defensa del rival', ...(rows ?? []).map(row => markets[row.metric] + ': ' + row.rank + '.º de ' + row.teams)].join('\n')
  : [name + ' · ' + markets[market], reference,referenceLabel(props.reference),...(props.reference.kind==='market'?['Cuota decimal '+props.reference.price.toLocaleString('es-AR',{maximumFractionDigits:2})+' · Actualizada '+new Date(props.reference.updatedAt).toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires'})+' ARG']:[]), stats.hits + '/' + stats.n + ' cumplen la referencia en esta muestra.',props.filters].join('\n');

 const sharedUrl=new URL(path,'https://statlane.invalid');if(rival)sharedUrl.searchParams.set('contextRival',rival);else sharedUrl.searchParams.delete('contextRival');const sharedPath=sharedUrl.pathname+sharedUrl.search;
 const recentOpponents = reduced ? [] : [...new Set(games.filter(game=>game.played && game.minutes > 0).slice(0,10).map(game=>game.opponent))];
 return <ShareCardDialog title="Compartir análisis" triggerLabel={'Análisis de ' + name} text={text} path={sharedPath} initialFormat={reduced?'square':'vertical'}
  filename={'statlane-' + (!reduced && view === 'defense' ? 'defensa-' + rival.toLowerCase() : 'analisis-' + market) + '-' + playerId}
  assets={{ portrait: '/api/nba/headshot/' + playerId + '?size=large', team: teamCode ? '/api/nba/team-logo/' + teamCode : '', rival: rival ? '/api/nba/team-logo/' + rival : '',
   ...Object.fromEntries(recentOpponents.map(code=>[code,'/api/nba/team-logo/'+code])) }}
  controls={!reduced&&<div className="sl-share-setting">
   <label>Rival del cruce <select value={rival} onChange={event => {
    rivalChosen.current=true;
    setRival(event.target.value);
    setView('analysis');
   }}><option value="">Elegir rival</option>{Object.entries(teamNames).filter(([code]) => code !== teamCode).sort((a,b) => a[1].localeCompare(b[1])).map(([code, title]) => <option key={code} value={code}>{title}</option>)}</select></label>
   <div className="segmented" role="group" aria-label="Tipo de tarjeta">
    <button type="button" className={view === 'analysis' ? 'selected' : ''} aria-pressed={view === 'analysis'} onClick={() => setView('analysis')}>Tendencia</button>
    <button type="button" className={view === 'defense' ? 'selected' : ''} aria-pressed={view === 'defense'} disabled={!rows?.length} onClick={() => setView('defense')}>Defensa del rival</button>
   </div>
   {rival && !rows?.length && <span role="status">{failed || response ? 'Ranking defensivo no disponible para este cruce.' : 'Consultando defensa del rival…'}</span>}
  </div>}
  draw={draw} onClose={onClose}/>;
}
