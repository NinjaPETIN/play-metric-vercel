import type {DailyTrendRow} from './daily-trends';
export const dailyPercent = (sample: DailyTrendRow['form']) => sample.rate === null ? '—' : Math.round(sample.rate * 100) + '%';
export const dailyNumber = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });
export const dailyDate = (day: string) => new Date(day + 'T12:00:00Z').toLocaleDateString('es-AR', {day:'numeric',month:'long',timeZone:'UTC'});
