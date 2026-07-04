import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http } from "msw";
import { SubscriptionType, SubscriptionDuration } from "@my-app/contract";
import { server } from "../../fixtures/msw/server";
import { subscriptionPlanUrls } from "../../fixtures/msw/subscription-plans.handlers";
import { ok } from "../../fixtures/msw/envelope";
import { createQueryWrapper } from "../../fixtures/wrappers/createQueryWrapper";
import {
  mockSubscriptionPlans,
  mockCommissionDurations,
  mockCommissionMatrix,
} from "../../fixtures/data/plans.mock";
import {
  useSubscriptionPlans,
  useCommissionDurations,
  useCommissions,
  useCreateSubscriptionPlan,
  useToggleSubscriptionPlan,
  useUpdateCommission,
} from "@/hooks/useSubscriptionPlans";

describe("subscription-plans query hooks", () => {
  it("useSubscriptionPlans resolves with the unwrapped array", async () => {
    const { result } = renderHook(() => useSubscriptionPlans({}), {
      wrapper: createQueryWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockSubscriptionPlans);
  });

  it("useCommissionDurations resolves with the unwrapped array", async () => {
    const { result } = renderHook(() => useCommissionDurations(), {
      wrapper: createQueryWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockCommissionDurations);
  });

  it("useCommissions resolves with the unwrapped matrix, null cells reaching the hook untouched", async () => {
    const { result } = renderHook(() => useCommissions(), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockCommissionMatrix);
    expect(result.current.data?.rows[0].cells[1].commission).toBeNull();
  });
});

describe("useCreateSubscriptionPlan / useToggleSubscriptionPlan invalidate the subscription-plans domain", () => {
  async function expectPlansAllInvalidated(
    wrapper: ReturnType<typeof createQueryWrapper>,
    fire: () => void,
    isSuccess: () => boolean,
  ) {
    let plansCalls = 0;
    server.use(
      http.get(subscriptionPlanUrls.getAll, () => {
        plansCalls += 1;
        return ok(mockSubscriptionPlans);
      }),
    );
    const { result: listResult } = renderHook(() => useSubscriptionPlans({}), { wrapper });
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true));
    expect(plansCalls).toBe(1);

    fire();
    await waitFor(() => expect(isSuccess()).toBe(true));
    await waitFor(() => expect(plansCalls).toBe(2));
  }

  it("useCreateSubscriptionPlan invalidates the plans list", async () => {
    const wrapper = createQueryWrapper();
    const { result } = renderHook(() => useCreateSubscriptionPlan(), { wrapper });
    await expectPlansAllInvalidated(
      wrapper,
      () =>
        result.current.mutate({
          subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
          subscriptionDuration: SubscriptionDuration.ONE_MONTH,
        }),
      () => result.current.isSuccess,
    );
  });

  it("useToggleSubscriptionPlan invalidates the plans list", async () => {
    const wrapper = createQueryWrapper();
    const { result } = renderHook(() => useToggleSubscriptionPlan(), { wrapper });
    await expectPlansAllInvalidated(
      wrapper,
      () => result.current.mutate("id"),
      () => result.current.isSuccess,
    );
  });
});

describe("useUpdateCommission invalidates the commissions + commission-durations keys, not the plans list (plan.md §3.2)", () => {
  it("invalidates commissions and commission-durations, leaves the plans list alone", async () => {
    const wrapper = createQueryWrapper();

    let plansCalls = 0;
    let commissionsCalls = 0;
    let durationsCalls = 0;
    server.use(
      http.get(subscriptionPlanUrls.getAll, () => {
        plansCalls += 1;
        return ok(mockSubscriptionPlans);
      }),
      http.get(subscriptionPlanUrls.getCommissions, () => {
        commissionsCalls += 1;
        return ok(mockCommissionMatrix);
      }),
      http.get(subscriptionPlanUrls.getCommissionDurations, () => {
        durationsCalls += 1;
        return ok(mockCommissionDurations);
      }),
    );

    const { result: plansResult } = renderHook(() => useSubscriptionPlans({}), { wrapper });
    const { result: commissionsResult } = renderHook(() => useCommissions(), { wrapper });
    const { result: durationsResult } = renderHook(() => useCommissionDurations(), { wrapper });
    await waitFor(() => expect(plansResult.current.isSuccess).toBe(true));
    await waitFor(() => expect(commissionsResult.current.isSuccess).toBe(true));
    await waitFor(() => expect(durationsResult.current.isSuccess).toBe(true));
    expect(plansCalls).toBe(1);
    expect(commissionsCalls).toBe(1);
    expect(durationsCalls).toBe(1);

    const { result: mutationResult } = renderHook(() => useUpdateCommission(), { wrapper });
    mutationResult.current.mutate({
      subscriptionPlanId: "id",
      commissionDurationId: "id",
      commission: 75,
    });
    await waitFor(() => expect(mutationResult.current.isSuccess).toBe(true));

    await waitFor(() => expect(commissionsCalls).toBe(2));
    await waitFor(() => expect(durationsCalls).toBe(2));
    expect(plansCalls).toBe(1);
  });
});
