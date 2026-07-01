import { faker } from '@faker-js/faker';
import { OrderStat, DeliveryType } from '@my-app/contract';
import type { Order, Distributor, Wilaya, Commune, DeliveryCompany, Lot } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { seedDistributor } from './distributor.factory';
import { seedDeliveryCompany } from './delivery-company.factory';
import { seedWilaya, seedCommune } from './geography.factory';
import { generateOrderNumber } from '@modules/order/order.util';

export interface SeededOrder {
  order: Order;
  distributor: Distributor;
  wilaya: Wilaya;
  commune: Commune;
  deliveryCompany: DeliveryCompany;
  lots: Lot[];
}

export const seedOrder = async (
  prisma: PrismaClient,
  overrides: {
    orderStat?: OrderStat;
    lotIds?: string[];
    distributor?: Distributor;
    wilaya?: Wilaya;
    commune?: Commune;
    deliveryCompany?: DeliveryCompany;
    completedAt?: Date | null;
    cardsDeliveredCount?: number;
  } = {},
): Promise<SeededOrder> => {
  const { distributor, wilaya, commune } = overrides.distributor
    ? { distributor: overrides.distributor, wilaya: overrides.wilaya!, commune: overrides.commune! }
    : await seedDistributor(prisma);

  const deliveryCompany = overrides.deliveryCompany ?? (await seedDeliveryCompany(prisma));

  // commune must belong to wilaya — use same wilaya for order
  const orderWilaya = overrides.wilaya ?? wilaya;
  const orderCommune = overrides.commune ?? commune;

  const lotIds = overrides.lotIds ?? [];

  const order = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      distributorId: distributor.id,
      receivedName: faker.person.fullName(),
      receivedPhone: faker.phone.number(),
      wilayaId: orderWilaya.id,
      communeId: orderCommune.id,
      deliveryCompanyId: deliveryCompany.id,
      deliveryType: DeliveryType.HOME,
      orderPrice: new Prisma.Decimal(500),
      deliverPrice: new Prisma.Decimal(50),
      cardsDeliveredCount: overrides.cardsDeliveredCount ?? 0,
      orderStat: overrides.orderStat ?? OrderStat.PENDING_DELIVERY,
      ...(overrides.completedAt !== undefined && { completedAt: overrides.completedAt }),
      ...(lotIds.length > 0 && {
        orderLots: {
          create: lotIds.map((lotId) => ({ lotId })),
        },
      }),
    },
  });

  const lots = lotIds.length > 0
    ? await prisma.lot.findMany({ where: { id: { in: lotIds } } })
    : [];

  return { order, distributor, wilaya: orderWilaya, commune: orderCommune, deliveryCompany, lots };
};
