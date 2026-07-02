import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http } from "msw";
import { server } from "../../fixtures/msw/server";
import { lotUrls } from "../../fixtures/msw/lots.handlers";
import { cardUrls } from "../../fixtures/msw/cards.handlers";
import { ok } from "../../fixtures/msw/envelope";
import { createQueryWrapper } from "../../fixtures/wrappers/createQueryWrapper";
import { mockPaginatedLots, mockLotDelivered } from "../../fixtures/data/lots.mock";
import { mockPaginatedCards } from "../../fixtures/data/cards.mock";
import { useLots, useAvailableLotsForOrder, useCreateLot, useDeleteLot } from "@/hooks/useLots";
import { useCards } from "@/hooks/useCards";

describe("lots query hooks", () => {
  it("useLots resolves with the unwrapped paginated result", async () => {
    const { result } = renderHook(() => useLots({}), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockPaginatedLots);
  });

  it("useAvailableLotsForOrder resolves via its own literal-path handler", async () => {
    const { result } = renderHook(() => useAvailableLotsForOrder({}), {
      wrapper: createQueryWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([mockLotDelivered]);
  });
});

describe("lot mutations invalidate both lots and cards (plan.md §3.2 — cards move IN_LOT/back)", () => {
  async function expectLotsAndCardsInvalidated(
    wrapper: ReturnType<typeof createQueryWrapper>,
    fire: () => void,
    isSuccess: () => boolean,
  ) {
    let lotsCalls = 0;
    let cardsCalls = 0;
    server.use(
      http.get(lotUrls.getAll, () => {
        lotsCalls += 1;
        return ok(mockPaginatedLots);
      }),
      http.get(cardUrls.getAll, () => {
        cardsCalls += 1;
        return ok(mockPaginatedCards);
      }),
    );

    const { result: lotsResult } = renderHook(() => useLots({}), { wrapper });
    const { result: cardsResult } = renderHook(() => useCards({}), { wrapper });
    await waitFor(() => expect(lotsResult.current.isSuccess).toBe(true));
    await waitFor(() => expect(cardsResult.current.isSuccess).toBe(true));
    expect(lotsCalls).toBe(1);
    expect(cardsCalls).toBe(1);

    fire();
    await waitFor(() => expect(isSuccess()).toBe(true));

    await waitFor(() => expect(lotsCalls).toBe(2));
    await waitFor(() => expect(cardsCalls).toBe(2));
  }

  it("useCreateLot invalidates both", async () => {
    const wrapper = createQueryWrapper();
    const { result } = renderHook(() => useCreateLot(), { wrapper });
    await expectLotsAndCardsInvalidated(
      wrapper,
      () => result.current.mutate({ subscriptionPlanId: "id", cardIds: ["a"] }),
      () => result.current.isSuccess,
    );
  });

  it("useDeleteLot invalidates both", async () => {
    const wrapper = createQueryWrapper();
    const { result } = renderHook(() => useDeleteLot(), { wrapper });
    await expectLotsAndCardsInvalidated(
      wrapper,
      () => result.current.mutate("id"),
      () => result.current.isSuccess,
    );
  });
});
