import { z } from 'zod';
import type { ErrorCode } from './errors';

// Generic API response envelope (type-only by design, discriminated on `success`)
export type ApiResponse<T = null> =
  | { success: true; data: T; message?: string }
  | { success: false; error: { code: ErrorCode; message: string; details?: unknown } };

export const PaginationMetaSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

// Factory: build a runtime-validated paginated schema from any item schema
export const paginated = <T extends z.ZodTypeAny>(item: T) =>
  z.object({ items: z.array(item), meta: PaginationMetaSchema });

export type PaginatedResult<T> = { items: T[]; meta: PaginationMeta };
