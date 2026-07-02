import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http } from "msw";
import { server } from "../../fixtures/msw/server";
import { paymentUrls } from "../../fixtures/msw/payments.handlers";
import { activatorUrls } from "../../fixtures/msw/activators.handlers";
import { ok } from "../../fixtures/msw/envelope";
import { createQueryWrapper } from "../../fixtures/wrappers/createQueryWrapper";
import { mockPaginatedPayments } from "../../fixtures/data/payments.mock";
import { mockPaginatedActivators } from "../../fixtures/data/activators.mock";
import { usePayments, useRecordPayment, useDeletePayment } from "@/hooks/usePayments";
import { useActivators } from "@/hooks/useActivators";

describe("usePayments", () => {
  it("resolves with the unwrapped paginated result", async () => {
    const { result } = renderHook(() => usePayments({ page: 1, limit: 10 }), {
      wrapper: createQueryWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockPaginatedPayments);
  });
});

describe("payment mutations invalidate both payments and activators (plan.md §3.2 — credits change)", () => {
  async function expectPaymentsAndActivatorsInvalidated(
    wrapper: ReturnType<typeof createQueryWrapper>,
    fire: () => void,
    isSuccess: () => boolean,
  ) {
    let paymentsCalls = 0;
    let activatorsCalls = 0;
    server.use(
      http.get(paymentUrls.getAll, () => {
        paymentsCalls += 1;
        return ok(mockPaginatedPayments);
      }),
      http.get(activatorUrls.getAll, () => {
        activatorsCalls += 1;
        return ok(mockPaginatedActivators);
      }),
    );

    const { result: paymentsResult } = renderHook(() => usePayments({ page: 1, limit: 10 }), {
      wrapper,
    });
    const { result: activatorsResult } = renderHook(() => useActivators({ page: 1, limit: 10 }), {
      wrapper,
    });
    await waitFor(() => expect(paymentsResult.current.isSuccess).toBe(true));
    await waitFor(() => expect(activatorsResult.current.isSuccess).toBe(true));
    expect(paymentsCalls).toBe(1);
    expect(activatorsCalls).toBe(1);

    fire();
    await waitFor(() => expect(isSuccess()).toBe(true));

    await waitFor(() => expect(paymentsCalls).toBe(2));
    await waitFor(() => expect(activatorsCalls).toBe(2));
  }

  it("useRecordPayment invalidates both payments and activators", async () => {
    const wrapper = createQueryWrapper();
    const { result } = renderHook(() => useRecordPayment(), { wrapper });
    await expectPaymentsAndActivatorsInvalidated(
      wrapper,
      () => result.current.mutate({ activatorId: "id", amount: 1000 }),
      () => result.current.isSuccess,
    );
  });

  it("useDeletePayment invalidates both payments and activators", async () => {
    const wrapper = createQueryWrapper();
    const { result } = renderHook(() => useDeletePayment(), { wrapper });
    await expectPaymentsAndActivatorsInvalidated(
      wrapper,
      () => result.current.mutate("id"),
      () => result.current.isSuccess,
    );
  });
});
