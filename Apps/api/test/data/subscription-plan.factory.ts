import { faker } from '@faker-js/faker';
import { SubscriptionType, SubscriptionDuration } from '@my-app/contract';
import type { SubscriptionPlan } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';

export const subscriptionPlanEntity = (overrides: Partial<SubscriptionPlan> = {}): SubscriptionPlan => ({
  id: faker.string.uuid(),
  subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
  subscriptionDuration: SubscriptionDuration.ONE_MONTH,
  isActive: true,
  ...overrides,
});

export const seedPlan = async (
  prisma: PrismaClient,
  overrides: {
    subscriptionType?: SubscriptionType;
    subscriptionDuration?: SubscriptionDuration;
    isActive?: boolean;
  } = {},
): Promise<SubscriptionPlan> => {
  const type = overrides.subscriptionType ?? SubscriptionType.SNAPCHAT_PLUS;
  const duration = overrides.subscriptionDuration ?? SubscriptionDuration.ONE_MONTH;

  return prisma.subscriptionPlan.upsert({
    where: {
      subscriptionType_subscriptionDuration: { subscriptionType: type, subscriptionDuration: duration },
    },
    update: { isActive: overrides.isActive ?? true },
    create: {
      subscriptionType: type,
      subscriptionDuration: duration,
      isActive: overrides.isActive ?? true,
    },
  });
};
