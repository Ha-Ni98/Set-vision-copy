import { z } from 'zod';
import { RevenueGranularity, RevenueDimension, RevenueSort } from './statistics.enums';

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

// Range + filters shared by all three revenue endpoints. Same shape as
// StatisticsOverviewQuerySchema's period/date/plan/wilaya fields, so one filter bar drives both
// the Overview and Revenue tabs.
const revenueRangeShape = {
  period: StatisticsPeriodSchema,
  dateFrom: z.iso.datetime().optional(),
  dateTo: z.iso.datetime().optional(),
  subscriptionPlanId: z.uuid().optional(),
  wilayaId: z.uuid().optional(),
};

export const RevenueSummaryQuerySchema = z.object({ ...revenueRangeShape });
export type RevenueSummaryQuery = z.infer<typeof RevenueSummaryQuerySchema>;

export const RevenueSeriesQuerySchema = z.object({
  ...revenueRangeShape,
  granularity: z.enum(RevenueGranularity).default(RevenueGranularity.DAY),
});
export type RevenueSeriesQuery = z.infer<typeof RevenueSeriesQuerySchema>;

export const RevenueBreakdownQuerySchema = z.object({
  ...revenueRangeShape,
  dimension: z.enum(RevenueDimension),
  sort: z.enum(RevenueSort).default(RevenueSort.CASH_IN),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
export type RevenueBreakdownQuery = z.infer<typeof RevenueBreakdownQuerySchema>;
