import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http } from "msw";
import { AccountInformation } from "@my-app/contract";
import { server } from "../../fixtures/msw/server";
import { keysUrls } from "../../fixtures/msw/keys.handlers";
import { ok } from "../../fixtures/msw/envelope";
import { createQueryWrapper } from "../../fixtures/wrappers/createQueryWrapper";
import { mockKeyReady, mockClientActivationStatus } from "../../fixtures/data/keys.mock";

// useUpdateActivation/useSubmitActivation fire a toast via useTranslation, which reads
// LanguageProvider context — mock the hook rather than wrap every test in a real provider
// (test-rules §6).
vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({ t: (key: string) => key, language: "en" }),
}));

import { useVerifyKey } from "@/hooks/useVerifyKey";
import { useSubmitActivation } from "@/hooks/useSubmitActivation";
import { useUpdateActivation } from "@/hooks/useUpdateActivation";
import { useSubmitAdditionalInfo } from "@/hooks/useSubmitAdditionalInfo";
import { useActivationStatus } from "@/hooks/useActivationStatus";

describe("useVerifyKey", () => {
  it("mutates and resolves with the unwrapped DTO", async () => {
    const { result } = renderHook(() => useVerifyKey(), { wrapper: createQueryWrapper() });
    result.current.mutate({ key: "ABCD-1234" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockKeyReady);
  });
});

describe("useSubmitActivation", () => {
  it("mutates and resolves with the unwrapped DTO", async () => {
    const { result } = renderHook(() => useSubmitActivation(), { wrapper: createQueryWrapper() });
    result.current.mutate({
      key: "ABCD-1234",
      fullName: "Test",
      phone: "0555000000",
      accountFields: [{ field: AccountInformation.USERNAME, value: "t" }],
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockClientActivationStatus);
  });
});

describe("useActivationStatus (enabled-gated)", () => {
  it("issues no request while disabled", async () => {
    let called = false;
    server.use(
      http.get(keysUrls.status, () => {
        called = true;
        return ok(mockClientActivationStatus);
      }),
    );
    const { result } = renderHook(() => useActivationStatus("id", false), {
      wrapper: createQueryWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(called).toBe(false);
  });

  it("issues no request when activationId is undefined, even if enabled=true", async () => {
    let called = false;
    server.use(
      http.get(keysUrls.status, () => {
        called = true;
        return ok(mockClientActivationStatus);
      }),
    );
    renderHook(() => useActivationStatus(undefined, true), { wrapper: createQueryWrapper() });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(called).toBe(false);
  });

  it("fetches once enabled with an id", async () => {
    const { result } = renderHook(() => useActivationStatus("id", true), {
      wrapper: createQueryWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockClientActivationStatus);
  });
});

describe("status-key invalidation (plan.md §3.2 — new for these two hooks)", () => {
  it("useUpdateActivation invalidates the status query for the same activationId", async () => {
    const wrapper = createQueryWrapper();
    let statusCalls = 0;
    server.use(
      http.get(keysUrls.status, () => {
        statusCalls += 1;
        return ok(mockClientActivationStatus);
      }),
    );

    const activationId = "9c1e0000-0000-4000-8000-000000000001";
    const { result: statusResult } = renderHook(() => useActivationStatus(activationId, true), {
      wrapper,
    });
    await waitFor(() => expect(statusResult.current.isSuccess).toBe(true));
    expect(statusCalls).toBe(1);

    const { result: updateResult } = renderHook(() => useUpdateActivation(), { wrapper });
    updateResult.current.mutate({
      activationId,
      command: { accountFields: [{ field: AccountInformation.USERNAME, value: "fixed" }] },
    });
    await waitFor(() => expect(updateResult.current.isSuccess).toBe(true));
    await waitFor(() => expect(statusCalls).toBe(2));
  });

  it("useSubmitAdditionalInfo invalidates the status query for the same activationId", async () => {
    const wrapper = createQueryWrapper();
    let statusCalls = 0;
    server.use(
      http.get(keysUrls.status, () => {
        statusCalls += 1;
        return ok(mockClientActivationStatus);
      }),
    );

    const activationId = "9c1e0000-0000-4000-8000-000000000002";
    const { result: statusResult } = renderHook(() => useActivationStatus(activationId, true), {
      wrapper,
    });
    await waitFor(() => expect(statusResult.current.isSuccess).toBe(true));
    expect(statusCalls).toBe(1);

    const { result: additionalResult } = renderHook(() => useSubmitAdditionalInfo(), { wrapper });
    additionalResult.current.mutate({
      activationId,
      command: { accountFields: [{ field: AccountInformation.OTP, value: "123456" }] },
    });
    await waitFor(() => expect(additionalResult.current.isSuccess).toBe(true));
    await waitFor(() => expect(statusCalls).toBe(2));
  });
});
