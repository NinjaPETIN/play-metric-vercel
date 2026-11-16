'use client';

import { useCallback, useEffect, useState } from 'react';
import { Share2 } from 'lucide-react';
import { markets, summarizeGames, type Game, type Market } from '../lib/analytics';
import type { Competition } from '../lib/competitions';
import type { CardFormat } from '../lib/performance-card';
import { drawAnalysisCard, drawDefenseCard } from '../lib/analysis-card';
import type { DefenseRank } from '../lib/team-defense';
import { teamNames } from '../lib/team-overview';
import { loadCachedData } from '../lib/client-data-cache';
import {useReadingPreferences} from './reading-preferences';
import ShareCardDialog from './share-card-dialog';

type Props = {
 name: string; playerId: string; team: string; teamCode?: string; games: Game[]; market: Market;
 line: number; side: 'over' | 'under'; season: number; competition: string; competitionKey: Competition;
 initialRival?: string; position?: string; filters: string;
};

export default function ShareAnalysis(props: Props) {
 const {reduced}=useReadingPreferences();
 const [path, setPath] = useState('');
 const [open, setOpen] = useState(false);
 if(reduced)return null;
 return <>
  <button className="button subtle" type="button" aria-haspopup="dialog" disabled={!props.games.length} onClick={() => {
   setPath(window.location.pathname + window.location.search);
   setOpen(true);
  }}><Share2 size={16}/> Compartir análisis</button>
  {open && <AnalysisDialog props={props} path={path} onClose={() => setOpen(false)}/>}
 </>;
}

function AnalysisDialog({ props, path, onClose }: { props: Props; path: string; onClose: () => void }) {
 const [rival, setRival] = useState(props.initialRival ?? '');
 const [view, setView] = useState<'analysis' | 'defense'>('analysis');
 const [response, setResponse] = useState<{ teams: Record<string, DefenseRank[]> } | null>(null);
 const [failed, setFailed] = useState(false);
 const { name, playerId, games, market, line, side, season, competitionKey, teamCode } = props;
 const needsDefense = Boolean(rival);
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
  if (view === 'defense') drawDefenseCard(canvas, format, light, props, rivalName, rival, rows ?? [], images);
  else drawAnalysisCard(canvas, format, light, props, images, rival, rows ?? []);
 }, [props, rival, rivalName, rows, view]);
 const stats = summarizeGames(games, market, line, side);
 const reference = (side === 'over' ? 'Más de ' : 'Menos de ') + line.toLocaleString('es-AR');
 const text = view === 'defense'
  ? [name + ' vs. ' + rivalName + ' · Defensa del rival', ...(rows ?? []).map(row => markets[row.metric] + ': ' + row.rank + '.º de ' + row.teams)].join('\n')
  : [name + ' · ' + markets[market], reference, stats.hits + '/' + stats.n + ' cumplen la referencia en esta muestra.'].join('\n');

 return <ShareCardDialog title="Compartir análisis" triggerLabel={'Análisis de ' + name} text={text} path={path}
  filename={'statlane-' + (view === 'defense' ? 'defensa-' + rival.toLowerCase() : 'analisis-' + market) + '-' + playerId}
  assets={{ portrait: '/api/nba/headshot/' + playerId, team: teamCode ? '/api/nba/team-logo/' + teamCode : '', rival: rival ? '/api/nba/team-logo/' + rival : '' }}
  controls={<div className="sl-share-setting">
   <label>Rival del cruce <select value={rival} onChange={event => {
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
