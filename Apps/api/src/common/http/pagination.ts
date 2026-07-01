import type { PaginationMeta } from '@my-app/contract';

export const buildPaginationMeta = (
  page: number,
  limit: number,
  total: number,
): PaginationMeta => ({
  page,
  limit,
  total,
  totalPages: total === 0 ? 0 : Math.ceil(total / limit),
});

export const toSkipTake = (query: { page: number; limit: number }): { skip: number; take: number } => ({
  skip: (query.page - 1) * query.limit,
  take: query.limit,
});
