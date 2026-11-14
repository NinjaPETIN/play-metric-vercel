'use client';

import { useCallback, useState } from 'react';
import { Share2 } from 'lucide-react';
import { markets, summarizeGames, type Game, type Market } from '../lib/analytics';
import type { CardFormat } from '../lib/performance-card';
import { drawAnalysisCard } from '../lib/analysis-card';
import ShareCardDialog from './share-card-dialog';

type Props = {
 name: string; playerId: string; team: string; teamCode?: string; games: Game[]; market: Market;
 line: number; side: 'over' | 'under'; season: number; competition: string; filters: string;
};

export default function ShareAnalysis(props: Props) {
 const [open, setOpen] = useState(false);
 const [path, setPath] = useState('');
 const { name, playerId, games, market, line, side } = props;
 const draw = useCallback((canvas: HTMLCanvasElement, format: CardFormat, light: boolean, images: Record<string, HTMLImageElement | undefined>) => {
  drawAnalysisCard(canvas, format, light, props, images.portrait);
 }, [props]);
 const stats = open ? summarizeGames(games, market, line, side) : null;
 const reference = (side === 'over' ? 'Más de ' : 'Menos de ') + line.toLocaleString('es-AR');

 return <>
  <button className="button subtle" type="button" aria-haspopup="dialog" disabled={!games.length} onClick={() => {
   setPath(window.location.pathname + window.location.search);
   setOpen(true);
  }}><Share2 size={16}/> Compartir análisis</button>
  {open && <ShareCardDialog title="Compartir análisis" triggerLabel={'Análisis de ' + name}
   text={[name + ' · ' + markets[market], reference, stats?.hits + '/' + stats?.n + ' cumplen la referencia en esta muestra.'].join('\n')}
   path={path} filename={'statlane-analisis-' + playerId + '-' + market}
   assets={{ portrait: '/api/nba/headshot/' + playerId }} draw={draw} onClose={() => setOpen(false)}/>}
 </>;
}
