import { z } from 'zod';
import { ActivationStat } from '../activation/activation.enums';
import { CardStat } from '../card/card.enums';
import { LotStat } from '../lot/lot.enums';
import { OrderStat } from '../order/order.enums';
import { SetStat } from '../set/set.enums';
import { RevenueDimension, RevenueGranularity } from './statistics.enums';

// Set 11 (D9): this is SUM(activationPrice) — under D9 that is cash OUT (the activator's
// commission), not revenue. Left unrenamed/unredefined on purpose (R6) — see
// Docs/Stage-04-fix/plan/set-11-plan.md §6.4. The Revenue tab's cashIn/cashOut/net fields are
// the correct source for a revenue figure; do not "fix" this field to mean something new.
export const DashboardStatsResponseSchema = z.object({
  activationsToday: z.number().int(),
  totalRevenue: z.number(),
  pendingActivations: z.number().int(),
  activeActivators: z.number().int(),
});
export type DashboardStatsDTO = z.infer<typeof DashboardStatsResponseSchema>;

export const ActivatorsSummaryResponseSchema = z.object({
  totalActivators: z.number().int(),
  onlineNow: z.number().int(),
  totalSuccessful: z.number().int(),
  totalCreditsOwed: z.number(),
});
export type ActivatorsSummaryDTO = z.infer<typeof ActivatorsSummaryResponseSchema>;

export const DistributorsSummaryResponseSchema = z.object({
  totalDistributors: z.number().int(),
  activeWithStock: z.number().int(),
  totalCardsInStock: z.number().int(),
  activationsThisMonth: z.number().int(),
});
export type DistributorsSummaryDTO = z.infer<typeof DistributorsSummaryResponseSchema>;

// Stats with zero items are omitted from the arrays — consumers must treat a missing stat as 0,
// not undefined. Array form avoids Record<Stat,number> + noUncheckedIndexedAccess complexity.
export const InventorySummaryResponseSchema = z.object({
  sets: z.array(z.object({ stat: z.enum(SetStat), count: z.number().int() })),
  lots: z.array(z.object({ stat: z.enum(LotStat), count: z.number().int() })),
  cards: z.array(z.object({ stat: z.enum(CardStat), count: z.number().int() })),
  cardFlags: z.object({
    disabled: z.number().int(),
    revoked: z.number().int(),
  }),
});
export type InventorySummaryDTO = z.infer<typeof InventorySummaryResponseSchema>;

// Set 11 (D9): totalRevenue here is SUM(orderPrice) over ALL orders — no orderStat filter, no
// date anchor. It is close to cash in but unfiltered; the Revenue tab's cashIn is the filtered,
// anchored figure. Left unrenamed/unredefined on purpose (R6). See set-11-plan.md §6.4.
export const OrdersSummaryResponseSchema = z.object({
  totalOrders: z.object({
    all: z.number().int(),
    month: z.number().int(),
    week: z.number().int(),
  }),
  byState: z.array(z.object({ state: z.enum(OrderStat), count: z.number().int() })),
  pendingDelivery: z.number().int(),
  inDelivery: z.number().int(),
  totalRevenue: z.number(),
});
export type OrdersSummaryDTO = z.infer<typeof OrdersSummaryResponseSchema>;

// Set 11 (D9): totalRevenue here is SUM(activationPrice) — cash OUT under D9, same caveat as
// DashboardStatsDTO above. Left unrenamed/unredefined on purpose (R6). See set-11-plan.md §6.4.
export const ActivationsSummaryResponseSchema = z.object({
  total: z.object({
    all: z.number().int(),
    today: z.number().int(),
    week: z.number().int(),
    month: z.number().int(),
  }),
  byState: z.array(z.object({ state: z.enum(ActivationStat), count: z.number().int() })),
  avgDurationSeconds: z.number().int().nullable(),
  totalRevenue: z.number(),
});
export type ActivationsSummaryDTO = z.infer<typeof ActivationsSummaryResponseSchema>;

