import {markets, type Market} from './analytics';
import {normalizeSearch} from './player-search';

export const explorerWindows = [5, 10, 20] as const;
export type ExplorerWindow = typeof explorerWindows[number];
export const isExplorerWindow = (value: number): value is ExplorerWindow =>
  explorerWindows.some(window => window === value);

const marketAliases = new Map<string, Market>();
for (const [key, label] of Object.entries(markets)) {
  marketAliases.set(normalizeSearch(key), key as Market);
  marketAliases.set(normalizeSearch(label), key as Market);
}
for (const [alias, market] of Object.entries({pts:'points', reb:'rebounds', ast:'assists', '3p':'threes'} as const)) {
  marketAliases.set(alias, market);
}

export function parseNbaSearch(query: string) {
  const [name, ...parts] = query.split(',');
  const criteria: {market?: Market; last?: ExplorerWindow} = {};
  if (!parts.length) return {name, criteria};
  for (const part of parts) {
    const token = normalizeSearch(part.trim());
    if (!token) continue;
    const market = marketAliases.get(token);
    const windowMatch = /^(?:(?:ultimos?|l)\s*)?(5|10|20)(?:\s+(?:partidos|pj))?$/.exec(token);
    if (market) criteria.market = market;
    else if (windowMatch && isExplorerWindow(Number(windowMatch[1]))) criteria.last = Number(windowMatch[1]) as ExplorerWindow;
    else return {name:query, criteria:{} as typeof criteria};
  }
  return {name, criteria};
}

export function lineResults(values: readonly (number | null)[], line: number) {
  let hits = 0, pushes = 0, n = 0, total = 0;
  for (const value of values) {
    if (value === null) continue;
    n++;
    total += value;
    if (value > line) hits++;
    if (value === line) pushes++;
  }
  return {hits, pushes, n, average:n ? total / n : null, rate:n ? hits / n : 0};
}
