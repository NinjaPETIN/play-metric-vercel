'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { loadCachedData } from '../lib/client-data-cache';
import { normalizeSearch } from '../lib/player-search';
import type { Player } from '../lib/data';
import type { Calendar } from '../lib/nba-snapshot';
import type { MatchAvailability } from '../lib/match-availability';
import type { MarketLine, MarketLines } from '../lib/market-lines';
import { markets, type Market } from '../lib/analytics';
import { useReadingPreferences } from './reading-preferences';
import TeamLogo from './team-logo';
const marketKeys: Record<string, string> = { points: 'player_points', rebounds: 'player_rebounds', assists: 'player_assists', threes: 'player_threes' };
const time = new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export default function PlayerNextGame({ player, market, onUseLine }: {
    player: Player;
    market: Market;
    onUseLine?:(offer:MarketLine)=>void;
}) {
    const [calendar, setCalendar] = useState<Calendar | null>(null), [failed, setFailed] = useState(false), [availability, setAvailability] = useState<MatchAvailability | null>(null), [lines, setLines] = useState<MarketLines | null>(null), [showLines, setShowLines] = useState(false), [enabled, setEnabled] = useState(false), [frequency, setFrequency] = useState(15), [notice, setNotice] = useState('');
    const [retry,setRetry]=useState(0),[lineFailed,setLineFailed]=useState(false);
    const { reduced, now } = useReadingPreferences();
    const baseline = useRef<{
        scope: string;
        status: string | null;
        line: string | null;
    } | null>(null), lastNotice = useRef(0);
    const preferenceKey = 'statlane:player-alerts:' + player.id;
    useEffect(() => { let active = true; queueMicrotask(() => { if (!active)
        return; try {
        const raw = JSON.parse(localStorage.getItem(preferenceKey) ?? 'null');
        if (raw) {
            setEnabled(raw.enabled === true);
            if ([5, 15, 60].includes(raw.frequency))
                setFrequency(raw.frequency);
        }
    }
    catch { } }); return () => { active = false; }; }, [preferenceKey]);
    function preferences(next: boolean, minutes: number) { setEnabled(next); setFrequency(minutes); try {
        localStorage.setItem(preferenceKey, JSON.stringify({ enabled: next, frequency: minutes }));
    }
    catch {
        setNotice('No se pudo recordar esta preferencia.');
    } }
    useEffect(() => { let active = true; loadCachedData<Calendar>('/api/nba/calendar',retry>0).then(data => { if (active) {
        setCalendar(data);
        setFailed(false);
    } }).catch(() => { if (active)
        setFailed(true); }); return () => { active = false; }; }, [player.id,retry]);
    const team = player.currentTeam;
    const game = calendar?.games.filter(g => g.status === 1 && !!team && (g.home === team || g.away === team) && g.startsAt && Date.parse(g.startsAt) > now - 600000).sort((a, b) => (a.startsAt ?? '').localeCompare(b.startsAt ?? ''))[0];
    const gameId = game?.id;
    useEffect(() => {
        if (!gameId)
            return;
        let active = true, busy = false;
        async function refresh() {
            if (document.hidden || busy)
                return;
            busy = true;
            try {
                const [feed, odds] = await Promise.all([loadCachedData<{
                        data: MatchAvailability | null;
                    }>('/api/nba/availability/' + gameId), showLines && !reduced ? loadCachedData<MarketLines>('/api/nba/market-lines/' + gameId,retry>0).catch(() => null) : Promise.resolve(null)]);
                if (!active)
                    return;
                setAvailability(feed.data);
                if(odds)setLines(odds);setLineFailed(showLines&&!reduced&&!odds);
                const status = feed.data && !feed.data.dataStale ? (feed.data.teams.find(t => t.code === team)?.injuries?.find(p => normalizeSearch(p.name) === normalizeSearch(player.name))?.status ?? null) : null;
                const prices = odds?.state === 'ready' && !odds.dataStale ? odds.lines.filter(r => normalizeSearch(r.player) === normalizeSearch(player.name) && r.market === marketKeys[market]).map(r => r.book + ':' + r.side + ':' + r.line).sort().join('|') : null;
                const scope = gameId + ':' + market, previous = baseline.current;
                if (enabled && !reduced && previous?.scope === scope && Date.now() - lastNotice.current >= frequency * 60000) {
                    const changes = [];
                    if (status && previous.status && status !== previous.status)
                        changes.push('Disponibilidad: ' + status);
                    if (prices && previous.line && prices !== previous.line)
                        changes.push('Cambió una línea de mercado');
                    if (changes.length) {
                        setNotice(changes.join(' · '));
                        lastNotice.current = Date.now();
                    }
                }
                baseline.current = { scope, status: status ?? (previous?.scope === scope ? previous.status : null), line: prices ?? (previous?.scope === scope ? previous.line : null) };
            }
            catch { }
            finally {
                busy = false;
            }
        }
        void refresh();
        const timer = setInterval(() => void refresh(), 60000);
        document.addEventListener('visibilitychange', refresh);
        return () => { active = false; clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
    }, [gameId, team, player.name, market, showLines, enabled, frequency, reduced,retry]);
    const injury = availability?.teams.find(t => t.code === team)?.injuries?.find(p => normalizeSearch(p.name) === normalizeSearch(player.name));
    const rival = game ? (game.home === team ? game.away : game.home) : null;
    const offers = lines?.lines.filter(r => normalizeSearch(r.player) === normalizeSearch(player.name) && r.market === marketKeys[market]) ?? [];
    const recent = player.games.filter(g => g.played && g.minutes > 0).slice(0, 5), minutes = recent.length ? recent.reduce((sum, g) => sum + g.minutes, 0) / recent.length : null;
    return <section className="card ux-next-game"><small className="eyebrow">PRÓXIMO PARTIDO</small><h3>{rival ? <><TeamLogo team={rival} size={27}/>{game?.home === team ? 'vs.' : '@'} {rival}</> : 'Previa del jugador'}</h3>{game ? <><p><time dateTime={game.startsAt!}>{time.format(new Date(game.startsAt!))} ARG</time></p><div className="ux-preview-facts"><div><small>Disponibilidad</small><strong>{injury?.status ?? 'Sin estado individual publicado'}</strong></div><div><small>Minutos recientes · {recent.length} PJ</small><strong>{minutes === null ? '—' : minutes.toLocaleString('es-AR', { maximumFractionDigits: 1 }) + ' min'}</strong></div></div><Link className="button subtle" href={'/partidos/' + game.id + '?matchTab=live&liveSection=preview'}>Ver previa y alineaciones →</Link>{!reduced && <details onToggle={e => setShowLines(e.currentTarget.open)}><summary>{markets[market]} · Líneas de mercado</summary>{showLines && <>{offers.length ? <ul className="ux-offers">{offers.slice(0, 8).map(r => <li key={r.book + r.side + r.line}><span>{r.book}<small>{r.side === 'Over' ? 'Más de' : 'Menos de'} {r.line}</small></span><div><b>Cuota {r.price.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</b>{onUseLine&&r.line<=200&&<button type="button" className="button subtle" onClick={()=>onUseLine(r)}>Usar {r.side==='Over'?'más de':'menos de'} {r.line}</button>}</div></li>)}</ul> : <p>{lineFailed ? 'No pudimos actualizar las líneas.' : !lines ? 'Consultando…' : lines.state === 'unconfigured' ? 'Las líneas estarán disponibles próximamente.' : 'Sin líneas publicadas para esta selección.'}</p>}<small>Elegí una línea para compararla con el historial del jugador.</small>{lineFailed&&<button className="button subtle" type="button" onClick={()=>setRetry(n=>n+1)}>Reintentar</button>}</>}</details>}{!reduced && <details className="ux-alert-controls"><summary>Avisos de cambios</summary><label><input type="checkbox" checked={enabled} onChange={e => preferences(e.target.checked, frequency)}/> Avisarme en esta ficha</label><label>Frecuencia máxima<select value={frequency} onChange={e => preferences(enabled, Number(e.target.value))}>{[5, 15, 60].map(n => <option key={n} value={n}>Un aviso cada {n} minutos</option>)}</select></label><p>Recibí avisos en esta ficha sobre cambios de disponibilidad y líneas.</p></details>}</> : <p role="status">{failed ? 'No pudimos consultar el calendario.' : !calendar ? 'Consultando próximo partido…' : !team ? 'Equipo actual sin confirmar.' : 'Sin próximo partido publicado.'}{failed&&<button className="button subtle" type="button" onClick={()=>setRetry(n=>n+1)}>Reintentar</button>}</p>}{notice && <div className="ux-change-notice" role="status">{notice}<button type="button" className="icon" aria-label="Cerrar aviso" onClick={() => setNotice('')}>×</button></div>}</section>;
}

