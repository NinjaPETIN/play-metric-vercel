'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {argentinaDay} from '../../lib/arena-schedule';
import {calendarWithLive} from '../../lib/calendar-live';
import {loadCachedData} from '../../lib/client-data-cache';
import type {Calendar} from '../../lib/nba-snapshot';
import {orderScoreboardGames} from '../../lib/scoreboard-order';
import {useLiveScores} from '../../lib/use-live-scores';
import TeamLogo from '../team-logo';
import styles from './public-landing.module.css';

const timeZone = 'America/Argentina/Buenos_Aires';
const timeFormat = new Intl.DateTimeFormat('es-AR', {timeZone, hour: '2-digit', minute: '2-digit'});

export default function LandingGames() {
  const [calendar, setCalendar] = useState<Calendar|null>(null);
  const [loading, setLoading] = useState(true);
  const live = useLiveScores();

  useEffect(() => {
    let active = true;
    loadCachedData<Calendar>('/api/nba/calendar').then(data => {
      if (active) setCalendar(data);
    }).catch(() => {}).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const day = live.now ? argentinaDay(new Date(live.now).toISOString()) : '';
  const games = orderScoreboardGames(calendarWithLive(calendar, live.feed, live.now, live.failed)
    .filter(game => (game.startsAt ? argentinaDay(game.startsAt) : game.date) === day ||
      game.live?.state === 'live' && !game.live.stale)).slice(0, 3);

  return <section className={styles.jornada} aria-labelledby="landing-jornada">
    <header><h2 id="landing-jornada">Jornada NBA</h2><Link href="/?view=calendar">Ver jornada →</Link></header>
    {games.length ? <div className={styles.games}>{games.map(game => {
      const status = game.status === 2 ? 'En vivo' : game.status === 3 ? 'Final' : 'Por jugar';
      const detail = game.status === 2 && game.live && !game.live.stale ? game.live.detail :
        game.status === 1 && game.startsAt ? timeFormat.format(new Date(game.startsAt)) + ' ARG' : null;
      return <a key={game.id} className={styles.game} href={'/partidos/' + game.id + '?matchTab=live'} aria-label={game.awayName + ' vs. ' + game.homeName + ' · ' + status}>
        <div className={styles.gameMeta}><span data-live={game.status === 2}>{status}</span>{detail && <small>{detail}</small>}</div>
        <div className={styles.gameScore}>
          <span><TeamLogo team={game.away} size={38}/>{game.away}</span>
          <strong>{game.status !== 1 && game.awayScore !== null && game.homeScore !== null ? game.awayScore + ' - ' + game.homeScore : '–'}</strong>
          <span>{game.home}<TeamLogo team={game.home} size={38}/></span>
        </div>
      </a>;
    })}</div> : <p className={styles.scheduleMessage}>{loading || !day ? 'Cargando la jornada…' : calendar ? 'No hay partidos programados para hoy.' : 'La jornada no está disponible en este momento.'}</p>}
  </section>;
}
