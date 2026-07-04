import {
  SetResponseSchema,
  PaginatedSetsSchema,
  SetStat,
  type SetDTO,
  type PaginatedSets,
} from "@my-app/contract";

export const mockSetPrinted: SetDTO = SetResponseSchema.parse({
  id: "71000000-0000-4000-8000-000000000001",
  setNumber: "SET-2026-001",
  subscriptionPlanId: "81000000-0000-4000-8000-000000000001",
  subscriptionLabel: "Snapchat+ — 1 Month",
  numberOfKeys: 100,
  setStat: SetStat.PRINTED,
  createdAt: "2026-06-01T09:00:00.000Z",
  printedAt: "2026-06-02T09:00:00.000Z",
});

export const mockSetNotPrinted: SetDTO = SetResponseSchema.parse({
  ...mockSetPrinted,
  id: "71000000-0000-4000-8000-000000000002",
  setStat: SetStat.NOT_PRINTED,
  printedAt: null,
});

export const mockPaginatedSets: PaginatedSets = PaginatedSetsSchema.parse({
  items: [mockSetPrinted, mockSetNotPrinted],
  meta: { page: 1, limit: 10, total: 2, totalPages: 1 },
});
