import { faker } from '@faker-js/faker';
import { SetStat, SubscriptionType, SubscriptionDuration } from '@my-app/contract';
import type { Set, SubscriptionPlan } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { seedPlan } from './subscription-plan.factory';
import { generateSetNumber } from '@modules/set/set.util';

export const setEntity = (overrides: Partial<Set> = {}): Set => ({
  id: faker.string.uuid(),
  setNumber: generateSetNumber(),
  subscriptionPlanId: faker.string.uuid(),
  numberOfKeys: 10,
  setStat: SetStat.NOT_PRINTED,
  createdAt: new Date('2024-01-15T10:00:00.000Z'),
  printedAt: null,
  ...overrides,
});

export interface SeededSet {
  set: Set;
  plan: SubscriptionPlan;
}

export const seedSet = async (
  prisma: PrismaClient,
  overrides: {
    numberOfKeys?: number;
    setStat?: SetStat;
    subscriptionPlanId?: string;
    plan?: SubscriptionPlan;
    printedAt?: Date | null;
  } = {},
): Promise<SeededSet> => {
  const plan = overrides.plan ?? (await seedPlan(prisma, {
    subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
    subscriptionDuration: SubscriptionDuration.ONE_MONTH,
  }));

  const set = await prisma.set.create({
    data: {
      setNumber: generateSetNumber(),
      subscriptionPlanId: overrides.subscriptionPlanId ?? plan.id,
      numberOfKeys: overrides.numberOfKeys ?? 3,
      setStat: overrides.setStat ?? SetStat.NOT_PRINTED,
      ...(overrides.printedAt !== undefined && { printedAt: overrides.printedAt }),
    },
  });

  return { set, plan };
};
