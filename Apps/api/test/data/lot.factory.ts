import { faker } from '@faker-js/faker';
import { LotStat, SubscriptionType, SubscriptionDuration } from '@my-app/contract';
import type { Lot, SubscriptionPlan } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { seedPlan } from './subscription-plan.factory';
import { generateLotNumber } from '@modules/lot/lot.util';

export const lotEntity = (overrides: Partial<Lot> = {}): Lot => ({
  id: faker.string.uuid(),
  lotNumber: generateLotNumber(),
  subscriptionPlanId: faker.string.uuid(),
  lotStat: LotStat.PENDING,
  nbOfCards: 5,
  isReturned: false,
  createdAt: new Date('2024-01-15T10:00:00.000Z'),
  deliveryDate: null,
  ...overrides,
});

export interface SeededLot {
  lot: Lot;
  plan: SubscriptionPlan;
}

export const seedLot = async (
  prisma: PrismaClient,
  overrides: {
    lotStat?: LotStat;
    nbOfCards?: number;
    isReturned?: boolean;
    deliveryDate?: Date | null;
    subscriptionPlanId?: string;
    plan?: SubscriptionPlan;
  } = {},
): Promise<SeededLot> => {
  const plan = overrides.plan ?? (await seedPlan(prisma, {
    subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
    subscriptionDuration: SubscriptionDuration.ONE_MONTH,
  }));

  const lot = await prisma.lot.create({
    data: {
      lotNumber: generateLotNumber(),
      subscriptionPlanId: overrides.subscriptionPlanId ?? plan.id,
      lotStat: overrides.lotStat ?? LotStat.PENDING,
      nbOfCards: overrides.nbOfCards ?? 5,
      isReturned: overrides.isReturned ?? false,
      ...(overrides.deliveryDate !== undefined && { deliveryDate: overrides.deliveryDate }),
    },
  });

  return { lot, plan };
};
