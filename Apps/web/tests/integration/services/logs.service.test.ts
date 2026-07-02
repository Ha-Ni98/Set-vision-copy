import { describe, it, expect } from "vitest";
import { http } from "msw";
import { server } from "../../fixtures/msw/server";
import { logUrls, logErrorHandlers } from "../../fixtures/msw/logs.handlers";
import { ok } from "../../fixtures/msw/envelope";
import { mockPaginatedLogs } from "../../fixtures/data/logs.mock";
import * as logsService from "@/services/logs.service";

describe("logs.service", () => {
  it("getAll returns the unwrapped paginated result", async () => {
    const result = await logsService.getAll({ page: 1, limit: 10 });
    expect(result).toEqual(mockPaginatedLogs);
  });

  it("getAll throws on 500", async () => {
    server.use(logErrorHandlers.getAllServerError());
    await expect(logsService.getAll({ page: 1, limit: 10 })).rejects.toMatchObject({
      response: { status: 500 },
    });
  });

  it("serializes dateFrom/dateTo as ISO date-time strings in the query", async () => {
    let seenSearch = "";
    server.use(
      http.get(logUrls.getAll, ({ request }) => {
        seenSearch = new URL(request.url).search;
        return ok(mockPaginatedLogs);
      }),
    );
    await logsService.getAll({
      page: 1,
      limit: 10,
      dateFrom: "2026-06-01T00:00:00.000Z",
      dateTo: "2026-06-30T23:59:59.000Z",
    });
    expect(seenSearch).toContain("dateFrom=2026-06-01T00:00:00.000Z");
    expect(seenSearch).toContain("dateTo=2026-06-30T23:59:59.000Z");
  });
});
