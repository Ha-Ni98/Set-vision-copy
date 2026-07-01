import { describe, it, expect } from 'vitest';
import { buildPaginationMeta, toSkipTake } from '@common/http/pagination';

describe('buildPaginationMeta', () => {
  it('computes totalPages correctly', () => {
    expect(buildPaginationMeta(1, 10, 25).totalPages).toBe(3);
    expect(buildPaginationMeta(1, 10, 10).totalPages).toBe(1);
    expect(buildPaginationMeta(1, 10, 11).totalPages).toBe(2);
  });

  it('returns totalPages 0 when total is 0', () => {
    const meta = buildPaginationMeta(1, 10, 0);
    expect(meta.totalPages).toBe(0);
    expect(meta.total).toBe(0);
  });

  it('passes through page, limit, total unchanged', () => {
    const meta = buildPaginationMeta(3, 20, 100);
    expect(meta.page).toBe(3);
    expect(meta.limit).toBe(20);
    expect(meta.total).toBe(100);
  });
});

describe('toSkipTake', () => {
  it('computes skip and take from page/limit', () => {
    expect(toSkipTake({ page: 1, limit: 10 })).toEqual({ skip: 0, take: 10 });
    expect(toSkipTake({ page: 2, limit: 10 })).toEqual({ skip: 10, take: 10 });
    expect(toSkipTake({ page: 3, limit: 5 })).toEqual({ skip: 10, take: 5 });
  });
});
