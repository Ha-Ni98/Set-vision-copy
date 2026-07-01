import type { Card } from '@prisma/client';
import {
  CardResponseSchema,
  CardDetailResponseSchema,
  AvailableCardResponseSchema,
  type CardDTO,
  type CardDetailDTO,
  type AvailableCardDTO,
  CardStat,
  type SubscriptionType,
  type SubscriptionDuration,
} from '@my-app/contract';
import { composeSubscriptionLabel } from '@modules/set/set.mapper';

export type CardJoins = {
  subscriptionPlan: { subscriptionType: SubscriptionType; subscriptionDuration: SubscriptionDuration };
  set: { setNumber: string };
  lot: { lotNumber: string } | null;
  distributor: { storeName: string } | null;
};

export type DistributionTimelineEntry = {
  stat: CardStat;
  at: Date;
};

export class CardMapper {
  static toDTO(card: Card, joins: CardJoins): CardDTO {
    const dto: CardDTO = {
      id: card.id,
      key: card.key,
      subscriptionPlanId: card.subscriptionPlanId,
      subscriptionLabel: composeSubscriptionLabel(joins.subscriptionPlan),
      setNumber: joins.set.setNumber,
      lotNumber: joins.lot?.lotNumber ?? null,
      distributorName: joins.distributor?.storeName ?? null,
      cardStat: card.cardStat as CardStat,
      isActive: card.isActive,
      isDisabled: card.isDisabled,
      isRevoked: card.isRevoked,
      createdAt: card.createdAt.toISOString(),
    };
    return CardResponseSchema.parse(dto);
  }

  static toDetailDTO(card: Card, joins: CardJoins, timeline: DistributionTimelineEntry[]): CardDetailDTO {
    const base = CardMapper.toDTO(card, joins);
    const dto: CardDetailDTO = {
      ...base,
      distributionTimeline: timeline.map((entry) => ({
        stat: entry.stat,
        at: entry.at.toISOString(),
      })),
    };
    return CardDetailResponseSchema.parse(dto);
  }

  static toAvailableDTO(
    card: Pick<Card, 'id' | 'key'>,
    plan: { subscriptionType: SubscriptionType; subscriptionDuration: SubscriptionDuration },
  ): AvailableCardDTO {
    const dto: AvailableCardDTO = {
      id: card.id,
      key: card.key,
      subscriptionLabel: composeSubscriptionLabel(plan),
    };
    return AvailableCardResponseSchema.parse(dto);
  }
}
