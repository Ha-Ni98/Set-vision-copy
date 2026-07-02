import { describe, it, expect } from "vitest";
import { http } from "msw";
import { server } from "../../fixtures/msw/server";
import { paymentUrls, paymentErrorHandlers } from "../../fixtures/msw/payments.handlers";
import { ok } from "../../fixtures/msw/envelope";
import { mockPaginatedPayments, mockPayment } from "../../fixtures/data/payments.mock";
import * as paymentsService from "@/services/payments.service";

describe("payments.service.getAll", () => {
  it("returns the unwrapped paginated result", async () => {
    const result = await paymentsService.getAll({ page: 1, limit: 10 });
    expect(result).toEqual(mockPaginatedPayments);
  });

  it("throws on 500", async () => {
    server.use(paymentErrorHandlers.getAllServerError());
    await expect(paymentsService.getAll({ page: 1, limit: 10 })).rejects.toMatchObject({
      response: { status: 500 },
    });
  });

  it("serializes includeDeleted as the literal string 'true', matching BooleanQuerySchema", async () => {
    let seenSearch = "";
    server.use(
      http.get(paymentUrls.getAll, ({ request }) => {
        seenSearch = new URL(request.url).search;
        return ok(mockPaginatedPayments);
      }),
    );
    await paymentsService.getAll({ page: 1, limit: 10, includeDeleted: true });
    expect(seenSearch).toContain("includeDeleted=true");
  });

  it("serializes includeDeleted as the literal string 'false'", async () => {
    let seenSearch = "";
    server.use(
      http.get(paymentUrls.getAll, ({ request }) => {
        seenSearch = new URL(request.url).search;
        return ok(mockPaginatedPayments);
      }),
    );
    await paymentsService.getAll({ page: 1, limit: 10, includeDeleted: false });
    expect(seenSearch).toContain("includeDeleted=false");
  });
});

describe("payments.service.record", () => {
  it("returns the unwrapped DTO (201)", async () => {
    const result = await paymentsService.record({ activatorId: "id", amount: 1000 });
    expect(result).toEqual(mockPayment);
  });

  it("throws on a 400 validation error", async () => {
    server.use(paymentErrorHandlers.createValidationError());
    await expect(paymentsService.record({ activatorId: "id", amount: 1 })).rejects.toMatchObject({
      response: { status: 400 },
    });
  });
});

describe("payments.service.remove", () => {
  it("resolves void on 204", async () => {
    await expect(paymentsService.remove("id")).resolves.toBeUndefined();
  });
});
