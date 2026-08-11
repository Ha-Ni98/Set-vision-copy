import type { CardRevocationRequest, SubscriptionPlan } from '@prisma/client';
import {
  CardRevocationRequestResponseSchema,
  RevocableCardResponseSchema,
  type CardRevocationRequestDTO,
  type RevocableCardDTO,
  RevocationRequestStat,
  type CardStat,
} from '@my-app/contract';
import { composeSubscriptionLabel } from '@modules/set/set.mapper';
import { distributorVisibleKey } from '@modules/card/card.mapper';

export type CardRevocationRequestJoins = {
  card: {
    key: string;
    // Raw Prisma string, not the contract CardStat — matches how every other mapper in this
    // codebase takes Prisma's cardStat (card.mapper.ts's own CardJoins does the same) and
    // casts at the point of use, since Prisma's generated enum is not nominally the contract's.
    cardStat: string;
    subscriptionPlan: Pick<SubscriptionPlan, 'subscriptionType' | 'subscriptionDuration'>;
  };
  distributor: { storeName: string };
  reviewedBy: { admin: { fullName: string } | null } | null;
};

export class CardRevocationRequestMapper {
  // ADMIN — always the full key.
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

  // DISTRIBUTOR (getMine) — key gated through distributorVisibleKey(). Set 7 §7.2: an approved
  // revocation puts the card back at AT_DISTRIBUTOR and re-sellable, so the historical request
  // row must stop publishing a live key once that happens.
  static toMineDTO(entity: CardRevocationRequest, joins: CardRevocationRequestJoins): CardRevocationRequestDTO {
    const dto: CardRevocationRequestDTO = {
      id: entity.id,
      cardId: entity.cardId,
      cardKey: distributorVisibleKey(joins.card.key, joins.card.cardStat as CardStat),
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
