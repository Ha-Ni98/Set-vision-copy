import { describe, it, expect } from "vitest";
import { http } from "msw";
import { ActivationStat, AccountInformation } from "@my-app/contract";
import { server } from "../../fixtures/msw/server";
import { activationsUrls, activationsErrorHandlers } from "../../fixtures/msw/activations.handlers";
import { ok } from "../../fixtures/msw/envelope";
import {
  mockPendingActivation,
  mockActiveRequestNulls,
  mockActiveRequestPopulated,
  mockPaginatedHistory,
  mockPaginatedHistoryEmpty,
  mockRecentActivation,
  mockPaginatedActivations,
  mockPaginatedActivationsEmpty,
  mockActivationDetail,
  mockAdminActivation,
} from "../../fixtures/data/activations.mock";
import * as activationsService from "@/services/activations.service";

describe("activations.service — activator-facing reads", () => {
  it("getPending returns the unwrapped array", async () => {
    const result = await activationsService.getPending();
    expect(result).toEqual([mockPendingActivation]);
  });

  it("getActive returns the unwrapped array with nullable fields intact", async () => {
    const result = await activationsService.getActive();
    expect(result).toEqual([mockActiveRequestNulls]);
    expect(result[0].otpValue).toBeNull();
    expect(result[0].freezeReason).toBeNull();
  });

  it("getActive surfaces a populated (non-null) variant when the server sends one", async () => {
    server.use(http.get(activationsUrls.active, () => ok([mockActiveRequestPopulated])));
    const result = await activationsService.getActive();
    expect(result[0].otpValue).toBe("482913");
    expect(result[0].freezeReason).not.toBeNull();
  });

  it("getRecent returns the unwrapped array", async () => {
    const result = await activationsService.getRecent();
    expect(result).toEqual([mockRecentActivation]);
  });

  it("getMyHistory returns the unwrapped paginated result with nullable fields intact", async () => {
    const result = await activationsService.getMyHistory({ page: 1, limit: 10 });
    expect(result).toEqual(mockPaginatedHistory);
    expect(result.items[1].completedAt).toBeNull();
    expect(result.items[1].durationSeconds).toBeNull();
    expect(result.items[1].earning).toBeNull();
  });

  it("getMyHistory returns the empty-page shape (items: [], total: 0, totalPages: 0)", async () => {
    server.use(http.get(activationsUrls.myHistory, () => ok(mockPaginatedHistoryEmpty)));
    const result = await activationsService.getMyHistory({ page: 5, limit: 10 });
    expect(result).toEqual(mockPaginatedHistoryEmpty);
  });

  it("serializes query params (page/limit/status/dates) into the request", async () => {
    let seenSearch = "";
    server.use(
      http.get(activationsUrls.myHistory, ({ request }) => {
        seenSearch = new URL(request.url).search;
        return ok(mockPaginatedHistory);
      }),
    );
    await activationsService.getMyHistory({
      page: 2,
      limit: 20,
      status: ActivationStat.ACTIVATED,
      dateFrom: "2026-06-01T00:00:00.000Z",
      dateTo: "2026-06-30T23:59:59.000Z",
    });
    expect(seenSearch).toContain("page=2");
    expect(seenSearch).toContain("limit=20");
    expect(seenSearch).toContain("status=ACTIVATED");
    expect(seenSearch).toContain("dateFrom=");
    expect(seenSearch).toContain("dateTo=");
  });

  it("throws on a 500 from my-history", async () => {
    server.use(activationsErrorHandlers.myHistoryServerError());
    await expect(activationsService.getMyHistory({})).rejects.toMatchObject({
      response: { status: 500 },
    });
  });
});

describe("activations.service — activator-facing mutations", () => {
  it("take returns the unwrapped ActiveRequestDTO (upgraded from the Sub-01 void stub)", async () => {
    const result = await activationsService.take("a2000000-0000-4000-8000-000000000001");
    expect(result).toEqual(mockActiveRequestNulls);
  });

  it("take throws on a 409 conflict (already taken by someone else)", async () => {
    server.use(activationsErrorHandlers.takeConflict());
    await expect(activationsService.take("x")).rejects.toMatchObject({ response: { status: 409 } });
  });

  it("flagWrongInfo returns the unwrapped DTO", async () => {
    const result = await activationsService.flagWrongInfo("id", {
      fields: [AccountInformation.USERNAME],
    });
    expect(result).toEqual(mockActiveRequestNulls);
  });

  it("flagWrongInfo throws on a 400 validation error", async () => {
    server.use(activationsErrorHandlers.flagWrongValidation());
    await expect(
      activationsService.flagWrongInfo("id", { fields: [] as never }),
    ).rejects.toMatchObject({
      response: { status: 400 },
    });
  });

  it("requestAdditionalInfo returns the unwrapped DTO", async () => {
    const result = await activationsService.requestAdditionalInfo("id", {
      fields: [AccountInformation.OTP],
    });
    expect(result).toEqual(mockActiveRequestNulls);
  });

  it("activate is no longer a no-op — returns the unwrapped ActiveRequestDTO (plan.md D3)", async () => {
    const result = await activationsService.activate("id", {
      activationEmail: "client@example.com",
    });
    expect(result).toEqual(mockActiveRequestNulls);
  });

  it("cancel resolves void on 204 (new route, plan.md §2.3)", async () => {
    await expect(activationsService.cancel("id")).resolves.toBeUndefined();
  });

  it("release resolves void on 204", async () => {
    await expect(activationsService.release("id")).resolves.toBeUndefined();
  });

  it("freeze returns the unwrapped DTO", async () => {
    const result = await activationsService.freeze("id", { reason: "suspicious activity" });
    expect(result).toEqual(mockActiveRequestNulls);
  });
});

describe("activations.service — admin-facing", () => {
  it("getAll returns the unwrapped paginated result", async () => {
    const result = await activationsService.getAll({});
    expect(result).toEqual(mockPaginatedActivations);
  });

  it("getAll returns the empty-page shape", async () => {
    server.use(http.get(activationsUrls.all, () => ok(mockPaginatedActivationsEmpty)));
    const result = await activationsService.getAll({ page: 9 });
    expect(result).toEqual(mockPaginatedActivationsEmpty);
  });

  it("getAll throws on 500", async () => {
    server.use(activationsErrorHandlers.allServerError());
    await expect(activationsService.getAll({})).rejects.toMatchObject({
      response: { status: 500 },
    });
  });

  it("getById returns the unwrapped detail DTO (with a null activator variant)", async () => {
    const result = await activationsService.getById("id");
    expect(result).toEqual(mockActivationDetail);
    expect(result.activator).toBeNull();
  });

  it("getById throws on 404", async () => {
    server.use(activationsErrorHandlers.byIdNotFound());
    await expect(activationsService.getById("nonexistent")).rejects.toMatchObject({
      response: { status: 404 },
    });
  });

  it("activateByAdmin returns the unwrapped AdminActivationDTO", async () => {
    const result = await activationsService.activateByAdmin("id", {
      activationEmail: "client@example.com",
    });
    expect(result).toEqual(mockAdminActivation);
  });

  it("cancelByAdmin returns the unwrapped AdminActivationDTO", async () => {
    const result = await activationsService.cancelByAdmin("id");
    expect(result).toEqual(mockAdminActivation);
  });

  it("setPrice returns the unwrapped AdminActivationDTO", async () => {
    const result = await activationsService.setPrice("id", { amount: 250.5 });
    expect(result).toEqual(mockAdminActivation);
  });
});
