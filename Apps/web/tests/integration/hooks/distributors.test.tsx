import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http } from "msw";
import { server } from "../../fixtures/msw/server";
import { distributorUrls } from "../../fixtures/msw/distributors.handlers";
import { ok } from "../../fixtures/msw/envelope";
import { createQueryWrapper } from "../../fixtures/wrappers/createQueryWrapper";
import {
  mockPaginatedDistributors,
  mockDistributorDetail,
} from "../../fixtures/data/distributors.mock";
import {
  useDistributors,
  useCreateDistributor,
  useDistributor,
  useUpdateDistributor,
  useToggleDistributor,
  useDeleteDistributor,
} from "@/hooks/useDistributors";

describe("distributors query hooks", () => {
  it("useDistributors resolves with the unwrapped paginated result", async () => {
    const { result } = renderHook(() => useDistributors({}), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockPaginatedDistributors);
  });

  it("useDistributor is enabled-gated on a truthy id", async () => {
    let called = false;
    server.use(
      http.get(distributorUrls.getById, () => {
        called = true;
        return ok(mockDistributorDetail);
      }),
    );
    renderHook(() => useDistributor(""), { wrapper: createQueryWrapper() });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(called).toBe(false);
  });

  it("useDistributor fetches once given a real id", async () => {
    const { result } = renderHook(() => useDistributor("id"), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockDistributorDetail);
  });
});

describe("distributors mutation invalidations (plan.md §3.2 — all invalidate qk.distributors.all())", () => {
  async function expectDistributorsAllInvalidated(
    wrapper: ReturnType<typeof createQueryWrapper>,
    fire: () => void,
    isSuccess: () => boolean,
  ) {
    let listCalls = 0;
    server.use(
      http.get(distributorUrls.getAll, () => {
        listCalls += 1;
        return ok(mockPaginatedDistributors);
      }),
    );
    const { result: listResult } = renderHook(() => useDistributors({}), { wrapper });
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true));
    expect(listCalls).toBe(1);

    fire();
    await waitFor(() => expect(isSuccess()).toBe(true));
    await waitFor(() => expect(listCalls).toBe(2));
  }

  it("useCreateDistributor invalidates the distributors list", async () => {
    const wrapper = createQueryWrapper();
    const { result } = renderHook(() => useCreateDistributor(), { wrapper });
    await expectDistributorsAllInvalidated(
      wrapper,
      () =>
        result.current.mutate({
          fullName: "New",
          storeName: "New Store",
          phone: "0555666777",
          wilayaId: "id",
          communeId: "id",
        }),
      () => result.current.isSuccess,
    );
  });

  it("useUpdateDistributor invalidates the distributors list", async () => {
    const wrapper = createQueryWrapper();
    const { result } = renderHook(() => useUpdateDistributor(), { wrapper });
    await expectDistributorsAllInvalidated(
      wrapper,
      () => result.current.mutate({ id: "id", command: { fullName: "Updated" } }),
      () => result.current.isSuccess,
    );
  });

  it("useToggleDistributor invalidates the distributors list", async () => {
    const wrapper = createQueryWrapper();
    const { result } = renderHook(() => useToggleDistributor(), { wrapper });
    await expectDistributorsAllInvalidated(
      wrapper,
      () => result.current.mutate("id"),
      () => result.current.isSuccess,
    );
  });

  it("useDeleteDistributor invalidates the distributors list", async () => {
    const wrapper = createQueryWrapper();
    const { result } = renderHook(() => useDeleteDistributor(), { wrapper });
    await expectDistributorsAllInvalidated(
      wrapper,
      () => result.current.mutate("id"),
      () => result.current.isSuccess,
    );
  });
});
