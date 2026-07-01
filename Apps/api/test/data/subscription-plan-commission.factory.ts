import type { CommissionDuration, SubscriptionPlanCommission } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';

export const seedCommissionDuration = async (
  prisma: PrismaClient,
  overrides: {
    key?: string;
    label?: string;
    nbMinuteMin?: number;
    nbMinuteMax?: number | null;
  } = {},
): Promise<CommissionDuration> => {
  const key = overrides.key ?? `tier_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  return prisma.commissionDuration.create({
    data: {
      key,
      label: overrides.label ?? `Tier ${key}`,
      nbMinuteMin: overrides.nbMinuteMin ?? 0,
      nbMinuteMax: overrides.nbMinuteMax !== undefined ? overrides.nbMinuteMax : 60,
    },
  });
};

export const seedCommissionCell = async (
  prisma: PrismaClient,
  subscriptionPlanId: string,
  commissionDurationId: string,
  commission = 0.5,
): Promise<SubscriptionPlanCommission> => {
  return prisma.subscriptionPlanCommission.upsert({
    where: { subscriptionPlanId_commissionDurationId: { subscriptionPlanId, commissionDurationId } },
    update: { commission },
    create: { subscriptionPlanId, commissionDurationId, commission },
  });
};
