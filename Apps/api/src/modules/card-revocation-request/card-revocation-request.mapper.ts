import type { CardRevocationRequest, SubscriptionPlan } from '@prisma/client';
import {
  CardRevocationRequestResponseSchema,
  RevocableCardResponseSchema,
  type CardRevocationRequestDTO,
  type RevocableCardDTO,
  RevocationRequestStat,
} from '@my-app/contract';
import { composeSubscriptionLabel } from '@modules/set/set.mapper';

export type CardRevocationRequestJoins = {
  card: { key: string; subscriptionPlan: Pick<SubscriptionPlan, 'subscriptionType' | 'subscriptionDuration'> };
  distributor: { storeName: string };
  reviewedBy: { admin: { fullName: string } | null } | null;
};

export class CardRevocationRequestMapper {
  static toDTO(entity: CardRevocationRequest, joins: CardRevocationRequestJoins): CardRevocationRequestDTO {
    const dto: CardRevocationRequestDTO = {
      id: entity.id,
      cardId: entity.cardId,
      cardKey: joins.card.key,
      activationId: entity.activationId,
      distributorId: entity.distributorId,
      distributorName: joins.distributor.storeName,
      subscriptionLabel: composeSubscriptionLabel(joins.card.subscriptionPlan),
      reason: entity.reason,
      stat: entity.stat as RevocationRequestStat,
      adminNote: entity.adminNote,
      reviewedByName: joins.reviewedBy?.admin?.fullName ?? null,
      createdAt: entity.createdAt.toISOString(),
      reviewedAt: entity.reviewedAt ? entity.reviewedAt.toISOString() : null,
    };
    return CardRevocationRequestResponseSchema.parse(dto);
  }

  static toRevocableCardDTO(card: {
    id: string;
    key: string;
    subscriptionPlan: Pick<SubscriptionPlan, 'subscriptionType' | 'subscriptionDuration'>;
    activations: { id: string; completedAt: Date | null; clientFullName: string }[];
  }): RevocableCardDTO {
    const latest = card.activations[0];
    const dto: RevocableCardDTO = {
      cardId: card.id,
      cardKey: card.key,
      subscriptionLabel: composeSubscriptionLabel(card.subscriptionPlan),
      activationId: latest ? latest.id : null,
      failedAt: latest?.completedAt ? latest.completedAt.toISOString() : null,
      clientFullName: latest ? latest.clientFullName : null,
    };
    return RevocableCardResponseSchema.parse(dto);
  }
}
