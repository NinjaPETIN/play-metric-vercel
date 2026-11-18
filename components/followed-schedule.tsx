'use client';
import Link from 'next/link';
import type { Player } from '../lib/data';
import type { Calendar } from '../lib/nba-snapshot';
import { playerPath } from '../lib/player-path';
import { FollowButton } from './watchlist-provider';
import Portrait from './match-player-portrait';
export default function FollowedSchedule({ players, keys, calendar, now }: {
    players: Player[];
    keys: string[];
    calendar: Calendar | null;
    now: number;
}) {
    const groups = new Map<string, {
        label: string;
        rows: Array<{
            key: string;
            player?: Player;
            game?: Calendar['games'][number];
        }>;
    }>();
    for (const key of keys) {
        const player = players.find(p => 'nba:' + p.id === key), team = player?.currentTeam;
        const game = team ? calendar?.games.filter(g => (g.home === team || g.away === team) && g.status !== 3 && g.startsAt && Date.parse(g.startsAt) > now - 86400000).sort((a, b) => (a.startsAt ?? '').localeCompare(b.startsAt ?? ''))[0] : undefined;
        const day = game?.startsAt ? new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: 'numeric', month: 'long' }).format(new Date(game.startsAt)) : 'Sin próximo partido confirmado';
        const group = groups.get(day) ?? { label: day, rows: [] };
        group.rows.push({ key, player, game });
        groups.set(day, group);
    }
    return <div>{[...groups].map(([key, group]) => <section className="ux-followed-day" key={key}><h4>{group.label}</h4><div className="sl-inline-saved">{group.rows.map(({ key, player, game }) => <div key={key}>{player && <Portrait person={player}/>}<span>{player ? <Link href={playerPath(player)}>{player.name}</Link> : 'Jugador guardado'}{game ? <Link className="ux-followed-match" href={'/partidos/' + game.id}>{game.away} vs. {game.home} · {game.status === 2 ? 'En vivo' : new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit' }).format(new Date(game.startsAt!)) + ' ARG'}</Link> : <small>{player?.currentTeam ?? 'Equipo sin confirmar'}</small>}{player && <Link className="ux-followed-match" href={playerPath(player)}>Ver análisis y mis notas →</Link>}</span><FollowButton item={key} name={player?.name ?? 'jugador'}/></div>)}</div></section>)}</div>;
}
