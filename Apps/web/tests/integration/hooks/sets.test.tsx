import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http } from "msw";
import { SetStat } from "@my-app/contract";
import { server } from "../../fixtures/msw/server";
import { setUrls } from "../../fixtures/msw/sets.handlers";
import { cardUrls } from "../../fixtures/msw/cards.handlers";
import { ok } from "../../fixtures/msw/envelope";
import { createQueryWrapper } from "../../fixtures/wrappers/createQueryWrapper";
import { mockPaginatedSets } from "../../fixtures/data/sets.mock";
import { mockPaginatedCards } from "../../fixtures/data/cards.mock";
import { useSets, useCreateSet, useTransitionSet, useDeleteSet } from "@/hooks/useSets";
import { useCards } from "@/hooks/useCards";

describe("useSets", () => {
  it("resolves with the unwrapped paginated result", async () => {
    const { result } = renderHook(() => useSets({}), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockPaginatedSets);
  });
});

describe("set mutations invalidate both sets and cards (plan.md §3.2 — set lifecycle re-states cards)", () => {
  async function expectSetsAndCardsInvalidated(
    wrapper: ReturnType<typeof createQueryWrapper>,
    fire: () => void,
    isSuccess: () => boolean,
  ) {
    let setsCalls = 0;
    let cardsCalls = 0;
    server.use(
      http.get(setUrls.getAll, () => {
        setsCalls += 1;
        return ok(mockPaginatedSets);
      }),
      http.get(cardUrls.getAll, () => {
        cardsCalls += 1;
        return ok(mockPaginatedCards);
      }),
    );

    const { result: setsResult } = renderHook(() => useSets({}), { wrapper });
    const { result: cardsResult } = renderHook(() => useCards({}), { wrapper });
    await waitFor(() => expect(setsResult.current.isSuccess).toBe(true));
    await waitFor(() => expect(cardsResult.current.isSuccess).toBe(true));
    expect(setsCalls).toBe(1);
    expect(cardsCalls).toBe(1);

    fire();
    await waitFor(() => expect(isSuccess()).toBe(true));

    await waitFor(() => expect(setsCalls).toBe(2));
    await waitFor(() => expect(cardsCalls).toBe(2));
  }

  it("useCreateSet invalidates both", async () => {
    const wrapper = createQueryWrapper();
    const { result } = renderHook(() => useCreateSet(), { wrapper });
    await expectSetsAndCardsInvalidated(
      wrapper,
      () => result.current.mutate({ numberOfKeys: 100, subscriptionPlanId: "id" }),
      () => result.current.isSuccess,
    );
  });

  it("useTransitionSet invalidates both", async () => {
    const wrapper = createQueryWrapper();
    const { result } = renderHook(() => useTransitionSet(), { wrapper });
    await expectSetsAndCardsInvalidated(
      wrapper,
      () => result.current.mutate({ id: "id", command: { to: SetStat.PRINTED } }),
      () => result.current.isSuccess,
    );
  });

  it("useDeleteSet invalidates both", async () => {
    const wrapper = createQueryWrapper();
    const { result } = renderHook(() => useDeleteSet(), { wrapper });
    await expectSetsAndCardsInvalidated(
      wrapper,
      () => result.current.mutate("id"),
      () => result.current.isSuccess,
    );
  });
});
