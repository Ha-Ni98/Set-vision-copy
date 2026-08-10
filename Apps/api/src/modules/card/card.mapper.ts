import type { Card } from '@prisma/client';
import {
  CardResponseSchema,
  CardDetailResponseSchema,
  AvailableCardResponseSchema,
  DistributorCardResponseSchema,
  type CardDTO,
  type CardDetailDTO,
  type AvailableCardDTO,
  type DistributorCardDTO,
  CardStat,
  type SubscriptionType,
  type SubscriptionDuration,
} from '@my-app/contract';
import { composeSubscriptionLabel } from '@modules/set/set.mapper';

/** Full key: the card has left sellable stock for good. */
const KEY_FULL_STATS: ReadonlySet<CardStat> = new Set([
  CardStat.ACTIVATED,
  CardStat.ACTIVATION_FAILED,
]);

/** Head-truncated key: the card is mid-activation. Identification, not capability. */
const KEY_PREFIX_STATS: ReadonlySet<CardStat> = new Set([CardStat.ACTIVATION_PROGRESS]);

const KEY_PREFIX_LENGTH = 4;
const KEY_PREFIX_MASK = '••••••••'; // fixed length: does NOT encode the real key length

/**
 * THE ONLY function that shapes a Card.key for a distributor audience.
 *
 * DEFAULT-DENY BY CONSTRUCTION: a CardStat present in neither set falls through to `null`.
 * A new value added to the enum later is therefore locked automatically — it can only ever be
 * leaked by someone explicitly adding it to a set above, never by forgetting to.
 *
 * Never call this on an admin or activator path; those audiences get card.key directly.
 *
 * This is a fixed-length mask on purpose: '*'.repeat(key.length - 4) would publish the key's
 * exact length. maskKey() in activation.mapper.ts does exactly that and is NOT reused here —
 * it is a tail mask for a different audience (the activator pending pool) and a different
 * threat model. Two masks, two call sites, deliberately not merged.
 */
export function distributorVisibleKey(key: string, stat: CardStat): string | null {
  if (KEY_FULL_STATS.has(stat)) return key;
  if (KEY_PREFIX_STATS.has(stat)) return key.slice(0, KEY_PREFIX_LENGTH) + KEY_PREFIX_MASK;
  return null;
}

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

export type DistributorCardJoins = {
  subscriptionPlan: { subscriptionType: SubscriptionType; subscriptionDuration: SubscriptionDuration };
  lot: { lotNumber: string } | null;
  deliveredAt: Date | null;
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

  static toDistributorDTO(card: Card, joins: DistributorCardJoins): DistributorCardDTO {
    const stat = card.cardStat as CardStat;
    const dto: DistributorCardDTO = {
      id: card.id,
      key: distributorVisibleKey(card.key, stat), // ← the only key expression on this path
      subscriptionPlanId: card.subscriptionPlanId,
      subscriptionLabel: composeSubscriptionLabel(joins.subscriptionPlan),
      lotNumber: joins.lot?.lotNumber ?? null,
      cardStat: stat,
      isDisabled: card.isDisabled,
      isRevoked: card.isRevoked,
      deliveredAt: joins.deliveredAt?.toISOString() ?? null,
      createdAt: card.createdAt.toISOString(),
    };
    return DistributorCardResponseSchema.parse(dto); // runtime backstop
  }
}
