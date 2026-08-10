import type { CardOrderRequest, SubscriptionPlan } from '@prisma/client';
import {
  CardOrderRequestResponseSchema,
  LinkableCardOrderRequestResponseSchema,
  type CardOrderRequestDTO,
  type LinkableCardOrderRequestDTO,
  OrderRequestStat,
} from '@my-app/contract';
import { composeSubscriptionLabel } from '@modules/set/set.mapper';

export type CardOrderRequestJoins = {
  distributor: { storeName: string };
  subscriptionPlan: Pick<SubscriptionPlan, 'subscriptionType' | 'subscriptionDuration'>;
  reviewedBy: { admin: { fullName: string } | null } | null;
  order: { orderNumber: string } | null;
};

export class CardOrderRequestMapper {
  static toDTO(entity: CardOrderRequest, joins: CardOrderRequestJoins): CardOrderRequestDTO {
    const dto: CardOrderRequestDTO = {
      id: entity.id,
      distributorId: entity.distributorId,
      distributorName: joins.distributor.storeName,
      subscriptionPlanId: entity.subscriptionPlanId,
      subscriptionLabel: composeSubscriptionLabel(joins.subscriptionPlan),
      nbOfCards: entity.nbOfCards,
      note: entity.note,
      stat: entity.stat as OrderRequestStat,
      adminNote: entity.adminNote,
      reviewedByName: joins.reviewedBy?.admin?.fullName ?? null,
      orderId: entity.orderId,
      orderNumber: joins.order?.orderNumber ?? null,
      createdAt: entity.createdAt.toISOString(),
      reviewedAt: entity.reviewedAt ? entity.reviewedAt.toISOString() : null,
    };
    return CardOrderRequestResponseSchema.parse(dto);
  }

  static toLinkableDTO(
    entity: Pick<CardOrderRequest, 'id' | 'distributorId' | 'nbOfCards' | 'createdAt'>,
    joins: { distributor: { storeName: string }; subscriptionPlan: CardOrderRequestJoins['subscriptionPlan'] },
  ): LinkableCardOrderRequestDTO {
    const dto: LinkableCardOrderRequestDTO = {
      id: entity.id,
      distributorId: entity.distributorId,
      distributorName: joins.distributor.storeName,
      subscriptionLabel: composeSubscriptionLabel(joins.subscriptionPlan),
      nbOfCards: entity.nbOfCards,
      createdAt: entity.createdAt.toISOString(),
    };
    return LinkableCardOrderRequestResponseSchema.parse(dto);
  }
}
