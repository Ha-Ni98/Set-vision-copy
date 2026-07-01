import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { OrderMapper, type OrderJoins, type LotBreakdown } from '@modules/order/order.mapper';
import {
  OrderResponseSchema,
  OrderDetailResponseSchema,
  OrderStat,
  DeliveryType,
  LotStat,
  SubscriptionType,
  SubscriptionDuration,
} from '@my-app/contract';
import { faker } from '@faker-js/faker';

const SAMPLE_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const PLAN_UUID = 'b1ffcd00-0d1c-4f19-bc7e-7cc0ce491b22';

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: faker.string.uuid(),
    orderNumber: 'ORD-20240630-AABBCC',
    distributorId: faker.string.uuid(),
    receivedName: 'John Doe',
    receivedPhone: '0612345678',
    wilayaId: faker.string.uuid(),
    communeId: faker.string.uuid(),
    deliveryCompanyId: faker.string.uuid(),
    deliveryType: 'HOME',
    orderPrice: new Prisma.Decimal(500.5),
    deliverPrice: new Prisma.Decimal(50.255),
    cardsDeliveredCount: 0,
    orderStat: 'PENDING_DELIVERY',
    createdAt: new Date('2024-06-01T10:00:00.000Z'),
    completedAt: null,
    ...overrides,
  } as Parameters<typeof OrderMapper.toDTO>[0];
}

function makeJoins(overrides: Partial<OrderJoins> = {}): OrderJoins {
  return {
    distributor: { storeName: 'Best Store' },
    wilaya: { frName: 'Alger' },
    commune: { frName: 'Bab El Oued' },
    deliveryCompany: { name: 'FastDel' },
    lotNumbers: ['LOT-001', 'LOT-002'],
    cardsCount: 20,
    ...overrides,
  };
}

function makeLotBreakdown(overrides: Partial<LotBreakdown> = {}): LotBreakdown {
  return {
    lotId: faker.string.uuid(),
    lotNumber: 'LOT-001',
    subscriptionPlan: {
      subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
      subscriptionDuration: SubscriptionDuration.ONE_MONTH,
    },
    cardsCount: 10,
    lotStat: LotStat.IN_DELIVERY,
    ...overrides,
  };
}