export const StatisticsOverviewResponseSchema = z.object({
  activationsOverTime: z.array(
    z.object({ date: z.iso.datetime(), count: z.number().int() }),
  ),
  activationsByState: z.array(
    z.object({ state: z.enum(ActivationStat), count: z.number().int() }),
  ),
  topActivators: z.array(
    z.object({
      activatorId: z.uuid(),
      fullName: z.string(),
      count: z.number().int(),
      earned: z.number(),
    }),
  ),
  topDistributors: z.array(
    z.object({
      distributorId: z.uuid(),
      storeName: z.string(),
      count: z.number().int(),
    }),
  ),
  avgTimeTrend: z.array(
    z.object({ date: z.iso.datetime(), avgSeconds: z.number().int() }),
  ),
  // Set 11 (D9): revenue here is SUM(activationPrice) per bucket — cash OUT (activator
  // commissions) under D9, not revenue. Left unrenamed/unredefined on purpose (R6); the chart
  // consuming this field is relabelled "Activator commissions over time" instead. See
  // set-11-plan.md §6.4.
  revenueOverTime: z.array(
    z.object({ date: z.iso.datetime(), revenue: z.number() }),
  ),
});
export type StatisticsOverviewDTO = z.infer<typeof StatisticsOverviewResponseSchema>;

export const WilayaHeatmapResponseSchema = z.array(
  z.object({
    wilayaId: z.uuid(),
    wilayaName: z.string(),
    wilayaCode: z.string(),
    distributorsCount: z.number().int(),
    activationsCount: z.number().int(),
    cancellationsCount: z.number().int(),
    avgActivationTimeSeconds: z.number().int().nullable(),
  }),
);
export type WilayaHeatmapDTO = z.infer<typeof WilayaHeatmapResponseSchema>;

export const WilayaDrilldownResponseSchema = z.object({
  wilayaId: z.uuid(),
  wilayaName: z.string(),
  topDistributors: z.array(
    z.object({
      distributorId: z.uuid(),
      storeName: z.string(),
      activationsCount: z.number().int(),
    }),
  ),
  activationsByPlan: z.array(
    z.object({
      subscriptionPlanId: z.uuid(),
      subscriptionLabel: z.string(),
      count: z.number().int(),
    }),
  ),
  activationsOverTime: z.array(
    z.object({ date: z.iso.datetime(), count: z.number().int() }),
  ),
});
export type WilayaDrilldownDTO = z.infer<typeof WilayaDrilldownResponseSchema>;

// ============================================================
// Set 11 — Revenue dashboard (D9). cashIn / cashOut / net are the ONLY correct revenue figures
// in this module — see the comments on totalRevenue / revenueOverTime above for what the legacy
// fields actually mean. net is always a database-computed column (cashIn - cashOut done in SQL),
// never subtracted client-side or in the mapper.
// ============================================================

export const RevenueTotalsSchema = z.object({
  cashIn: z.number(),
  cashOut: z.number(),
  net: z.number(),
});
export type RevenueTotalsDTO = z.infer<typeof RevenueTotalsSchema>;

export const RevenueSummaryResponseSchema = z.object({
  range: z.object({ from: z.iso.datetime(), to: z.iso.datetime() }),
  current: RevenueTotalsSchema,
  previous: RevenueTotalsSchema,
  cashOutSplit: z.object({
    activationCost: z.number(),
    activationPrice: z.number(),
  }),
  deliveredOrders: z.number().int(),
  completedActivations: z.number().int(),
});
export type RevenueSummaryDTO = z.infer<typeof RevenueSummaryResponseSchema>;

export const RevenueSeriesResponseSchema = z.object({
  granularity: z.enum(RevenueGranularity),
  // Zero-filled server-side: every bucket in [from, to] is present, missing ones are 0. Never a hole.
  points: z.array(
    z.object({
      bucketStart: z.iso.datetime(),
      cashIn: z.number(),
      cashOut: z.number(),
      net: z.number(),
    }),
  ),
});
export type RevenueSeriesDTO = z.infer<typeof RevenueSeriesResponseSchema>;

export const RevenueBreakdownRowSchema = z.object({
  // z.string(), NOT z.uuid() — REVENUE_UNATTRIBUTED_KEY is a valid value here.
  key: z.string(),
  label: z.string(),
  cashIn: z.number(),
  cashOut: z.number(),
  net: z.number(),
});

export const RevenueBreakdownResponseSchema = z.object({
  dimension: z.enum(RevenueDimension),
  rows: z.array(RevenueBreakdownRowSchema),
  others: RevenueTotalsSchema,
  totals: RevenueTotalsSchema,
});
export type RevenueBreakdownDTO = z.infer<typeof RevenueBreakdownResponseSchema>;
