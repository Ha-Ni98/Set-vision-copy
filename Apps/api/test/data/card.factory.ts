import { faker } from '@faker-js/faker';
import { CardStat } from '@my-app/contract';
import type { Card, SubscriptionPlan, Set } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { seedPlan } from './subscription-plan.factory';
import { seedSet } from './set.factory';
import { generateCardKey } from '@modules/set/set.util';
import { SubscriptionType, SubscriptionDuration, SetStat } from '@my-app/contract';

export const cardEntity = (overrides: Partial<Card> = {}): Card => ({
  id: faker.string.uuid(),
  key: generateCardKey(),
  subscriptionPlanId: faker.string.uuid(),
  setId: faker.string.uuid(),
  lotId: null,
  distributorId: null,
  cardStat: CardStat.IN_SET,
  isActive: false,
  isDisabled: false,
  isRevoked: false,
  createdAt: new Date('2024-01-15T10:00:00.000Z'),
  updatedAt: new Date('2024-01-15T10:00:00.000Z'),
  deletedAt: null,
  ...overrides,
});

export interface SeededCard {
  card: Card;
  plan: SubscriptionPlan;
  set: Set;
}

export const seedCard = async (
  prisma: PrismaClient,
  overrides: {
    cardStat?: CardStat;
    setId?: string;
    lotId?: string | null;
    distributorId?: string | null;
    isActive?: boolean;
    isDisabled?: boolean;
    isRevoked?: boolean;
    plan?: SubscriptionPlan;
    set?: Set;
    deletedAt?: Date | null;
  } = {},
): Promise<SeededCard> => {
  const plan = overrides.plan ?? (await seedPlan(prisma, {
    subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
    subscriptionDuration: SubscriptionDuration.ONE_MONTH,
  }));

  let set = overrides.set;
  if (!set) {
    const seeded = await seedSet(prisma, { plan, setStat: SetStat.PRINTED });
    set = seeded.set;
  }

  const card = await prisma.card.create({
    data: {
      key: generateCardKey(),
      subscriptionPlanId: plan.id,
      setId: overrides.setId ?? set.id,
      lotId: overrides.lotId ?? null,
      distributorId: overrides.distributorId ?? null,
      cardStat: overrides.cardStat ?? CardStat.IN_SET,
      isActive: overrides.isActive ?? false,
      isDisabled: overrides.isDisabled ?? false,
      isRevoked: overrides.isRevoked ?? false,
      ...(overrides.deletedAt !== undefined && { deletedAt: overrides.deletedAt }),
    },
  });

  return { card, plan, set };
};