describe('OrderMapper.toDTO', () => {
  it('produces an OrderDTO that parses OrderResponseSchema', () => {
    const dto = OrderMapper.toDTO(makeOrder(), makeJoins());
    expect(() => OrderResponseSchema.parse(dto)).not.toThrow();
  });

  it('resolves distributorName from distributor.storeName', () => {
    const dto = OrderMapper.toDTO(makeOrder(), makeJoins({ distributor: { storeName: 'My Shop' } }));
    expect(dto.distributorName).toBe('My Shop');
  });

  it('retains distributorId alongside distributorName', () => {
    const order = makeOrder({ distributorId: SAMPLE_UUID });
    const dto = OrderMapper.toDTO(order, makeJoins());
    expect(dto.distributorId).toBe(SAMPLE_UUID);
    expect(dto.distributorName).toBeDefined();
  });

  it('resolves wilayaName from wilaya.frName', () => {
    const dto = OrderMapper.toDTO(makeOrder(), makeJoins({ wilaya: { frName: 'Oran' } }));
    expect(dto.wilayaName).toBe('Oran');
  });

  it('resolves communeName from commune.frName', () => {
    const dto = OrderMapper.toDTO(makeOrder(), makeJoins({ commune: { frName: 'Bir El Djir' } }));
    expect(dto.communeName).toBe('Bir El Djir');
  });

  it('resolves deliveryCompanyName', () => {
    const dto = OrderMapper.toDTO(makeOrder(), makeJoins({ deliveryCompany: { name: 'SpeedEx' } }));
    expect(dto.deliveryCompanyName).toBe('SpeedEx');
  });

  it('passes lotNumbers array through', () => {
    const dto = OrderMapper.toDTO(makeOrder(), makeJoins({ lotNumbers: ['LOT-A', 'LOT-B', 'LOT-C'] }));
    expect(dto.lotNumbers).toEqual(['LOT-A', 'LOT-B', 'LOT-C']);
  });

  it('passes aggregated cardsCount through', () => {
    const dto = OrderMapper.toDTO(makeOrder(), makeJoins({ cardsCount: 42 }));
    expect(dto.cardsCount).toBe(42);
  });

  it('converts orderPrice Decimal to number with 2dp', () => {
    const order = makeOrder({ orderPrice: new Prisma.Decimal(500.505) });
    const dto = OrderMapper.toDTO(order, makeJoins());
    expect(dto.orderPrice).toBe(500.51);
  });

  it('converts deliverPrice Decimal to number with 2dp', () => {
    const order = makeOrder({ deliverPrice: new Prisma.Decimal(50.255) });
    const dto = OrderMapper.toDTO(order, makeJoins());
    expect(dto.deliverPrice).toBe(50.26);
  });

  it('serializes completedAt as null when not set', () => {
    const dto = OrderMapper.toDTO(makeOrder({ completedAt: null }), makeJoins());
    expect(dto.completedAt).toBeNull();
  });

  it('serializes completedAt as ISO string when present', () => {
    const date = new Date('2024-07-01T14:30:00.000Z');
    const dto = OrderMapper.toDTO(makeOrder({ completedAt: date }), makeJoins());
    expect(dto.completedAt).toBe('2024-07-01T14:30:00.000Z');
  });

  it('serializes createdAt as ISO string', () => {
    const dto = OrderMapper.toDTO(makeOrder(), makeJoins());
    expect(dto.createdAt).toBe('2024-06-01T10:00:00.000Z');
  });

  it('maps all OrderStat values', () => {
    for (const stat of Object.values(OrderStat)) {
      const dto = OrderMapper.toDTO(makeOrder({ orderStat: stat }), makeJoins());
      expect(dto.orderStat).toBe(stat);
    }
  });

  it('maps all DeliveryType values', () => {
    for (const type of Object.values(DeliveryType)) {
      const dto = OrderMapper.toDTO(makeOrder({ deliveryType: type }), makeJoins());
      expect(dto.deliveryType).toBe(type);
    }
  });
});

describe('OrderMapper.toDetailDTO', () => {
  it('produces an OrderDetailDTO that parses OrderDetailResponseSchema', () => {
    const dto = OrderMapper.toDetailDTO(makeOrder(), makeJoins(), [makeLotBreakdown()]);
    expect(() => OrderDetailResponseSchema.parse(dto)).not.toThrow();
  });

  it('includes base OrderDTO fields', () => {
    const dto = OrderMapper.toDetailDTO(makeOrder(), makeJoins(), []);
    expect(dto).toHaveProperty('orderNumber');
    expect(dto).toHaveProperty('distributorName');
    expect(dto).toHaveProperty('lotNumbers');
  });

  it('includes lots array with resolved subscriptionLabel', () => {
    const lot = makeLotBreakdown({
      lotNumber: 'LOT-XYZ',
      subscriptionPlan: {
        subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
        subscriptionDuration: SubscriptionDuration.ONE_MONTH,
      },
      cardsCount: 5,
      lotStat: LotStat.IN_DELIVERY,
    });
    const dto = OrderMapper.toDetailDTO(makeOrder(), makeJoins(), [lot]);
    expect(dto.lots).toHaveLength(1);
    expect(dto.lots[0]?.lotNumber).toBe('LOT-XYZ');
    expect(dto.lots[0]?.subscriptionLabel).toBe('Snapchat Plus — 01 Month');
    expect(dto.lots[0]?.cardsCount).toBe(5);
  });

  it('retains ids alongside names in detail DTO', () => {
    const order = makeOrder({ wilayaId: SAMPLE_UUID, communeId: PLAN_UUID });
    const dto = OrderMapper.toDetailDTO(order, makeJoins(), []);
    expect(dto.wilayaId).toBe(SAMPLE_UUID);
    expect(dto.communeId).toBe(PLAN_UUID);
    expect(dto.wilayaName).toBeDefined();
    expect(dto.communeName).toBeDefined();
  });
});
