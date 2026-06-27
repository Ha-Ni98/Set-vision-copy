import { z } from 'zod';

// Closed set — 'custom' activates dateFrom/dateTo on the backend
export const StatisticsPeriodSchema = z.enum([
  'today',
  'this_week',
  'this_month',
  'last_30d',
  'last_90d',
  'this_year',
  'custom',
]);
export type StatisticsPeriod = z.infer<typeof StatisticsPeriodSchema>;

export const StatisticsOverviewQuerySchema = z.object({
  period: StatisticsPeriodSchema,
  dateFrom: z.iso.datetime().optional(),
  dateTo: z.iso.datetime().optional(),
  subscriptionPlanId: z.uuid().optional(),
  wilayaId: z.uuid().optional(),
});
export type StatisticsOverviewQuery = z.infer<typeof StatisticsOverviewQuerySchema>;

export const WilayaHeatmapQuerySchema = z.object({
  period: StatisticsPeriodSchema.optional(),
  subscriptionPlanId: z.uuid().optional(),
});
export type WilayaHeatmapQuery = z.infer<typeof WilayaHeatmapQuerySchema>;

// WilayaIdParamsSchema for the :wilayaId path segment is imported directly from geography
// by the backend route handler — not duplicated here.
export const WilayaDrilldownQuerySchema = z.object({
  period: StatisticsPeriodSchema.optional(),
});
export type WilayaDrilldownQuery = z.infer<typeof WilayaDrilldownQuerySchema>;
