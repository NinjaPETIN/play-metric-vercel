'use client';

import {useEffect, useState, useSyncExternalStore} from 'react';
import {markets, type Market} from '../lib/analytics';
import {boxFeedSchema, type BoxData, type BoxFeed} from '../lib/live-boxscore';
import {courtKnown} from '../lib/boxscore-display';
import {nbaPlayerId} from '../lib/player-identity';
import {LIVE_POLL_MS} from '../lib/live-refresh';
import type {LineSide} from '../lib/nba-explorer';
import type {ScheduledGame} from './calendar-panel';

type Line = {playerId:string; name:string; market:Market; side:LineSide; line:number};
const storageEvent = 'statlane:match-lines';
const storeKey = (matchId:string) => 'statlane:match-lines:' + matchId;
const label = (side:LineSide) => side === 'over' ? 'Más de' : 'Menos de';
const number = new Intl.NumberFormat('es-AR',{maximumFractionDigits:2});
const key = (line:Line) => [line.playerId,line.market,line.side,line.line].join(':');
const empty = () => '[]';
function subscribe(callback:()=>void) {
  window.addEventListener(storageEvent,callback);
  window.addEventListener('storage',callback);
  return () => {
    window.removeEventListener(storageEvent,callback);
    window.removeEventListener('storage',callback);
  };
}

type BoxPlayer = BoxData['teams'][number]['players'][number];
function liveValue(player:BoxPlayer,market:Market):number|null {
  if (player.didNotPlay) return null;
  const combinations = {pa:['points','assists'],pr:['points','rebounds'],ra:['rebounds','assists'],pra:['points','rebounds','assists'],sb:['steals','blocks']} as const;
  if (market in combinations) {
    const stats = combinations[market as keyof typeof combinations].map(field => player[field]);
    return stats.some(v => v === null) ? null : stats.reduce<number>((sum,v) => sum+(v??0),0);
  }
  if (market === 'threes' || market === 'threeAttempts' || market.startsWith('fieldGoals') || market.startsWith('freeThrows')) {
    const raw = market.startsWith('fieldGoals') ? player.fieldGoals : market.startsWith('freeThrows') ? player.freeThrows : player.threes;
    const pair = /^(\d+)[-/](\d+)$/.exec(raw ?? '');
    return pair ? Number(pair[market.endsWith('Attempted') || market === 'threeAttempts' ? 2 : 1]) : null;
  }
  const raw = player[market as keyof BoxPlayer];
  return typeof raw === 'number' ? raw : null;
}

export default function ExplorerLineTracker({match,initial,selection,identities,onLive}:{
  match:ScheduledGame; initial:BoxFeed|null; selection:Line|null; identities:Array<{id:string;name:string}>; onLive:()=>void;
}) {
  const snapshot = useSyncExternalStore(subscribe,() => {
    try {return localStorage.getItem(storeKey(match.id)) ?? '[]';} catch {return '[]';}
  },empty);
  let saved:Line[] = [];
  try {const parsed = JSON.parse(snapshot); if (Array.isArray(parsed)) saved = parsed;} catch {}
  const [storageError,setStorageError] = useState(false);
  const [feed,setFeed] = useState(initial);
  const [now,setNow] = useState(0);
  const finished = feed?.data?.game.state === 'final';
  const startsAt = Date.parse(match.startsAt ?? '');

  useEffect(() => {
    if (finished) return;
    let active = true;
    let request:AbortController|undefined;
    async function refresh() {
      if (request || document.hidden) return;
      const checkedAt = Date.now();
      if (match.status === 1 && (!Number.isFinite(startsAt) || checkedAt < startsAt)) return;
      setNow(checkedAt);
      const controller = new AbortController();
      request = controller;
      const timeout = setTimeout(() => controller.abort(),15_000);
      try {
        const response = await fetch('/api/nba/live/' + match.id,{signal:controller.signal,cache:'no-store'});
        if (!response.ok) return;
        const result = boxFeedSchema.parse(await response.json());
        if (active && result.data?.game.nbaId === match.id) setFeed(result);
      } catch {} finally {clearTimeout(timeout);request = undefined;}
    }
    void refresh();
    const timer = setInterval(refresh,LIVE_POLL_MS);
    document.addEventListener('visibilitychange',refresh);
    return () => {active=false;request?.abort();clearInterval(timer);document.removeEventListener('visibilitychange',refresh);};
  },[match.id,match.status,startsAt,finished]);

  function save(lines:Line[]) {
    try {
      localStorage.setItem(storeKey(match.id),JSON.stringify(lines));
      window.dispatchEvent(new Event(storageEvent));
      setStorageError(false);
    } catch {setStorageError(true);}
  }

  const data = feed?.data?.game.nbaId === match.id ? feed.data : null;
  const age = feed?.fetchedAt && now ? now - Date.parse(feed.fetchedAt) : Infinity;
  const fresh = feed?.status === 'ready' && age >= -5000 && age < 90_000;
  const people = new Map(data?.teams.flatMap(team => team.players.flatMap(person => {
    const id = nbaPlayerId(person.name,identities);
    return id ? [[id,{team,person}] as const] : [];
  })));
  const picked = selection && people.get(selection.playerId);
  const active = selection && saved.some(item => key(item) === key(selection));
  return <section className="card sl-explorer-tracker" aria-label="Seguimiento de líneas">
    <div className="sl-tracker-header"><div><h3>Seguimiento de líneas</h3><small>Guardadas para este partido en este navegador</small></div>
      {selection&&<button className="button subtle" type="button" aria-pressed={!!active} disabled={!active&&saved.length>=12}
        onClick={() => save(active ? saved.filter(item => key(item)!==key(selection)) : [...saved,selection])}>
        {active ? 'Quitar línea actual' : 'Guardar línea actual'}
      </button>}
    </div>
    {!!saved.length&&<button className="sl-tracker-game" type="button" onClick={onLive}>Ver el partido ↗</button>}
    {storageError&&<p role="status">No pudimos guardar el cambio en este navegador.</p>}
    {selection&&<p>{selection.name} · {picked && (data?.game.state === 'final' || (data?.game.state==='live'&&fresh)) && !picked.person.didNotPlay ?
      picked.person.starter ? 'Titular' : 'Suplente' : 'Titularidad sin confirmar'}</p>}
    {saved.map(item => {
      const row = people.get(item.playerId);
      const stat = row ? liveValue(row.person,item.market) : null;
      const onCourt = row && data && courtKnown(row.team,data.game.state,!fresh) && !/entretiempo|descanso|fin del/i.test(data.game.detail) ?
        row.person.onCourt ? ' · En cancha' : ' · En el banco' : '';
      const confirmed = data?.game.state === 'final' || fresh;
      const status = stat === null ? 'Sin estadística confirmada' :
        `${number.format(stat)} · ${data?.game.detail ?? ''}${onCourt}${confirmed ? '' : ' · Última lectura'}`;
      return <div className="sl-tracker-row" key={key(item)}>
        <div><b>{item.name} · {markets[item.market]}</b><small>{label(item.side)} {number.format(item.line)} · {status}</small></div>
        <button className="button subtle" type="button" aria-label={'Quitar línea de '+item.name} onClick={() => save(saved.filter(line => key(line)!==key(item)))}>Quitar</button>
      </div>;
    })}
  </section>;
}
