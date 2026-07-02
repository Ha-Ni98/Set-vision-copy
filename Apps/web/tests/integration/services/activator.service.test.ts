import { describe, it, expect } from "vitest";
import { http } from "msw";
import { server } from "../../fixtures/msw/server";
import { activatorUrls, activatorErrorHandlers } from "../../fixtures/msw/activators.handlers";
import { ok } from "../../fixtures/msw/envelope";
import {
  mockActivatorDashboard,
  mockPaginatedActivators,
  mockActivatorWithCredentials,
  mockActivatorDetail,
  mockActivator,
  mockActivatorGeneratedPassword,
  mockActivatorPerformance,
} from "../../fixtures/data/activators.mock";
import * as activatorService from "@/services/activator.service";

describe("activator.service.getMyStats", () => {
  it("returns the unwrapped dashboard DTO", async () => {
    const result = await activatorService.getMyStats();
    expect(result).toEqual(mockActivatorDashboard);
  });

  it("throws on 500", async () => {
    server.use(activatorErrorHandlers.myStatsServerError());
    await expect(activatorService.getMyStats()).rejects.toMatchObject({
      response: { status: 500 },
    });
  });
});

describe("activator.service.getAll", () => {
  it("returns the unwrapped paginated result", async () => {
    const result = await activatorService.getAll({ page: 1, limit: 10 });
    expect(result).toEqual(mockPaginatedActivators);
  });

  it("throws on 500", async () => {
    server.use(activatorErrorHandlers.getAllServerError());
    await expect(activatorService.getAll({ page: 1, limit: 10 })).rejects.toMatchObject({
      response: { status: 500 },
    });
  });

  it("serializes query params into the request", async () => {
    let seenSearch = "";
    server.use(
      http.get(activatorUrls.getAll, ({ request }) => {
        seenSearch = new URL(request.url).search;
        return ok(mockPaginatedActivators);
      }),
    );
    await activatorService.getAll({ page: 2, limit: 20, search: "amine" });
    expect(seenSearch).toContain("page=2");
    expect(seenSearch).toContain("limit=20");
    expect(seenSearch).toContain("search=amine");
  });
});

describe("activator.service.create", () => {
  it("returns the unwrapped credentials DTO (201)", async () => {
    const result = await activatorService.create({
      fullName: "New Activator",
      username: "new.a",
      phone: "0555000111",
    });
    expect(result).toEqual(mockActivatorWithCredentials);
  });

  it("throws on a 400 validation error", async () => {
    server.use(activatorErrorHandlers.createValidationError());
    await expect(
      activatorService.create({ fullName: "", username: "", phone: "" }),
    ).rejects.toMatchObject({ response: { status: 400 } });
  });
});

describe("activator.service.getById", () => {
  it("returns the unwrapped detail DTO", async () => {
    const result = await activatorService.getById("id");
    expect(result).toEqual(mockActivatorDetail);
  });

  it("throws on 404", async () => {
    server.use(activatorErrorHandlers.getByIdNotFound());
    await expect(activatorService.getById("nonexistent")).rejects.toMatchObject({
      response: { status: 404 },
    });
  });
});

describe("activator.service.update", () => {
  it("PATCHes and returns the unwrapped DTO", async () => {
    let method = "";
    server.use(
      http.patch(activatorUrls.update, ({ request }) => {
        method = request.method;
        return ok(mockActivator);
      }),
    );
    const result = await activatorService.update("id", { fullName: "Updated Name" });
    expect(result).toEqual(mockActivator);
    expect(method).toBe("PATCH");
  });
});

describe("activator.service — toggle / resetPassword / remove / getPerformance", () => {
  it("toggle returns the unwrapped DTO", async () => {
    const result = await activatorService.toggle("id");
    expect(result).toEqual(mockActivator);
  });

  it("resetPassword returns the unwrapped one-time password DTO", async () => {
    const result = await activatorService.resetPassword("id");
    expect(result).toEqual(mockActivatorGeneratedPassword);
  });

  it("remove resolves void on 204", async () => {
    await expect(activatorService.remove("id")).resolves.toBeUndefined();
  });

  it("getPerformance returns the unwrapped series DTO", async () => {
    const result = await activatorService.getPerformance("id", { days: 30 });
    expect(result).toEqual(mockActivatorPerformance);
  });
});
