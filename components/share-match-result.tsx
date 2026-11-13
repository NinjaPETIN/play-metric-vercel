'use client';

import { useCallback, useState } from 'react';
import { Share2 } from 'lucide-react';
import type { BoxData } from '../lib/live-boxscore';
import { drawSocialCard, matchCardLink, matchLeaders, type CardFormat } from '../lib/performance-card';
import { teamLogoUrl } from '../lib/team-logo-url';
import ShareCardDialog from './share-card-dialog';

export default function ShareMatchResult({ data }: { data: BoxData }) {
 const [open, setOpen] = useState(false);
 const draw = useCallback((canvas: HTMLCanvasElement, format: CardFormat, light: boolean, images: Record<string, HTMLImageElement | undefined>) => {
  drawSocialCard(canvas, format, light, { kind: 'result', data }, images);
 }, [data]);
 const score = data.teams.map(team => team.name + ' ' + team.score).join(' - ');
 const title = 'Compartir resultado';
 const highlights = open ? matchLeaders(data).flatMap((player, index) => player ? [data.teams[index].code + ' · ' + player.name + ' · ' + player.points + ' PTS'] : []) : [];

 return <div className="match-share-result">
  <button type="button" className="button subtle" aria-haspopup="dialog" onClick={() => setOpen(true)}><Share2 size={17}/> {title}</button>
  {open && <ShareCardDialog title={title} triggerLabel={'Tarjeta de resultado de ' + score}
   text={['Final NBA · ' + score, ...highlights].join('\n')}
   path={matchCardLink(data.game)} filename={'statlane-' + (data.game.nbaId ?? data.game.id) + '-final'}
   assets={Object.fromEntries(data.teams.map(team => [team.code, teamLogoUrl(team.code)]))}
   draw={draw} onClose={() => setOpen(false)}/>}
 </div>;
}
