import {
  DashboardStatsResponseSchema,
  ActivatorsSummaryResponseSchema,
  DistributorsSummaryResponseSchema,
  InventorySummaryResponseSchema,
  OrdersSummaryResponseSchema,
  ActivationsSummaryResponseSchema,
  StatisticsOverviewResponseSchema,
  WilayaHeatmapResponseSchema,
  WilayaDrilldownResponseSchema,
  SetStat,
  LotStat,
  CardStat,
  OrderStat,
  ActivationStat,
  type DashboardStatsDTO,
  type ActivatorsSummaryDTO,
  type DistributorsSummaryDTO,
  type InventorySummaryDTO,
  type OrdersSummaryDTO,
  type ActivationsSummaryDTO,
  type StatisticsOverviewDTO,
  type WilayaHeatmapDTO,
  type WilayaDrilldownDTO,
} from "@my-app/contract";

export const mockDashboardStats: DashboardStatsDTO = DashboardStatsResponseSchema.parse({
  activationsToday: 42,
  totalRevenue: 125000,
  pendingActivations: 7,
  activeActivators: 15,
});

export const mockActivatorsSummary: ActivatorsSummaryDTO = ActivatorsSummaryResponseSchema.parse({
  totalActivators: 30,
  onlineNow: 12,
  totalSuccessful: 980,
  totalCreditsOwed: 45000,
});

export const mockDistributorsSummary: DistributorsSummaryDTO =
  DistributorsSummaryResponseSchema.parse({
    totalDistributors: 50,
    activeWithStock: 38,
    totalCardsInStock: 1200,
    activationsThisMonth: 640,
  });

// Zero-count stats (e.g. SetStat.NOT_PRINTED, CardStat.ACTIVATION_FAILED) are omitted from
// the arrays entirely — consumers must treat a missing stat as 0, not undefined.
export const mockInventorySummary: InventorySummaryDTO = InventorySummaryResponseSchema.parse({
  sets: [
    { stat: SetStat.PENDING_PRINTING, count: 3 },
    { stat: SetStat.PRINTED, count: 20 },
  ],
  lots: [
    { stat: LotStat.PENDING, count: 4 },
    { stat: LotStat.DELIVERED, count: 18 },
  ],
  cards: [
    { stat: CardStat.AT_DISTRIBUTOR, count: 900 },
    { stat: CardStat.IN_LOT, count: 150 },
  ],
  cardFlags: { disabled: 5, revoked: 2 },
});

export const mockOrdersSummary: OrdersSummaryDTO = OrdersSummaryResponseSchema.parse({
  totalOrders: { all: 300, month: 40, week: 10 },
  byState: [
    { state: OrderStat.PENDING_DELIVERY, count: 5 },
    { state: OrderStat.DELIVERED, count: 280 },
  ],
  pendingDelivery: 5,
  inDelivery: 3,
  totalRevenue: 890000,
});

export const mockActivationsSummary: ActivationsSummaryDTO = ActivationsSummaryResponseSchema.parse(
  {
    total: { all: 5000, today: 42, week: 300, month: 1200 },
    byState: [
      { state: ActivationStat.ACTIVATED, count: 4600 },
      { state: ActivationStat.PENDING, count: 7 },
    ],
    avgDurationSeconds: 185,
    totalRevenue: 250000,
  },
);

export const mockStatisticsOverview: StatisticsOverviewDTO = StatisticsOverviewResponseSchema.parse(
  {
    activationsOverTime: [
      { date: "2026-06-01T00:00:00.000Z", count: 40 },
      { date: "2026-06-02T00:00:00.000Z", count: 55 },
    ],
    activationsByState: [
      { state: ActivationStat.ACTIVATED, count: 90 },
      { state: ActivationStat.PENDING, count: 5 },
    ],
    topActivators: [
      {
        activatorId: "c1000000-0000-4000-8000-000000000001",
        fullName: "Ali Belkacem",
        count: 120,
        earned: 6000,
      },
    ],
    topDistributors: [
      {
        distributorId: "f3000000-0000-4000-8000-000000000001",
        storeName: "Store Alger Centre",
        count: 80,
      },
    ],
    avgTimeTrend: [{ date: "2026-06-01T00:00:00.000Z", avgSeconds: 190 }],
    revenueOverTime: [{ date: "2026-06-01T00:00:00.000Z", revenue: 12000 }],
  },
);

export const mockWilayaHeatmap: WilayaHeatmapDTO = WilayaHeatmapResponseSchema.parse([
  {
    wilayaId: "f1000000-0000-4000-8000-000000000001",
    wilayaName: "Alger",
    distributorsCount: 12,
    activationsCount: 400,
    cancellationsCount: 8,
    avgActivationTimeSeconds: 180,
  },
  // avgActivationTimeSeconds is the DTO's only nullable field — no activations recorded yet.
  {
    wilayaId: "f1000000-0000-4000-8000-000000000002",
    wilayaName: "Oran",
    distributorsCount: 3,
    activationsCount: 0,
    cancellationsCount: 0,
    avgActivationTimeSeconds: null,
  },
]);

export const mockWilayaDrilldown: WilayaDrilldownDTO = WilayaDrilldownResponseSchema.parse({
  wilayaId: "f1000000-0000-4000-8000-000000000001",
  wilayaName: "Alger",
  topDistributors: [
    {
      distributorId: "f3000000-0000-4000-8000-000000000001",
      storeName: "Store Alger Centre",
      activationsCount: 80,
    },
  ],
  activationsByPlan: [
    {
      subscriptionPlanId: "81000000-0000-4000-8000-000000000001",
      subscriptionLabel: "Snapchat+ — 1 Month",
      count: 60,
    },
  ],
  activationsOverTime: [{ date: "2026-06-01T00:00:00.000Z", count: 20 }],
});
