import { describe, it, expect } from "vitest";
import { server } from "../../fixtures/msw/server";
import { lotErrorHandlers } from "../../fixtures/msw/lots.handlers";
import { mockPaginatedLots, mockLotDelivered } from "../../fixtures/data/lots.mock";
import * as lotsService from "@/services/lots.service";

describe("lots.service", () => {
  it("getAll returns the unwrapped paginated result", async () => {
    const result = await lotsService.getAll({});
    expect(result).toEqual(mockPaginatedLots);
  });

  it("getAll throws on 500", async () => {
    server.use(lotErrorHandlers.getAllServerError());
    await expect(lotsService.getAll({})).rejects.toMatchObject({ response: { status: 500 } });
  });

  it("getAvailableForOrder hits its own literal-path handler, not the general list", async () => {
    const result = await lotsService.getAvailableForOrder({});
    expect(result).toEqual([mockLotDelivered]);
  });

  it("create returns the unwrapped DTO (201)", async () => {
    const result = await lotsService.create({ subscriptionPlanId: "id", cardIds: ["a"] });
    expect(result).toEqual(mockLotDelivered);
  });

  it("create throws on a 400 validation error", async () => {
    server.use(lotErrorHandlers.createValidationError());
    await expect(
      lotsService.create({ subscriptionPlanId: "id", cardIds: ["a"] }),
    ).rejects.toMatchObject({
      response: { status: 400 },
    });
  });

  it("remove resolves void on 204", async () => {
    await expect(lotsService.remove("id")).resolves.toBeUndefined();
  });
});
