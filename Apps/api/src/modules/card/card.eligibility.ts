import { CardStat as PrismaCardStat, type Prisma } from '@prisma/client';

/**
 * THE definition of "this card may be put into a lot". One expression, two callers:
 * CardService.getAvailableForLot() (what the picker is allowed to show) and
 * LotService.create() (what the server is willing to assign). They were allowed to drift
 * before this set — the read excluded isDisabled/deletedAt and the write did not — so a
 * disabled card could not be picked but could be submitted. Never inline any part of this.
 */
export const lotEligibleCardWhere = (subscriptionPlanId: string): Prisma.CardWhereInput => ({
  subscriptionPlanId,
  cardStat: PrismaCardStat.PRINTED,
  lotId: null,
  isDisabled: false,
  isRevoked: false,
  deletedAt: null,
});
