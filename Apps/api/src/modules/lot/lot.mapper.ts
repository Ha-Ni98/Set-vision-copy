import type { Lot, SubscriptionPlan } from '@prisma/client';
import { LotResponseSchema, type LotDTO, LotStat } from '@my-app/contract';
import { composeSubscriptionLabel } from '@modules/set/set.mapper';

export class LotMapper {
  static toDTO(
    lot: Lot,
    plan: Pick<SubscriptionPlan, 'subscriptionType' | 'subscriptionDuration'>,
    deliveredCardsCount: number,
  ): LotDTO {
    const dto: LotDTO = {
      id: lot.id,
      lotNumber: lot.lotNumber,
      subscriptionPlanId: lot.subscriptionPlanId,
      subscriptionLabel: composeSubscriptionLabel(plan),
      lotStat: lot.lotStat as LotStat,
      nbOfCards: lot.nbOfCards,
      deliveredCardsCount,
      isReturned: lot.isReturned,
      createdAt: lot.createdAt.toISOString(),
      deliveryDate: lot.deliveryDate ? lot.deliveryDate.toISOString() : null,
    };
    return LotResponseSchema.parse(dto);
  }
}
