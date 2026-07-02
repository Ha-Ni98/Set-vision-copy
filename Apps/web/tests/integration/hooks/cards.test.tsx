import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http } from "msw";
import { server } from "../../fixtures/msw/server";
import { cardUrls } from "../../fixtures/msw/cards.handlers";
import { ok } from "../../fixtures/msw/envelope";
import { createQueryWrapper } from "../../fixtures/wrappers/createQueryWrapper";
import {
  mockPaginatedCards,
  mockAvailableCard,
  mockCardDetail,
} from "../../fixtures/data/cards.mock";
import {
  useCards,
  useAvailableCardsForLot,
  useCard,
  useDeleteCard,
  useDisableCard,
  useEnableCard,
  useRevokeCard,
} from "@/hooks/useCards";

describe("cards query hooks", () => {
  it("useCards resolves with the unwrapped paginated result", async () => {
    const { result } = renderHook(() => useCards({}), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockPaginatedCards);
  });

  it("useAvailableCardsForLot is enabled-gated on a truthy subscriptionPlanId", async () => {
    let called = false;
    server.use(
      http.get(cardUrls.getAvailableForLot, () => {
        called = true;
        return ok([mockAvailableCard]);
      }),
    );
    renderHook(() => useAvailableCardsForLot(undefined), { wrapper: createQueryWrapper() });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(called).toBe(false);
  });

  it("useAvailableCardsForLot fetches once a plan id is provided", async () => {
    const { result } = renderHook(() => useAvailableCardsForLot("id"), {
      wrapper: createQueryWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([mockAvailableCard]);
  });

  it("useCard is enabled-gated on a truthy id", async () => {
    let called = false;
    server.use(
      http.get(cardUrls.getById, () => {
        called = true;
        return ok(mockCardDetail);
      }),
    );
    renderHook(() => useCard(""), { wrapper: createQueryWrapper() });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(called).toBe(false);
  });

  it("useCard fetches once given a real id", async () => {
    const { result } = renderHook(() => useCard("id"), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockCardDetail);
  });
});

describe("card mutations invalidate only the cards domain (plan.md §3.2 — own-domain only, cards are the leaf)", () => {
  async function expectCardsAllInvalidated(
    wrapper: ReturnType<typeof createQueryWrapper>,
    fire: () => void,
    isSuccess: () => boolean,
  ) {
    let cardsCalls = 0;
    server.use(
      http.get(cardUrls.getAll, () => {
        cardsCalls += 1;
        return ok(mockPaginatedCards);
      }),
    );
    const { result: listResult } = renderHook(() => useCards({}), { wrapper });
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true));
    expect(cardsCalls).toBe(1);

    fire();
    await waitFor(() => expect(isSuccess()).toBe(true));
    await waitFor(() => expect(cardsCalls).toBe(2));
  }

  it("useDeleteCard invalidates the cards list", async () => {
    const wrapper = createQueryWrapper();
    const { result } = renderHook(() => useDeleteCard(), { wrapper });
    await expectCardsAllInvalidated(
      wrapper,
      () => result.current.mutate("id"),
      () => result.current.isSuccess,
    );
  });

  it("useDisableCard invalidates the cards list", async () => {
    const wrapper = createQueryWrapper();
    const { result } = renderHook(() => useDisableCard(), { wrapper });
    await expectCardsAllInvalidated(
      wrapper,
      () => result.current.mutate("id"),
      () => result.current.isSuccess,
    );
  });

  it("useEnableCard invalidates the cards list", async () => {
    const wrapper = createQueryWrapper();
    const { result } = renderHook(() => useEnableCard(), { wrapper });
    await expectCardsAllInvalidated(
      wrapper,
      () => result.current.mutate("id"),
      () => result.current.isSuccess,
    );
  });

  it("useRevokeCard invalidates the cards list", async () => {
    const wrapper = createQueryWrapper();
    const { result } = renderHook(() => useRevokeCard(), { wrapper });
    await expectCardsAllInvalidated(
      wrapper,
      () => result.current.mutate("id"),
      () => result.current.isSuccess,
    );
  });
});
