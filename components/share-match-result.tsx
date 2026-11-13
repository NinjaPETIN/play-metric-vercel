'use client';

import { useCallback, useState } from 'react';
import { Share2 } from 'lucide-react';
import type { BoxData } from '../lib/live-boxscore';
import { nbaPlayerId } from '../lib/player-identity';
import { drawSocialCard, matchCardLink, matchLeaders, type CardFormat } from '../lib/performance-card';
import ShareCardDialog from './share-card-dialog';

export default function ShareMatchResult({ data }: { data: BoxData }) {
 const [open, setOpen] = useState(false);
 const draw = useCallback((canvas: HTMLCanvasElement, format: CardFormat, light: boolean, images: Record<string, HTMLImageElement | undefined>) => {
  drawSocialCard(canvas, format, light, { kind: 'result', data }, images);
 }, [data]);
 const score = data.teams.map(team => team.name + ' ' + team.score).join(' - ');
 const title = 'Compartir resultado';
 const leaders = open ? matchLeaders(data) : [];
 const highlights = leaders.flatMap((player, index) => player ? [data.teams[index].code + ' · ' + player.name + ' · ' + player.points + ' PTS'] : []);

 const assets = Object.fromEntries(data.teams.map(team => [team.code, '/api/nba/team-logo/' + team.code]));
 leaders.forEach((player, index) => {
  const id = player && nbaPlayerId(player.name);
  if (id) assets['leader-' + data.teams[index].code] = '/api/nba/headshot/' + id;
 });

 return <div className="match-share-result">
  <button type="button" className="button subtle" aria-haspopup="dialog" onClick={() => setOpen(true)}><Share2 size={17}/> {title}</button>
  {open && <ShareCardDialog title={title} triggerLabel={'Tarjeta de resultado de ' + score}
   text={['Final NBA · ' + score, ...highlights].join('\n')}
   path={matchCardLink(data.game)} filename={'statlane-' + (data.game.nbaId ?? data.game.id) + '-final'}
   assets={assets}
   draw={draw} onClose={() => setOpen(false)}/>}
 </div>;
}
