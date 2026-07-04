import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http } from "msw";
import type { ReactNode } from "react";
import { server } from "../../fixtures/msw/server";
import { activatorUrls } from "../../fixtures/msw/activators.handlers";
import { ok } from "../../fixtures/msw/envelope";
import { createQueryWrapper } from "../../fixtures/wrappers/createQueryWrapper";
import {
  mockActivatorDashboard,
  mockPaginatedActivators,
  mockActivatorDetail,
  mockActivatorPerformance,
} from "../../fixtures/data/activators.mock";
import { useMyStats } from "@/hooks/useMyStats";
import {
  useActivators,
  useCreateActivator,
  useActivator,
  useUpdateActivator,
  useToggleActivator,
  useResetActivatorPassword,
  useDeleteActivator,
  useActivatorPerformance,
} from "@/hooks/useActivators";
import { qk } from "@/lib/query-keys";

function makeWrapperWithClient() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { Wrapper, queryClient };
}

describe("useMyStats (D4 — normalized key)", () => {
  it("resolves under the normalized qk.activators.myStats() key, not the legacy singular one", async () => {
    const { Wrapper, queryClient } = makeWrapperWithClient();
    const { result } = renderHook(() => useMyStats(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(qk.activators.myStats())).toEqual(mockActivatorDashboard);
  });
});

describe("activators query hooks", () => {
  it("useActivators resolves with the unwrapped paginated result", async () => {
    const { result } = renderHook(() => useActivators({ page: 1, limit: 10 }), {
      wrapper: createQueryWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockPaginatedActivators);
  });

  it("useActivator is enabled-gated on a truthy id", async () => {
    let called = false;
    server.use(
      http.get(activatorUrls.getById, () => {
        called = true;
        return ok(mockActivatorDetail);
      }),
    );
    renderHook(() => useActivator(""), { wrapper: createQueryWrapper() });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(called).toBe(false);
  });

  it("useActivator fetches once given a real id", async () => {
    const { result } = renderHook(() => useActivator("id"), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockActivatorDetail);
  });

  it("useActivatorPerformance is enabled-gated and resolves with the unwrapped series", async () => {
    let called = false;
    server.use(
      http.get(activatorUrls.performance, () => {
        called = true;
        return ok(mockActivatorPerformance);
      }),
    );
    renderHook(() => useActivatorPerformance("", { days: 30 }), { wrapper: createQueryWrapper() });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(called).toBe(false);

    const { result } = renderHook(() => useActivatorPerformance("id", { days: 30 }), {
      wrapper: createQueryWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockActivatorPerformance);
  });
});

describe("activators mutation invalidations (plan.md §3.2 — all invalidate qk.activators.all())", () => {
  async function expectActivatorsAllInvalidated(
    wrapper: ReturnType<typeof createQueryWrapper>,
    fire: () => void,
    isSuccess: () => boolean,
  ) {
    let listCalls = 0;
    server.use(
      http.get(activatorUrls.getAll, () => {
        listCalls += 1;
        return ok(mockPaginatedActivators);
      }),
    );
    const { result: listResult } = renderHook(() => useActivators({ page: 1, limit: 10 }), {
      wrapper,
    });
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true));
    expect(listCalls).toBe(1);

    fire();
    await waitFor(() => expect(isSuccess()).toBe(true));
    await waitFor(() => expect(listCalls).toBe(2));
  }

  it("useCreateActivator invalidates the activators list", async () => {
    const wrapper = createQueryWrapper();
    const { result } = renderHook(() => useCreateActivator(), { wrapper });
    await expectActivatorsAllInvalidated(
      wrapper,
      () => result.current.mutate({ fullName: "New", username: "new.a", phone: "0555000111" }),
      () => result.current.isSuccess,
    );
  });

  it("useUpdateActivator invalidates the activators list", async () => {
    const wrapper = createQueryWrapper();
    const { result } = renderHook(() => useUpdateActivator(), { wrapper });
    await expectActivatorsAllInvalidated(
      wrapper,
      () => result.current.mutate({ id: "id", command: { fullName: "Updated" } }),
      () => result.current.isSuccess,
    );
  });

  it("useToggleActivator invalidates the activators list", async () => {
    const wrapper = createQueryWrapper();
    const { result } = renderHook(() => useToggleActivator(), { wrapper });
    await expectActivatorsAllInvalidated(
      wrapper,
      () => result.current.mutate("id"),
      () => result.current.isSuccess,
    );
  });

  it("useResetActivatorPassword invalidates the activators list", async () => {
    const wrapper = createQueryWrapper();
    const { result } = renderHook(() => useResetActivatorPassword(), { wrapper });
    await expectActivatorsAllInvalidated(
      wrapper,
      () => result.current.mutate("id"),
      () => result.current.isSuccess,
    );
  });

  it("useDeleteActivator invalidates the activators list", async () => {
    const wrapper = createQueryWrapper();
    const { result } = renderHook(() => useDeleteActivator(), { wrapper });
    await expectActivatorsAllInvalidated(
      wrapper,
      () => result.current.mutate("id"),
      () => result.current.isSuccess,
    );
  });
});
