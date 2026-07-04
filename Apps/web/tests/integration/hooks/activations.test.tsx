import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useQuery } from "@tanstack/react-query";
import { http } from "msw";
import { AccountInformation } from "@my-app/contract";
import { server } from "../../fixtures/msw/server";
import { activationsUrls, activationsErrorHandlers } from "../../fixtures/msw/activations.handlers";
import { ok } from "../../fixtures/msw/envelope";
import { createQueryWrapper } from "../../fixtures/wrappers/createQueryWrapper";

// Several activator-flow mutation hooks fire a toast via useTranslation, which reads
// LanguageProvider context — mock the hook rather than wrap every test in a real provider
// (test-rules §6).
vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({ t: (key: string) => key, language: "en" }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
import { toast } from "sonner";

import {
  mockPendingActivation,
  mockActiveRequestNulls,
  mockRecentActivation,
  mockPaginatedHistory,
  mockPaginatedActivations,
  mockActivationDetail,
  mockAdminActivation,
} from "../../fixtures/data/activations.mock";
import { usePendingActivations } from "@/hooks/usePendingActivations";
import { useActiveRequests } from "@/hooks/useActiveRequests";
import { useRecentActivations } from "@/hooks/useRecentActivations";
import { useMyHistory } from "@/hooks/useMyHistory";
import { useTakeActivation } from "@/hooks/useTakeActivation";
import { useFlagWrongInfo } from "@/hooks/useFlagWrongInfo";
import { useRequestAdditionalInfo } from "@/hooks/useRequestAdditionalInfo";
import { useActivateRequest } from "@/hooks/useActivateRequest";
import { useFreezeActivation } from "@/hooks/useFreezeActivation";
import { useCancelActivation } from "@/hooks/useCancelActivation";
import {
  useAdminActivations,
  useActivationDetail,
  useActivateByAdmin,
  useCancelByAdmin,
  useSetActivationPrice,
} from "@/hooks/useAdminActivations";
import { qk } from "@/lib/query-keys";

describe("activations query hooks", () => {
  it("usePendingActivations resolves with the unwrapped array", async () => {
    const { result } = renderHook(() => usePendingActivations(), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([mockPendingActivation]);
  });

  it("useActiveRequests resolves with the unwrapped array", async () => {
    const { result } = renderHook(() => useActiveRequests(), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([mockActiveRequestNulls]);
  });

  it("useRecentActivations resolves with the unwrapped array", async () => {
    const { result } = renderHook(() => useRecentActivations(), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([mockRecentActivation]);
  });

  it("useMyHistory resolves with the unwrapped paginated result", async () => {
    const { result } = renderHook(() => useMyHistory({ page: 1, limit: 10 }), {
      wrapper: createQueryWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockPaginatedHistory);
  });
});

describe("activator-flow mutation invalidations (plan.md §3.2)", () => {
  it("useTakeActivation invalidates pending and active", async () => {
    const wrapper = createQueryWrapper();
    let pendingCalls = 0;
    let activeCalls = 0;
    server.use(
      http.get(activationsUrls.pending, () => {
        pendingCalls += 1;
        return ok([mockPendingActivation]);
      }),
      http.get(activationsUrls.active, () => {
        activeCalls += 1;
        return ok([mockActiveRequestNulls]);
      }),
    );

    const { result: pendingResult } = renderHook(() => usePendingActivations(), { wrapper });
    const { result: activeResult } = renderHook(() => useActiveRequests(), { wrapper });
    await waitFor(() => expect(pendingResult.current.isSuccess).toBe(true));
    await waitFor(() => expect(activeResult.current.isSuccess).toBe(true));
    expect(pendingCalls).toBe(1);
    expect(activeCalls).toBe(1);

    const { result: takeResult } = renderHook(() => useTakeActivation(), { wrapper });
    takeResult.current.mutate("a2000000-0000-4000-8000-000000000001");
    await waitFor(() => expect(takeResult.current.isSuccess).toBe(true));

    await waitFor(() => expect(pendingCalls).toBe(2));
    await waitFor(() => expect(activeCalls).toBe(2));
  });

  it("useTakeActivation shows the take-race message (not the raw backend error) on a 409", async () => {
    server.use(activationsErrorHandlers.takeConflict());
    const { result } = renderHook(() => useTakeActivation(), { wrapper: createQueryWrapper() });

    result.current.mutate("a2000000-0000-4000-8000-000000000001");
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toast.error).toHaveBeenCalledWith("activator.requests.takeRaceToast");
    expect(toast.error).not.toHaveBeenCalledWith("Already taken");
  });

  it("useFlagWrongInfo and useRequestAdditionalInfo both invalidate active only", async () => {
    const wrapper = createQueryWrapper();
    let activeCalls = 0;
    server.use(
      http.get(activationsUrls.active, () => {
        activeCalls += 1;
        return ok([mockActiveRequestNulls]);
      }),
    );

    const { result: activeResult } = renderHook(() => useActiveRequests(), { wrapper });
    await waitFor(() => expect(activeResult.current.isSuccess).toBe(true));
    expect(activeCalls).toBe(1);

    const { result: flagResult } = renderHook(() => useFlagWrongInfo(), { wrapper });
    flagResult.current.mutate({ id: "id", command: { fields: [AccountInformation.USERNAME] } });
    await waitFor(() => expect(flagResult.current.isSuccess).toBe(true));
    await waitFor(() => expect(activeCalls).toBe(2));

    const { result: additionalResult } = renderHook(() => useRequestAdditionalInfo(), { wrapper });
    additionalResult.current.mutate({ id: "id", command: { fields: [AccountInformation.OTP] } });
    await waitFor(() => expect(additionalResult.current.isSuccess).toBe(true));
    await waitFor(() => expect(activeCalls).toBe(3));
  });

  async function expectActiveHistoryRecentInvalidated(
    wrapper: ReturnType<typeof createQueryWrapper>,
    fire: () => void,
    isSuccess: () => boolean,
  ) {
    let activeCalls = 0;
    let historyCalls = 0;
    let recentCalls = 0;
    server.use(
      http.get(activationsUrls.active, () => {
        activeCalls += 1;
        return ok([mockActiveRequestNulls]);
      }),
      http.get(activationsUrls.myHistory, () => {
        historyCalls += 1;
        return ok(mockPaginatedHistory);
      }),
      http.get(activationsUrls.recent, () => {
        recentCalls += 1;
        return ok([mockRecentActivation]);
      }),
    );

    const { result: activeResult } = renderHook(() => useActiveRequests(), { wrapper });
    const { result: historyResult } = renderHook(() => useMyHistory({}), { wrapper });
    const { result: recentResult } = renderHook(() => useRecentActivations(), { wrapper });
    await waitFor(() => expect(activeResult.current.isSuccess).toBe(true));
    await waitFor(() => expect(historyResult.current.isSuccess).toBe(true));
    await waitFor(() => expect(recentResult.current.isSuccess).toBe(true));

    fire();
    await waitFor(() => expect(isSuccess()).toBe(true));

    await waitFor(() => expect(activeCalls).toBe(2));
    await waitFor(() => expect(historyCalls).toBe(2));
    await waitFor(() => expect(recentCalls).toBe(2));
  }

  it("useActivateRequest invalidates active, my-history, and recent", async () => {
    const wrapper = createQueryWrapper();
    const { result } = renderHook(() => useActivateRequest(), { wrapper });
    await expectActiveHistoryRecentInvalidated(
      wrapper,
      () => result.current.mutate("id"),
      () => result.current.isSuccess,
    );
  });

  it("useFreezeActivation invalidates active, my-history, and recent", async () => {
    const wrapper = createQueryWrapper();
    const { result } = renderHook(() => useFreezeActivation(), { wrapper });
    await expectActiveHistoryRecentInvalidated(
      wrapper,
      () => result.current.mutate({ id: "id", command: { reason: "test" } }),
      () => result.current.isSuccess,
    );
  });

  it("useCancelActivation invalidates active, my-history, recent, and the normalized qk.activators.myStats() key", async () => {
    const wrapper = createQueryWrapper();
    let activeCalls = 0;
    let myStatsCalls = 0;
    server.use(
      http.get(activationsUrls.active, () => {
        activeCalls += 1;
        return ok([mockActiveRequestNulls]);
      }),
    );

    const { result: activeResult } = renderHook(() => useActiveRequests(), { wrapper });
    await waitFor(() => expect(activeResult.current.isSuccess).toBe(true));
    expect(activeCalls).toBe(1);

    // Seed a raw query under the exact normalized key this new hook targets, to prove it
    // (not the legacy singular key the four pre-existing hooks still use).
    const { result: myStatsResult } = renderHook(
      () =>
        useQuery({
          queryKey: qk.activators.myStats(),
          queryFn: () => {
            myStatsCalls += 1;
            return Promise.resolve({ ok: true });
          },
        }),
      { wrapper },
    );
    await waitFor(() => expect(myStatsResult.current.isSuccess).toBe(true));
    expect(myStatsCalls).toBe(1);

    const { result: cancelResult } = renderHook(() => useCancelActivation(), { wrapper });
    cancelResult.current.mutate("id");
    await waitFor(() => expect(cancelResult.current.isSuccess).toBe(true));

    await waitFor(() => expect(activeCalls).toBe(2));
    await waitFor(() => expect(myStatsCalls).toBe(2));
  });
});

describe("admin activation hooks (no UI consumer yet — full contract coverage, plan.md D2)", () => {
  it("useAdminActivations resolves with the unwrapped paginated result", async () => {
    const { result } = renderHook(() => useAdminActivations({}), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockPaginatedActivations);
  });

  it("useActivationDetail is enabled-gated on a truthy id", async () => {
    let called = false;
    server.use(
      http.get(activationsUrls.byId, () => {
        called = true;
        return ok(mockActivationDetail);
      }),
    );
    const { result } = renderHook(() => useActivationDetail(""), { wrapper: createQueryWrapper() });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(called).toBe(false);
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("useActivationDetail fetches once given a real id", async () => {
    const { result } = renderHook(() => useActivationDetail("id"), {
      wrapper: createQueryWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockActivationDetail);
  });

  async function expectDomainPrefixesInvalidated(
    wrapper: ReturnType<typeof createQueryWrapper>,
    fire: () => void,
    isSuccess: () => boolean,
  ) {
    let activationsAllCalls = 0;
    let activatorsAllCalls = 0;

    const { result: activationsAllResult } = renderHook(
      () =>
        useQuery({
          queryKey: qk.activations.all(),
          queryFn: () => {
            activationsAllCalls += 1;
            return Promise.resolve(mockAdminActivation);
          },
        }),
      { wrapper },
    );
    const { result: activatorsAllResult } = renderHook(
      () =>
        useQuery({
          queryKey: qk.activators.all(),
          queryFn: () => {
            activatorsAllCalls += 1;
            return Promise.resolve({ ok: true });
          },
        }),
      { wrapper },
    );
    await waitFor(() => expect(activationsAllResult.current.isSuccess).toBe(true));
    await waitFor(() => expect(activatorsAllResult.current.isSuccess).toBe(true));

    fire();
    await waitFor(() => expect(isSuccess()).toBe(true));

    await waitFor(() => expect(activationsAllCalls).toBe(2));
    await waitFor(() => expect(activatorsAllCalls).toBe(2));
  }

  it("useActivateByAdmin invalidates the activations and activators domain prefixes", async () => {
    const wrapper = createQueryWrapper();
    const { result } = renderHook(() => useActivateByAdmin(), { wrapper });
    await expectDomainPrefixesInvalidated(
      wrapper,
      () => result.current.mutate("id"),
      () => result.current.isSuccess,
    );
  });

  it("useCancelByAdmin invalidates the activations and activators domain prefixes", async () => {
    const wrapper = createQueryWrapper();
    const { result } = renderHook(() => useCancelByAdmin(), { wrapper });
    await expectDomainPrefixesInvalidated(
      wrapper,
      () => result.current.mutate("id"),
      () => result.current.isSuccess,
    );
  });

  it("useSetActivationPrice invalidates the activations and activators domain prefixes", async () => {
    const wrapper = createQueryWrapper();
    const { result } = renderHook(() => useSetActivationPrice(), { wrapper });
    await expectDomainPrefixesInvalidated(
      wrapper,
      () => result.current.mutate({ id: "id", command: { amount: 100 } }),
      () => result.current.isSuccess,
    );
  });
});
