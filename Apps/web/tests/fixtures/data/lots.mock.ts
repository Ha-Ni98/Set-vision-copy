import {
  LotResponseSchema,
  PaginatedLotsSchema,
  LotStat,
  type LotDTO,
  type PaginatedLots,
} from "@my-app/contract";

export const mockLotDelivered: LotDTO = LotResponseSchema.parse({
  id: "72000000-0000-4000-8000-000000000001",
  lotNumber: "LOT-2026-001",
  subscriptionPlanId: "81000000-0000-4000-8000-000000000001",
  subscriptionLabel: "Snapchat+ — 1 Month",
  lotStat: LotStat.DELIVERED,
  nbOfCards: 50,
  deliveredCardsCount: 50,
  isReturned: false,
  createdAt: "2026-06-01T09:00:00.000Z",
  deliveryDate: "2026-06-05T09:00:00.000Z",
});

// deliveryDate is LotDTO's only nullable field — a lot not yet shipped.
export const mockLotPending: LotDTO = LotResponseSchema.parse({
  ...mockLotDelivered,
  id: "72000000-0000-4000-8000-000000000002",
  lotStat: LotStat.PENDING,
  deliveredCardsCount: 0,
  deliveryDate: null,
});

export const mockPaginatedLots: PaginatedLots = PaginatedLotsSchema.parse({
  items: [mockLotDelivered, mockLotPending],
  meta: { page: 1, limit: 10, total: 2, totalPages: 1 },
});
