import { describe, it, expect, vi, afterEach } from 'vitest';
import { todayStart, weekStart, monthStart, yearStart, resolvePeriod } from '../../../../src/modules/statistics/statistics.time';

// Algiers = UTC+1, no DST
const OFFSET_MS = 60 * 60 * 1000;

afterEach(() => {
  vi.useRealTimers();
});

// Fix clock to 2026-03-10 14:30:00 UTC = 2026-03-10 15:30:00 Algiers (Tuesday)
function fixClock(utcIso: string) {
  vi.useFakeTimers({ now: new Date(utcIso).getTime() });
}

describe('todayStart', () => {
  it('returns start of today in Algiers time expressed as UTC', () => {
    // 2026-03-10 14:30 UTC = 2026-03-10 15:30 Algiers → today-start Algiers = 2026-03-10 00:00 = 2026-03-09 23:00 UTC
    fixClock('2026-03-10T14:30:00.000Z');
    const start = todayStart();
    expect(start.toISOString()).toBe('2026-03-09T23:00:00.000Z');
  });

  it('midnight edge: 00:30 UTC is still yesterday in Algiers (23:30 prev day = same Algiers day)', () => {
    // 2026-03-10 00:30 UTC = 2026-03-10 01:30 Algiers → today Algiers = 2026-03-10 → start = 2026-03-09 23:00 UTC
    fixClock('2026-03-10T00:30:00.000Z');
    const start = todayStart();
    expect(start.toISOString()).toBe('2026-03-09T23:00:00.000Z');
  });

  it('23:30 UTC is next day in Algiers (00:30 next day Algiers)', () => {
    // 2026-03-10 23:30 UTC = 2026-03-11 00:30 Algiers → today Algiers = 2026-03-11 → start = 2026-03-10 23:00 UTC
    fixClock('2026-03-10T23:30:00.000Z');
    const start = todayStart();
    expect(start.toISOString()).toBe('2026-03-10T23:00:00.000Z');
  });
});

describe('weekStart', () => {
  it('returns start of current Monday in Algiers time', () => {
    // 2026-03-10 14:30 UTC = Tuesday in Algiers → Monday = 2026-03-09 → start = 2026-03-08 23:00 UTC
    fixClock('2026-03-10T14:30:00.000Z');
    const start = weekStart();
    expect(start.toISOString()).toBe('2026-03-08T23:00:00.000Z');
  });

  it('Monday itself starts on its own Monday', () => {
    // 2026-03-09 14:30 UTC = 2026-03-09 15:30 Algiers = Monday → Monday start = 2026-03-09 00:00 Algiers = 2026-03-08 23:00 UTC
    fixClock('2026-03-09T14:30:00.000Z');
    const start = weekStart();
    expect(start.toISOString()).toBe('2026-03-08T23:00:00.000Z');
  });

  it('Sunday returns previous Monday (6 days back)', () => {
    // 2026-03-15 14:30 UTC = Sunday Algiers → Monday = 2026-03-09 → start = 2026-03-08 23:00 UTC
    fixClock('2026-03-15T14:30:00.000Z');
    const start = weekStart();
    expect(start.toISOString()).toBe('2026-03-08T23:00:00.000Z');
  });
});

describe('monthStart', () => {
  it('returns first day of current month in Algiers time', () => {
    // March 2026 → first day = 2026-03-01 00:00 Algiers = 2026-02-28 23:00 UTC
    fixClock('2026-03-10T14:30:00.000Z');
    const start = monthStart();
    expect(start.toISOString()).toBe('2026-02-28T23:00:00.000Z');
  });

  it('first day of month before 01:00 Algiers is still correct', () => {
    // 2026-03-01 00:30 UTC = 2026-03-01 01:30 Algiers → month start = 2026-03-01 00:00 Algiers = 2026-02-28 23:00 UTC
    fixClock('2026-03-01T00:30:00.000Z');
    const start = monthStart();
    expect(start.toISOString()).toBe('2026-02-28T23:00:00.000Z');
  });
});

describe('yearStart', () => {
  it('returns Jan 1 of current year in Algiers time', () => {
    fixClock('2026-03-10T14:30:00.000Z');
    const start = yearStart();
    // 2026-01-01 00:00 Algiers = 2025-12-31 23:00 UTC
    expect(start.toISOString()).toBe('2025-12-31T23:00:00.000Z');
  });
});

describe('resolvePeriod', () => {
  it('today → bucket=day, from=todayStart', () => {
    fixClock('2026-03-10T14:30:00.000Z');
    const { from, bucket } = resolvePeriod('today');
    expect(bucket).toBe('day');
    expect(from.toISOString()).toBe('2026-03-09T23:00:00.000Z');
  });

  it('this_week → bucket=day', () => {
    fixClock('2026-03-10T14:30:00.000Z');
    const { bucket } = resolvePeriod('this_week');
    expect(bucket).toBe('day');
  });

  it('this_month → bucket=day', () => {
    fixClock('2026-03-10T14:30:00.000Z');
    const { bucket } = resolvePeriod('this_month');
    expect(bucket).toBe('day');
  });

  it('last_30d → bucket=day, from=30 days ago', () => {
    fixClock('2026-03-10T14:30:00.000Z');
    const { from, to, bucket } = resolvePeriod('last_30d');
    expect(bucket).toBe('day');
    const spanDays = (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);
    expect(Math.round(spanDays)).toBe(30);
  });

  it('last_90d → bucket=week', () => {
    fixClock('2026-03-10T14:30:00.000Z');
    const { bucket } = resolvePeriod('last_90d');
    expect(bucket).toBe('week');
  });

  it('this_year → bucket=week', () => {
    fixClock('2026-03-10T14:30:00.000Z');
    const { bucket } = resolvePeriod('this_year');
    expect(bucket).toBe('week');
  });

  it('custom with span ≤ 30 days → bucket=day', () => {
    const { bucket } = resolvePeriod('custom', '2026-03-01T00:00:00.000Z', '2026-03-20T00:00:00.000Z');
    expect(bucket).toBe('day');
  });

  it('custom with span > 30 days → bucket=week', () => {
    const { bucket } = resolvePeriod('custom', '2026-01-01T00:00:00.000Z', '2026-03-10T00:00:00.000Z');
    expect(bucket).toBe('week');
  });

  it('custom uses provided dateFrom and dateTo', () => {
    const { from, to } = resolvePeriod('custom', '2026-01-01T00:00:00.000Z', '2026-01-15T00:00:00.000Z');
    expect(from.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(to.toISOString()).toBe('2026-01-15T00:00:00.000Z');
  });
});
