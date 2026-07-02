import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http } from "msw";
import { server } from "../../fixtures/msw/server";
import { adminUrls } from "../../fixtures/msw/admins.handlers";
import { ok } from "../../fixtures/msw/envelope";
import { createQueryWrapper } from "../../fixtures/wrappers/createQueryWrapper";
import { mockPaginatedAdmins, mockAdmin } from "../../fixtures/data/admins.mock";
import {
  useAdmins,
  useCreateAdmin,
  useAdmin,
  useUpdateAdmin,
  useToggleAdmin,
  useResetAdminPassword,
  useDeleteAdmin,
} from "@/hooks/useAdmins";

describe("admins query hooks", () => {
  it("useAdmins resolves with the unwrapped paginated result", async () => {
    const { result } = renderHook(() => useAdmins({ page: 1, limit: 10 }), {
      wrapper: createQueryWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockPaginatedAdmins);
  });

  it("useAdmin is enabled-gated on a truthy id", async () => {
    let called = false;
    server.use(
      http.get(adminUrls.getById, () => {
        called = true;
        return ok(mockAdmin);
      }),
    );
    renderHook(() => useAdmin(""), { wrapper: createQueryWrapper() });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(called).toBe(false);
  });

  it("useAdmin fetches once given a real id", async () => {
    const { result } = renderHook(() => useAdmin("id"), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockAdmin);
  });
});

describe("admins mutation invalidations (plan.md §3.2 — all invalidate qk.admins.all())", () => {
  async function expectAdminsAllInvalidated(
    wrapper: ReturnType<typeof createQueryWrapper>,
    fire: () => void,
    isSuccess: () => boolean,
  ) {
    let listCalls = 0;
    server.use(
      http.get(adminUrls.getAll, () => {
        listCalls += 1;
        return ok(mockPaginatedAdmins);
      }),
    );
    const { result: listResult } = renderHook(() => useAdmins({ page: 1, limit: 10 }), { wrapper });
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true));
    expect(listCalls).toBe(1);

    fire();
    await waitFor(() => expect(isSuccess()).toBe(true));
    await waitFor(() => expect(listCalls).toBe(2));
  }

  it("useCreateAdmin invalidates the admins list", async () => {
    const wrapper = createQueryWrapper();
    const { result } = renderHook(() => useCreateAdmin(), { wrapper });
    await expectAdminsAllInvalidated(
      wrapper,
      () => result.current.mutate({ fullName: "New", username: "new.admin", phone: "0555222333" }),
      () => result.current.isSuccess,
    );
  });

  it("useUpdateAdmin invalidates the admins list", async () => {
    const wrapper = createQueryWrapper();
    const { result } = renderHook(() => useUpdateAdmin(), { wrapper });
    await expectAdminsAllInvalidated(
      wrapper,
      () => result.current.mutate({ id: "id", command: { fullName: "Updated" } }),
      () => result.current.isSuccess,
    );
  });

  it("useToggleAdmin invalidates the admins list", async () => {
    const wrapper = createQueryWrapper();
    const { result } = renderHook(() => useToggleAdmin(), { wrapper });
    await expectAdminsAllInvalidated(
      wrapper,
      () => result.current.mutate("id"),
      () => result.current.isSuccess,
    );
  });

  it("useResetAdminPassword invalidates the admins list", async () => {
    const wrapper = createQueryWrapper();
    const { result } = renderHook(() => useResetAdminPassword(), { wrapper });
    await expectAdminsAllInvalidated(
      wrapper,
      () => result.current.mutate("id"),
      () => result.current.isSuccess,
    );
  });

  it("useDeleteAdmin invalidates the admins list", async () => {
    const wrapper = createQueryWrapper();
    const { result } = renderHook(() => useDeleteAdmin(), { wrapper });
    await expectAdminsAllInvalidated(
      wrapper,
      () => result.current.mutate("id"),
      () => result.current.isSuccess,
    );
  });
});
