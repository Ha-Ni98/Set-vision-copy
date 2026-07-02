import {
  CardResponseSchema,
  CardDetailResponseSchema,
  AvailableCardResponseSchema,
  PaginatedCardsSchema,
  CardStat,
  type CardDTO,
  type CardDetailDTO,
  type AvailableCardDTO,
  type PaginatedCards,
} from "@my-app/contract";

export const mockCardAtDistributor: CardDTO = CardResponseSchema.parse({
  id: "73000000-0000-4000-8000-000000000001",
  key: "KKKK-LLLL-MMMM-NNNN",
  subscriptionPlanId: "81000000-0000-4000-8000-000000000001",
  subscriptionLabel: "Snapchat+ — 1 Month",
  setNumber: "SET-2026-001",
  lotNumber: "LOT-2026-001",
  distributorName: "Store Alger Centre",
  cardStat: CardStat.AT_DISTRIBUTOR,
  isActive: true,
  isDisabled: false,
  isRevoked: false,
  createdAt: "2026-06-01T09:00:00.000Z",
});

// Not yet distributed — lotNumber/distributorName null (plan.md §4.1).
export const mockCardInSet: CardDTO = CardResponseSchema.parse({
  ...mockCardAtDistributor,
  id: "73000000-0000-4000-8000-000000000002",
  lotNumber: null,
  distributorName: null,
  cardStat: CardStat.IN_SET,
});

export const mockCardDetail: CardDetailDTO = CardDetailResponseSchema.parse({
  ...mockCardAtDistributor,
  distributionTimeline: [
    { stat: CardStat.PRINTED, at: "2026-06-01T09:00:00.000Z" },
    { stat: CardStat.IN_LOT, at: "2026-06-02T09:00:00.000Z" },
    { stat: CardStat.AT_DISTRIBUTOR, at: "2026-06-05T09:00:00.000Z" },
  ],
});

export const mockAvailableCard: AvailableCardDTO = AvailableCardResponseSchema.parse({
  id: "73000000-0000-4000-8000-000000000003",
  key: "OOOO-PPPP-QQQQ-RRRR",
  subscriptionLabel: "Snapchat+ — 1 Week",
});

export const mockPaginatedCards: PaginatedCards = PaginatedCardsSchema.parse({
  items: [mockCardAtDistributor, mockCardInSet],
  meta: { page: 1, limit: 10, total: 2, totalPages: 1 },
});
