import {
  ActivatorResponseSchema,
  ActivatorDetailResponseSchema,
  ActivatorWithCredentialsResponseSchema,
  ActivatorGeneratedPasswordResponseSchema,
  ActivatorPerformanceResponseSchema,
  ActivatorDashboardResponseSchema,
  PaginatedActivatorsSchema,
  type ActivatorDTO,
  type ActivatorDetailDTO,
  type ActivatorWithCredentialsDTO,
  type ActivatorGeneratedPasswordDTO,
  type ActivatorPerformanceDTO,
  type ActivatorDashboardDTO,
  type PaginatedActivators,
} from "@my-app/contract";

export const mockActivator: ActivatorDTO = ActivatorResponseSchema.parse({
  id: "c1000000-0000-4000-8000-000000000001",
  userId: "c2000000-0000-4000-8000-000000000001",
  fullName: "Amine Belkacem",
  username: "amine.b",
  phone: "0555111222",
  isEnabled: true,
  totalEarning: 12500.5,
  credits: 300,
  nbOfActivation: 84,
  nbOfSuccessfulActivation: 80,
  avgActivationTimeSeconds: 340,
  lastLoginAt: "2026-07-01T08:00:00.000Z",
  createdAt: "2026-01-15T09:00:00.000Z",
});

export const mockActivatorNoAvgTime: ActivatorDTO = ActivatorResponseSchema.parse({
  ...mockActivator,
  id: "c1000000-0000-4000-8000-000000000002",
  avgActivationTimeSeconds: null,
  nbOfActivation: 0,
  nbOfSuccessfulActivation: 0,
});

export const mockActivatorDetail: ActivatorDetailDTO = ActivatorDetailResponseSchema.parse({
  ...mockActivator,
  totalPaid: 10000,
  creditsOwed: 2500.5,
  successRate: 0.95,
});

export const mockActivatorWithCredentials: ActivatorWithCredentialsDTO =
  ActivatorWithCredentialsResponseSchema.parse({
    activator: mockActivator,
    generatedPassword: "Tmp-8f3ak2Lm",
  });

export const mockActivatorGeneratedPassword: ActivatorGeneratedPasswordDTO =
  ActivatorGeneratedPasswordResponseSchema.parse({
    generatedPassword: "Tmp-9x2bq7Rn",
  });

export const mockActivatorPerformance: ActivatorPerformanceDTO =
  ActivatorPerformanceResponseSchema.parse({
    series: [
      { date: "2026-06-30T00:00:00.000Z", count: 12, earned: 600 },
      { date: "2026-07-01T00:00:00.000Z", count: 9, earned: 450 },
    ],
  });

export const mockActivatorDashboard: ActivatorDashboardDTO = ActivatorDashboardResponseSchema.parse(
  {
    totalEarnings: 12500.5,
    earningsTrendPercent: 8.3,
    creditsBalance: 300,
    totalActivations: 84,
    activationsToday: 6,
    avgActivationTimeSeconds: 340,
    activeSlotsUsed: 2,
    weekly: [
      { date: "2026-06-26T00:00:00.000Z", count: 10 },
      { date: "2026-06-27T00:00:00.000Z", count: 14 },
    ],
  },
);

export const mockActivatorDashboardEmptyWeekly: ActivatorDashboardDTO =
  ActivatorDashboardResponseSchema.parse({
    ...mockActivatorDashboard,
    weekly: [],
  });

export const mockPaginatedActivators: PaginatedActivators = PaginatedActivatorsSchema.parse({
  items: [mockActivator, mockActivatorNoAvgTime],
  meta: { page: 1, limit: 10, total: 2, totalPages: 1 },
});
