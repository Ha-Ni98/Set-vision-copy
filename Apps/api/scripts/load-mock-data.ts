/**
 * load_mock_data — populates the database with realistic mock data for manual
 * testing: subscription catalog, 10 activators (password: test123), distributors,
 * delivery companies, and inventory/activations walked through every lifecycle stage.
 *
 * Reuses the test data factories in test/data and the id generators in src/modules.
 * Geography is reused from `npm run load_wilaya`; if none is loaded, a small set is
 * seeded on the fly.
 *
 * Run: npm run load_mock_data
 */
import { faker } from '@faker-js/faker';
import {
  CardStat,
  SetStat,
  LotStat,
  OrderStat,
  DeliveryType,
  ActivationStat,
  AccountInformation,
  SubscriptionType,
  SubscriptionDuration,
  UserRole,
} from '@my-app/contract';
import { Prisma } from '@prisma/client';
import type { Wilaya, Commune } from '@prisma/client';
import { prisma } from '../src/common/db/prisma';
import { hashPassword } from '../src/common/utils/password.utils';
import { generateSetNumber, generateCardKey } from '../src/modules/set/set.util';
import { generateLotNumber } from '../src/modules/lot/lot.util';
import { generateOrderNumber } from '../src/modules/order/order.util';

import { seedPlan } from '../test/data/subscription-plan.factory';
import {
  seedCommissionDuration,
  seedCommissionCell,
} from '../test/data/subscription-plan-commission.factory';
import { seedAdmin } from '../test/data/admin.factory';
import { seedDeliveryCompany } from '../test/data/delivery-company.factory';
import { seedDistributor } from '../test/data/distributor.factory';
import { seedWilaya, seedCommune } from '../test/data/geography.factory';
import { seedActivation } from '../test/data/activation.factory';

const ACTIVATOR_PASSWORD = 'test123';

const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]!;
const randInt = (min: number, max: number): number => faker.number.int({ min, max });

// ─── Geography ────────────────────────────────────────────────────────────────

interface GeoPair {
  wilaya: Wilaya;
  commune: Commune;
}

async function loadGeography(): Promise<GeoPair[]> {
  const wilayas = await prisma.wilaya.findMany({ include: { communes: true } });

  const withCommunes = wilayas.filter((w) => w.communes.length > 0);
  if (withCommunes.length > 0) {
    return withCommunes.map((w) => ({ wilaya: w, commune: pick(w.communes) }));
  }

  // Fallback: no geography loaded — seed a small set so the script still works.
  console.log('  (no wilayas found — seeding a small fallback set; run load_wilaya for the full list)');
  const pairs: GeoPair[] = [];
  for (let i = 0; i < 5; i += 1) {
    const wilaya = await seedWilaya(prisma);
    const commune = await seedCommune(prisma, wilaya.id);
    pairs.push({ wilaya, commune });
  }
  return pairs;
}

// ─── Catalog ─────────────────────────────────────────────────────────────────

async function seedCatalog() {
  const durations = [
    SubscriptionDuration.ONE_WEEK,
    SubscriptionDuration.ONE_MONTH,
    SubscriptionDuration.THREE_MONTH,
    SubscriptionDuration.ONE_YEAR,
  ];
  const plans = await Promise.all(
    durations.map((subscriptionDuration) =>
      seedPlan(prisma, { subscriptionType: SubscriptionType.SNAPCHAT_PLUS, subscriptionDuration }),
    ),
  );

  // Commission tiers by activation speed (minutes).
  const tiers = [
    { key: 'fast', label: '0-30 min', nbMinuteMin: 0, nbMinuteMax: 30, commission: 1.0 },
    { key: 'normal', label: '30-120 min', nbMinuteMin: 30, nbMinuteMax: 120, commission: 0.75 },
    { key: 'slow', label: '2h+', nbMinuteMin: 120, nbMinuteMax: null, commission: 0.5 },
  ];
  for (const plan of plans) {
    for (const t of tiers) {
      const duration = await seedCommissionDuration(prisma, {
        key: `${plan.id.slice(0, 8)}_${t.key}`,
        label: t.label,
        nbMinuteMin: t.nbMinuteMin,
        nbMinuteMax: t.nbMinuteMax,
      });
      await seedCommissionCell(prisma, plan.id, duration.id, t.commission);
    }
  }

  return plans;
}

// ─── Activators ───────────────────────────────────────────────────────────────

