import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http } from "msw";
import { OrderStat, DeliveryType } from "@my-app/contract";
import { server } from "../../fixtures/msw/server";
import { orderUrls } from "../../fixtures/msw/orders.handlers";
import { lotUrls } from "../../fixtures/msw/lots.handlers";
import { cardUrls } from "../../fixtures/msw/cards.handlers";
import { distributorUrls } from "../../fixtures/msw/distributors.handlers";
import { ok } from "../../fixtures/msw/envelope";
import { createQueryWrapper } from "../../fixtures/wrappers/createQueryWrapper";
import { mockPaginatedOrders, mockOrderDetail } from "../../fixtures/data/orders.mock";
import { mockPaginatedLots } from "../../fixtures/data/lots.mock";
import { mockPaginatedCards } from "../../fixtures/data/cards.mock";
import { mockPaginatedDistributors } from "../../fixtures/data/distributors.mock";
import {
  useOrders,
  useOrder,
  useCreateOrder,
  useTransitionOrder,
  useDeleteOrder,
} from "@/hooks/useOrders";
import { useLots } from "@/hooks/useLots";
import { useCards } from "@/hooks/useCards";
import { useDistributors } from "@/hooks/useDistributors";

describe("orders query hooks", () => {
  it("useOrders resolves with the unwrapped paginated result", async () => {
    const { result } = renderHook(() => useOrders({}), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockPaginatedOrders);
  });

  it("useOrder is enabled-gated on a truthy id", async () => {
    let called = false;
    server.use(
      http.get(orderUrls.getById, () => {
        called = true;
        return ok(mockOrderDetail);
      }),
    );
    renderHook(() => useOrder(""), { wrapper: createQueryWrapper() });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(called).toBe(false);
  });

  it("useOrder fetches once given a real id, returning the detail DTO with its embedded lots", async () => {
    const { result } = renderHook(() => useOrder("id"), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockOrderDetail);
  });
});

describe("useCreateOrder / useDeleteOrder invalidate orders and lots (plan.md §3.2 — lots reserved/freed)", () => {
  async function expectOrdersAndLotsInvalidated(
    wrapper: ReturnType<typeof createQueryWrapper>,
    fire: () => void,
    isSuccess: () => boolean,
  ) {
    let ordersCalls = 0;
    let lotsCalls = 0;
    server.use(
      http.get(orderUrls.getAll, () => {
        ordersCalls += 1;
        return ok(mockPaginatedOrders);
      }),
      http.get(lotUrls.getAll, () => {
        lotsCalls += 1;
        return ok(mockPaginatedLots);
      }),
    );
    const { result: listResult } = renderHook(() => useOrders({}), { wrapper });
    const { result: lotsResult } = renderHook(() => useLots({}), { wrapper });
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true));
    await waitFor(() => expect(lotsResult.current.isSuccess).toBe(true));
    expect(ordersCalls).toBe(1);
    expect(lotsCalls).toBe(1);

    fire();
    await waitFor(() => expect(isSuccess()).toBe(true));
    await waitFor(() => expect(ordersCalls).toBe(2));
    await waitFor(() => expect(lotsCalls).toBe(2));
  }

  it("useCreateOrder invalidates both", async () => {
    const wrapper = createQueryWrapper();
    const { result } = renderHook(() => useCreateOrder(), { wrapper });
    await expectOrdersAndLotsInvalidated(
      wrapper,
      () =>
        result.current.mutate({
          distributorId: "id",
          lotIds: ["id"],
          receivedName: "Karim Ferhat",
          receivedPhone: "0555444555",
          wilayaId: "id",
          communeId: "id",
          deliveryCompanyId: "id",
          deliveryType: DeliveryType.HOME,
          orderPrice: 15000,
          deliverPrice: 500,
        }),
      () => result.current.isSuccess,
    );
  });

  it("useDeleteOrder invalidates both", async () => {
    const wrapper = createQueryWrapper();
    const { result } = renderHook(() => useDeleteOrder(), { wrapper });
    await expectOrdersAndLotsInvalidated(
      wrapper,
      () => result.current.mutate("id"),
      () => result.current.isSuccess,
    );
  });
});

describe("useTransitionOrder invalidates the four-family fan-out (plan.md §3.2 — orders, lots, cards, distributors)", () => {
  it("invalidates orders, lots, cards, and distributors together", async () => {
    const wrapper = createQueryWrapper();

    let ordersCalls = 0;
    let lotsCalls = 0;
    let cardsCalls = 0;
    let distributorsCalls = 0;
    server.use(
      http.get(orderUrls.getAll, () => {
        ordersCalls += 1;
        return ok(mockPaginatedOrders);
      }),
      http.get(lotUrls.getAll, () => {
        lotsCalls += 1;
        return ok(mockPaginatedLots);
      }),
      http.get(cardUrls.getAll, () => {
        cardsCalls += 1;
        return ok(mockPaginatedCards);
      }),
      http.get(distributorUrls.getAll, () => {
        distributorsCalls += 1;
        return ok(mockPaginatedDistributors);
      }),
    );

    const { result: ordersResult } = renderHook(() => useOrders({}), { wrapper });
    const { result: lotsResult } = renderHook(() => useLots({}), { wrapper });
    const { result: cardsResult } = renderHook(() => useCards({}), { wrapper });
    const { result: distributorsResult } = renderHook(() => useDistributors({}), { wrapper });
    await waitFor(() => expect(ordersResult.current.isSuccess).toBe(true));
    await waitFor(() => expect(lotsResult.current.isSuccess).toBe(true));
    await waitFor(() => expect(cardsResult.current.isSuccess).toBe(true));
    await waitFor(() => expect(distributorsResult.current.isSuccess).toBe(true));
    expect(ordersCalls).toBe(1);
    expect(lotsCalls).toBe(1);
    expect(cardsCalls).toBe(1);
    expect(distributorsCalls).toBe(1);

    const { result: mutationResult } = renderHook(() => useTransitionOrder(), { wrapper });
    mutationResult.current.mutate({ id: "id", command: { to: OrderStat.IN_DELIVERY } });
    await waitFor(() => expect(mutationResult.current.isSuccess).toBe(true));

    await waitFor(() => expect(ordersCalls).toBe(2));
    await waitFor(() => expect(lotsCalls).toBe(2));
    await waitFor(() => expect(cardsCalls).toBe(2));
    await waitFor(() => expect(distributorsCalls).toBe(2));
  });
});
