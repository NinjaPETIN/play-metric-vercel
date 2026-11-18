import { summarizeGames, type Game, type Market } from './analytics';
export function contextSamples(games: Game[], market: Market, line: number, side: 'over' | 'under', limit: number, opponent = 'all', minMinutes = 0) {
    const eligible = games.filter(g => g.played && g.minutes > 0 && g.minutes >= minMinutes && (opponent === 'all' || g.opponent === opponent)).sort((a, b) => b.date.localeCompare(a.date));
    const take = (rows: Game[]) => limit ? rows.slice(0, limit) : rows;
    return [
        { label: 'Local', games: take(eligible.filter(g => g.home)) },
        { label: 'Visitante', games: take(eligible.filter(g => !g.home)) },
        { label: 'Últimos 5', games: eligible.slice(0, 5) },
        { label: 'Últimos 10', games: eligible.slice(0, 10) },
        { label: 'Últimos 20', games: eligible.slice(0, 20) },
    ].map(row => ({ ...row, ...summarizeGames(row.games, market, line, side) }));
}