async function seedActivators() {
  const hashed = await hashPassword(ACTIVATOR_PASSWORD);
  const activators = [];
  for (let i = 1; i <= 10; i += 1) {
    const user = await prisma.user.create({
      data: {
        username: `activator${i}`,
        password: hashed,
        role: UserRole.ACTIVATOR,
        isEnabled: i !== 10, // one disabled activator for testing
      },
    });
    const activator = await prisma.activator.create({
      data: {
        userId: user.id,
        fullName: faker.person.fullName(),
        phone: faker.phone.number(),
        credits: new Prisma.Decimal(randInt(0, 5000)),
        totalEarning: new Prisma.Decimal(randInt(0, 20000)),
        nbOfActivation: randInt(0, 200),
        nbOfSuccessfulActivation: randInt(0, 150),
      },
    });
    activators.push(activator);
  }
  return activators;
}

// ─── Inventory helpers ─────────────────────────────────────────────────────────

async function createSet(planId: string, numberOfKeys: number, printed: boolean) {
  return prisma.set.create({
    data: {
      setNumber: generateSetNumber(),
      subscriptionPlanId: planId,
      numberOfKeys,
      setStat: printed ? SetStat.PRINTED : SetStat.NOT_PRINTED,
      ...(printed && { printedAt: faker.date.recent({ days: 60 }) }),
    },
  });
}

