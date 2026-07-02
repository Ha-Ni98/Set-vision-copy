import {
  SubscriptionPlanResponseSchema,
  CommissionDurationResponseSchema,
  CommissionMatrixResponseSchema,
  CommissionCellResponseSchema,
  SubscriptionType,
  SubscriptionDuration,
  type SubscriptionPlanDTO,
  type CommissionDurationDTO,
  type CommissionMatrixDTO,
  type CommissionCellDTO,
} from "@my-app/contract";

// Reuses the subscriptionPlanId already referenced by sets/lots/cards fixtures so
// cross-domain assertions stay consistent.
export const mockSubscriptionPlan: SubscriptionPlanDTO = SubscriptionPlanResponseSchema.parse({
  id: "81000000-0000-4000-8000-000000000001",
  subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
  subscriptionDuration: SubscriptionDuration.ONE_MONTH,
  label: "Snapchat+ — 1 Month",
  isActive: true,
});

export const mockSubscriptionPlanInactive: SubscriptionPlanDTO =
  SubscriptionPlanResponseSchema.parse({
    id: "81000000-0000-4000-8000-000000000002",
    subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
    subscriptionDuration: SubscriptionDuration.ONE_WEEK,
    label: "Snapchat+ — 1 Week",
    isActive: false,
  });

export const mockSubscriptionPlans: SubscriptionPlanDTO[] = [
  mockSubscriptionPlan,
  mockSubscriptionPlanInactive,
];

export const mockCommissionDurationShort: CommissionDurationDTO =
  CommissionDurationResponseSchema.parse({
    id: "82000000-0000-4000-8000-000000000001",
    key: "SHORT",
    label: "0-30 min",
    nbMinuteMin: 0,
    nbMinuteMax: 30,
  });

// nbMinuteMax is the DTO's only nullable field — an open-ended top tier.
export const mockCommissionDurationUnlimited: CommissionDurationDTO =
  CommissionDurationResponseSchema.parse({
    id: "82000000-0000-4000-8000-000000000002",
    key: "UNLIMITED",
    label: "30+ min",
    nbMinuteMin: 30,
    nbMinuteMax: null,
  });

export const mockCommissionDurations: CommissionDurationDTO[] = [
  mockCommissionDurationShort,
  mockCommissionDurationUnlimited,
];

// A cell is null where no commission rate has been configured yet for that plan/duration
// pair — the matrix reaches the hook with the gap intact, not defaulted to 0.
export const mockCommissionMatrix: CommissionMatrixDTO = CommissionMatrixResponseSchema.parse({
  tiers: mockCommissionDurations,
  rows: [
    {
      planId: mockSubscriptionPlan.id,
      planLabel: mockSubscriptionPlan.label,
      cells: [
        { commissionDurationId: mockCommissionDurationShort.id, commission: 50 },
        { commissionDurationId: mockCommissionDurationUnlimited.id, commission: null },
      ],
    },
  ],
});

export const mockCommissionCell: CommissionCellDTO = CommissionCellResponseSchema.parse({
  subscriptionPlanId: mockSubscriptionPlan.id,
  commissionDurationId: mockCommissionDurationShort.id,
  commission: 75,
});
