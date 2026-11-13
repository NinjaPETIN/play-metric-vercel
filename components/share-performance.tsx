'use client';

import { useCallback, useState } from 'react';
import { Share2 } from 'lucide-react';
import type { BoxData } from '../lib/live-boxscore';
import { nbaPlayerId } from '../lib/player-identity';
import { drawSocialCard, matchCardLink, type CardFormat, type CardPlayer } from '../lib/performance-card';
import ShareCardDialog from './share-card-dialog';

export default function SharePerformance({ person, team, data }: { person: CardPlayer; team: string; data: BoxData }) {
 const [open, setOpen] = useState(false);
 const { game } = data;
 const id = open ? nbaPlayerId(person.name) : null;
 const draw = useCallback((canvas: HTMLCanvasElement, format: CardFormat, light: boolean, images: Record<string, HTMLImageElement | undefined>) => {
  drawSocialCard(canvas, format, light, { kind: 'player', player: person, team, game }, images);
 }, [person, team, game]);
 const title = 'Compartir actuación';
 const label = title + ' de ' + person.name;
 const score = game.away + ' ' + (game.awayScore ?? '—') + ' - ' + (game.homeScore ?? '—') + ' ' + game.home;
 const stats = person.didNotPlay ? 'No participó' : (person.points ?? '—') + ' PTS · ' + (person.rebounds ?? '—') + ' REB · ' + (person.assists ?? '—') + ' AST';
 const base = matchCardLink(game);

 return <>
  <button type="button" className="icon sl-share-trigger" title={title} aria-label={label} aria-haspopup="dialog" onClick={() => setOpen(true)}><Share2 size={19}/></button>
  {open && <ShareCardDialog title={title} triggerLabel={'Tarjeta de ' + person.name} text={person.name + ' · ' + team + '\n' + stats + '\n' + score + ' · ' + (game.state === 'final' ? 'Final' : game.detail)}
   path={base ? base + '&liveSection=stats&player=' + person.id : null}
   filename={'statlane-' + person.name.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}
   assets={{ portrait: id ? '/api/nba/headshot/' + id : '', [team]: '/api/nba/team-logo/' + team }}
   draw={draw} onClose={() => setOpen(false)}/>}
 </>;
}
