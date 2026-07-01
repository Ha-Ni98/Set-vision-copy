import type { StatisticsPeriod } from '@my-app/contract';

// Africa/Algiers = UTC+1, no DST
const ALGIERS_OFFSET_MS = 60 * 60 * 1000;

function nowInAlgiers(): Date {
  return new Date(Date.now() + ALGIERS_OFFSET_MS);
}

function algiersToUTC(d: Date): Date {
  return new Date(d.getTime() - ALGIERS_OFFSET_MS);
}

export function todayStart(): Date {
  const a = nowInAlgiers();
  return algiersToUTC(new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate())));
}

export function weekStart(): Date {
  const a = nowInAlgiers();
  const diff = (a.getUTCDay() + 6) % 7; // days since Monday (Mon=0)
  return algiersToUTC(new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate() - diff)));
}

export function monthStart(): Date {
  const a = nowInAlgiers();
  return algiersToUTC(new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), 1)));
}

export function yearStart(): Date {
  const a = nowInAlgiers();
  return algiersToUTC(new Date(Date.UTC(a.getUTCFullYear(), 0, 1)));
}

export type PeriodBounds = { from: Date; to: Date; bucket: 'day' | 'week' };

export function resolvePeriod(
  period: StatisticsPeriod,
  dateFrom?: string,
  dateTo?: string,
): PeriodBounds {
  const now = new Date();

  switch (period) {
    case 'today':
      return { from: todayStart(), to: now, bucket: 'day' };
    case 'this_week':
      return { from: weekStart(), to: now, bucket: 'day' };
    case 'this_month':
      return { from: monthStart(), to: now, bucket: 'day' };
    case 'last_30d':
      return { from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), to: now, bucket: 'day' };
    case 'last_90d':
      return { from: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), to: now, bucket: 'week' };
    case 'this_year':
      return { from: yearStart(), to: now, bucket: 'week' };
    case 'custom': {
      const from = dateFrom ? new Date(dateFrom) : todayStart();
      const to = dateTo ? new Date(dateTo) : now;
      const spanDays = (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);
      return { from, to, bucket: spanDays <= 30 ? 'day' : 'week' };
    }
  }
}
