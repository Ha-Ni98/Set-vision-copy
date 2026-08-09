import { z } from 'zod';
import { ActivationStat } from '../activation/activation.enums';
import { CardStat } from '../card/card.enums';
import { LotStat } from '../lot/lot.enums';
import { OrderStat } from '../order/order.enums';
import { SetStat } from '../set/set.enums';

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
