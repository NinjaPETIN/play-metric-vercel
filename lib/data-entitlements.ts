import { publicCatalog } from './public-access';
import { expandDashboard } from './compact-dashboard';
import { basicPlayer } from './account-plan';
import type { CatalogOptions } from './catalog-summary';

export function isRecord(value: unknown): value is Record<string, unknown> {
 return typeof value === 'object' && value !== null;
}

export function dashboardPayload(value: unknown) {
 if (!isRecord(value) || !Array.isArray(value.players)) return null;
 return { ...value, players: value.players as unknown[] };
}

// Authorization is applied after reading the shared raw-data cache.
export function entitledDashboard(data: unknown, { individual, example, pro, catalog }: {
 individual: boolean; example: boolean; pro: boolean; catalog?: CatalogOptions;
}): unknown {
 const dashboard = dashboardPayload(data);
 if (!dashboard) return data;
 if (!individual && !example && !pro) return publicCatalog(expandDashboard(dashboard), catalog);
 return { ...dashboard, players: dashboard.players.map(player => isRecord(player) ? basicPlayer(player, pro && individual) : player) };
}
