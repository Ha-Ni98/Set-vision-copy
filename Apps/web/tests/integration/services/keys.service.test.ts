import { describe, it, expect } from "vitest";
import { http } from "msw";
import { AccountInformation } from "@my-app/contract";
import { server } from "../../fixtures/msw/server";
import { keysUrls, keysErrorHandlers } from "../../fixtures/msw/keys.handlers";
import { ok } from "../../fixtures/msw/envelope";
import {
  mockKeyReady,
  mockKeyInvalid,
  mockClientActivationStatus,
} from "../../fixtures/data/keys.mock";
import * as keysService from "@/services/keys.service";

describe("keys.service.verifyKey", () => {
  it("returns the unwrapped DTO for a ready key", async () => {
    const result = await keysService.verifyKey({ key: "ABCD-1234" });
    expect(result).toEqual(mockKeyReady);
  });

  it("returns the minimal INVALID shape (every optional absent) for an unknown key", async () => {
    server.use(http.post(keysUrls.verify, () => ok(mockKeyInvalid)));
    const result = await keysService.verifyKey({ key: "unknown" });
    expect(result).toEqual(mockKeyInvalid);
    expect(result.subscriptionLabel).toBeUndefined();
  });
});

describe("keys.service.submitActivation", () => {
  it("returns the unwrapped DTO (201)", async () => {
    const result = await keysService.submitActivation({
      key: "ABCD-1234",
      fullName: "Test User",
      phone: "0555000000",
      accountFields: [{ field: AccountInformation.USERNAME, value: "testuser" }],
    });
    expect(result).toEqual(mockClientActivationStatus);
  });

  it("throws on a 400 validation error with error.code preserved", async () => {
    server.use(keysErrorHandlers.submitValidationError());
    await expect(
      keysService.submitActivation({
        key: "",
        fullName: "",
        phone: "",
        accountFields: [{ field: AccountInformation.USERNAME, value: "" }],
      }),
    ).rejects.toMatchObject({
      response: { status: 400, data: { error: { code: "VALIDATION_ERROR" } } },
    });
  });
});

describe("keys.service.updateActivation", () => {
  it("POSTs (not PATCH) to the parameterized URL and returns the unwrapped DTO", async () => {
    let seenPath = "";
    server.use(
      http.post(keysUrls.update, ({ request }) => {
        seenPath = new URL(request.url).pathname;
        return ok(mockClientActivationStatus);
      }),
    );
    const result = await keysService.updateActivation("9c1e0000-0000-4000-8000-000000000001", {
      accountFields: [{ field: AccountInformation.USERNAME, value: "corrected" }],
    });
    expect(result).toEqual(mockClientActivationStatus);
    expect(seenPath).toBe("/api/v1/keys/9c1e0000-0000-4000-8000-000000000001/update");
  });

  it("throws on 404", async () => {
    server.use(keysErrorHandlers.updateNotFound());
    await expect(
      keysService.updateActivation("nonexistent", {
        accountFields: [{ field: AccountInformation.USERNAME, value: "x" }],
      }),
    ).rejects.toMatchObject({ response: { status: 404 } });
  });
});

describe("keys.service.submitAdditionalInfo", () => {
  it("returns the unwrapped DTO", async () => {
    const result = await keysService.submitAdditionalInfo("9c1e0000-0000-4000-8000-000000000002", {
      accountFields: [{ field: AccountInformation.OTP, value: "123456" }],
    });
    expect(result).toEqual(mockClientActivationStatus);
  });
});

describe("keys.service.getActivationStatus", () => {
  it("returns the unwrapped DTO via the parameterized GET", async () => {
    const result = await keysService.getActivationStatus("9c1e0000-0000-4000-8000-000000000003");
    expect(result).toEqual(mockClientActivationStatus);
  });

  it("throws on 500", async () => {
    server.use(keysErrorHandlers.statusServerError());
    await expect(keysService.getActivationStatus("x")).rejects.toMatchObject({
      response: { status: 500 },
    });
  });
});
