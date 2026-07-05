import type { Order } from '@prisma/client';
import { Prisma } from '@prisma/client';
import {
  OrderResponseSchema,
  OrderDetailResponseSchema,
  type OrderDTO,
  type OrderDetailDTO,
  OrderStat,
  DeliveryType,
  LotStat,
} from '@my-app/contract';
import { composeSubscriptionLabel } from '@modules/set/set.mapper';
import type { SubscriptionType, SubscriptionDuration } from '@my-app/contract';

function decimalToNumber(d: Prisma.Decimal): number {
  return Number(d.toFixed(2));
}

export type OrderJoins = {
  distributor: { storeName: string };
  wilaya: { frName: string };
  commune: { frName: string };
  deliveryCompany: { name: string };
  lotNumbers: string[];
  cardsCount: number;
};

export type LotBreakdown = {
  lotId: string;
  lotNumber: string;
  subscriptionPlan: { subscriptionType: SubscriptionType; subscriptionDuration: SubscriptionDuration };
  cardsCount: number;
  lotStat: string;
};

export class OrderMapper {
  static toDTO(order: Order, joins: OrderJoins): OrderDTO {
    const dto: OrderDTO = {
      id: order.id,
      orderNumber: order.orderNumber,
      distributorId: order.distributorId,
      distributorName: joins.distributor.storeName,
      receivedName: order.receivedName,
      receivedPhone: order.receivedPhone,
      wilayaId: order.wilayaId,
      wilayaName: joins.wilaya.frName,
      communeId: order.communeId,
      communeName: joins.commune.frName,
      deliveryCompanyId: order.deliveryCompanyId,
      deliveryCompanyName: joins.deliveryCompany.name,
      deliveryType: order.deliveryType as DeliveryType,
      lotNumbers: joins.lotNumbers,
      cardsCount: joins.cardsCount,
      orderPrice: decimalToNumber(order.orderPrice),
      deliverPrice: decimalToNumber(order.deliverPrice),
      cardsDeliveredCount: order.cardsDeliveredCount,
      orderStat: order.orderStat as OrderStat,
      createdAt: order.createdAt.toISOString(),
      completedAt: order.completedAt ? order.completedAt.toISOString() : null,
    };
    return OrderResponseSchema.parse(dto);
  }

  static toDetailDTO(order: Order, joins: OrderJoins, lots: LotBreakdown[]): OrderDetailDTO {
    const base = OrderMapper.toDTO(order, joins);
    const dto: OrderDetailDTO = {
      ...base,
      lots: lots.map((l) => ({
        lotId: l.lotId,
        lotNumber: l.lotNumber,
        subscriptionLabel: composeSubscriptionLabel(l.subscriptionPlan),
        cardsCount: l.cardsCount,
        lotStat: l.lotStat as LotStat,
      })),
    };
    return OrderDetailResponseSchema.parse(dto);
  }
}