async function createCard(
  planId: string,
  setId: string,
  cardStat: CardStat,
  extra: { lotId?: string; distributorId?: string; isActive?: boolean } = {},
) {
  return prisma.card.create({
    data: {
      key: generateCardKey(),
      subscriptionPlanId: planId,
      setId,
      cardStat,
      lotId: extra.lotId ?? null,
      distributorId: extra.distributorId ?? null,
      isActive: extra.isActive ?? false,
    },
  });
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const counts = {
    activators: 0,
    distributors: 0,
    deliveryCompanies: 0,
    sets: 0,
    lots: 0,
    orders: 0,
    cards: 0,
    activations: 0,
  };

  console.log('→ Loading geography…');
  const geo = await loadGeography();

  console.log('→ Seeding subscription catalog…');
  const plans = await seedCatalog();

  console.log('→ Seeding admin…');
  const { admin } = await seedAdmin(prisma, { username: 'mockadmin', fullName: 'Mock Admin' });

  console.log('→ Seeding 10 activators (password: test123)…');
  const activators = await seedActivators();
  counts.activators = activators.length;

  console.log('→ Seeding delivery companies…');
  const deliveryCompanies = [];
  for (let i = 0; i < 3; i += 1) deliveryCompanies.push(await seedDeliveryCompany(prisma));
  counts.deliveryCompanies = deliveryCompanies.length;

  console.log('→ Seeding distributors…');
  const distributors = [];
  for (let i = 0; i < 8; i += 1) {
    const g = pick(geo);
    const { distributor } = await seedDistributor(prisma, { wilaya: g.wilaya, commune: g.commune });
    distributors.push(distributor);
  }
  counts.distributors = distributors.length;

  console.log('→ Building inventory + activation scenarios…');

  // Scenario A — fresh unprinted set: cards IN_SET.
  {
    const plan = pick(plans);
    const numberOfKeys = randInt(5, 12);
    const set = await createSet(plan.id, numberOfKeys, false);
    counts.sets += 1;
    for (let i = 0; i < numberOfKeys; i += 1) {
      await createCard(plan.id, set.id, CardStat.IN_SET);
      counts.cards += 1;
    }
  }

  // Scenario B — printed set, cards PRINTED (not yet in a lot).
  {
    const plan = pick(plans);
    const numberOfKeys = randInt(5, 12);
    const set = await createSet(plan.id, numberOfKeys, true);
    counts.sets += 1;
    for (let i = 0; i < numberOfKeys; i += 1) {
      await createCard(plan.id, set.id, CardStat.PRINTED);
      counts.cards += 1;
    }
  }

  // Scenario C — cards packed into a PENDING lot (IN_LOT), not yet delivered.
  {
    const plan = pick(plans);
    const numberOfKeys = randInt(6, 15);
    const set = await createSet(plan.id, numberOfKeys, true);
    counts.sets += 1;
    const lot = await prisma.lot.create({
      data: {
        lotNumber: generateLotNumber(),
        subscriptionPlanId: plan.id,
        lotStat: LotStat.PENDING,
        nbOfCards: numberOfKeys,
      },
    });
    counts.lots += 1;
    for (let i = 0; i < numberOfKeys; i += 1) {
      await createCard(plan.id, set.id, CardStat.IN_LOT, { lotId: lot.id });
      counts.cards += 1;
    }
  }

  // Scenario D + E — several lots DELIVERED to distributors via orders, whose
  // cards reach AT_DISTRIBUTOR and then get activations in every stat.
  const activationStats: ActivationStat[] = [
    ActivationStat.PENDING,
    ActivationStat.PROCESSING,
    ActivationStat.WRONG_INFORMATION,
    ActivationStat.ADDITIONAL_INFORMATION,
    ActivationStat.FREEZE,
    ActivationStat.ACTIVATED,
    ActivationStat.ACTIVATED_BY_ADMIN,
    ActivationStat.CANCELLED_BY_ACTIVATOR,
    ActivationStat.REMOVED_FROM_ACTIVATOR,
    ActivationStat.CANCELLED_BY_ADMIN,
  ];

  for (let d = 0; d < 5; d += 1) {
    const plan = pick(plans);
    const distributor = pick(distributors);
    const deliveryCompany = pick(deliveryCompanies);
    const g = pick(geo);
    const numberOfKeys = randInt(8, 20);

    const set = await createSet(plan.id, numberOfKeys, true);
    counts.sets += 1;

    const lot = await prisma.lot.create({
      data: {
        lotNumber: generateLotNumber(),
        subscriptionPlanId: plan.id,
        lotStat: LotStat.DELIVERED,
        nbOfCards: numberOfKeys,
        deliveryDate: faker.date.recent({ days: 30 }),
      },
    });
    counts.lots += 1;

    await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        distributorId: distributor.id,
        receivedName: faker.person.fullName(),
        receivedPhone: faker.phone.number(),
        wilayaId: g.wilaya.id,
        communeId: g.commune.id,
        deliveryCompanyId: deliveryCompany.id,
        deliveryType: pick([DeliveryType.HOME, DeliveryType.PICKUP_POINT, DeliveryType.STORE]),
        orderPrice: new Prisma.Decimal(randInt(200, 2000)),
        deliverPrice: new Prisma.Decimal(randInt(0, 100)),
        cardsDeliveredCount: numberOfKeys,
        orderStat: OrderStat.DELIVERED,
        completedAt: faker.date.recent({ days: 20 }),
        orderLots: { create: [{ lotId: lot.id }] },
      },
    });
    counts.orders += 1;

    for (let i = 0; i < numberOfKeys; i += 1) {
      // ~40% of delivered cards stay AT_DISTRIBUTOR; the rest go through activation.
      if (i % 5 < 2) {
        await createCard(plan.id, set.id, CardStat.AT_DISTRIBUTOR, {
          lotId: lot.id,
          distributorId: distributor.id,
        });
        counts.cards += 1;
        continue;
      }

      const stat = pick(activationStats);
      const isActivated = stat === ActivationStat.ACTIVATED || stat === ActivationStat.ACTIVATED_BY_ADMIN;
      const cardStat = isActivated
        ? CardStat.ACTIVATED
        : stat === ActivationStat.PENDING
          ? CardStat.AT_DISTRIBUTOR
          : CardStat.ACTIVATION_PROGRESS;

      const card = await createCard(plan.id, set.id, cardStat, {
        lotId: lot.id,
        distributorId: distributor.id,
        isActive: isActivated,
      });
      counts.cards += 1;

      const takesActivator = stat !== ActivationStat.PENDING;
      const completedAt = isActivated ? faker.date.recent({ days: 10 }) : null;

      await seedActivation(prisma, card, {
        activatorId: takesActivator ? pick(activators).id : null,
        activationStat: stat,
        clientFullName: faker.person.fullName(),
        clientPhone: faker.phone.number(),
        ...(isActivated && { activationPrice: randInt(100, 1000) }),
        ...(stat === ActivationStat.FREEZE && { freezReason: faker.lorem.sentence() }),
        takenAt: takesActivator ? faker.date.recent({ days: 15 }) : null,
        completedAt,
        accountFields: [
          { field: AccountInformation.USERNAME, value: faker.internet.username() },
          { field: AccountInformation.EMAIL, value: faker.internet.email() },
          { field: AccountInformation.PASSWORD, value: faker.internet.password() },
        ],
      });
      counts.activations += 1;
    }
  }

  // Some payments admin -> activators.
  for (let i = 0; i < 6; i += 1) {
    const activator = pick(activators);
    await prisma.payment.create({
      data: {
        adminId: admin.id,
        activatorId: activator.id,
        totalAmount: new Prisma.Decimal(randInt(500, 5000)),
        previousCredits: new Prisma.Decimal(randInt(0, 3000)),
      },
    });
  }

  console.log('\n✓ Mock data loaded:');
  console.table(counts);
  console.log('  Admin login:      mockadmin (seeded via factory, password Password123!)');
  console.log('  Activator logins: activator1 … activator10 (password: test123, activator10 disabled)');
}

main()
  .catch((err) => {
    console.error('✗ load_mock_data failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
