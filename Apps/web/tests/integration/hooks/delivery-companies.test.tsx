import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http } from "msw";
import { server } from "../../fixtures/msw/server";
import { deliveryCompanyUrls } from "../../fixtures/msw/delivery-companies.handlers";
import { ok } from "../../fixtures/msw/envelope";
import { createQueryWrapper } from "../../fixtures/wrappers/createQueryWrapper";
import { mockDeliveryCompanies } from "../../fixtures/data/delivery-companies.mock";
import {
  useDeliveryCompanies,
  useCreateDeliveryCompany,
  useUpdateDeliveryCompany,
  useToggleDeliveryCompany,
} from "@/hooks/useDeliveryCompanies";

describe("useDeliveryCompanies", () => {
  it("resolves with the unwrapped array", async () => {
    const { result } = renderHook(() => useDeliveryCompanies({}), {
      wrapper: createQueryWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockDeliveryCompanies);
  });
});

describe("delivery-company mutation invalidations (plan.md §3.2 — all invalidate qk.deliveryCompanies.all())", () => {
  async function expectDeliveryCompaniesAllInvalidated(
    wrapper: ReturnType<typeof createQueryWrapper>,
    fire: () => void,
    isSuccess: () => boolean,
  ) {
    let listCalls = 0;
    server.use(
      http.get(deliveryCompanyUrls.getAll, () => {
        listCalls += 1;
        return ok(mockDeliveryCompanies);
      }),
    );
    const { result: listResult } = renderHook(() => useDeliveryCompanies({}), { wrapper });
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true));
    expect(listCalls).toBe(1);

    fire();
    await waitFor(() => expect(isSuccess()).toBe(true));
    await waitFor(() => expect(listCalls).toBe(2));
  }

  it("useCreateDeliveryCompany invalidates the list", async () => {
    const wrapper = createQueryWrapper();
    const { result } = renderHook(() => useCreateDeliveryCompany(), { wrapper });
    await expectDeliveryCompaniesAllInvalidated(
      wrapper,
      () => result.current.mutate({ name: "New Co", registeredName: "New Co SARL" }),
      () => result.current.isSuccess,
    );
  });

  it("useUpdateDeliveryCompany invalidates the list", async () => {
    const wrapper = createQueryWrapper();
    const { result } = renderHook(() => useUpdateDeliveryCompany(), { wrapper });
    await expectDeliveryCompaniesAllInvalidated(
      wrapper,
      () => result.current.mutate({ id: "id", command: { name: "Updated" } }),
      () => result.current.isSuccess,
    );
  });

  it("useToggleDeliveryCompany invalidates the list", async () => {
    const wrapper = createQueryWrapper();
    const { result } = renderHook(() => useToggleDeliveryCompany(), { wrapper });
    await expectDeliveryCompaniesAllInvalidated(
      wrapper,
      () => result.current.mutate("id"),
      () => result.current.isSuccess,
    );
  });
});
