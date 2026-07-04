import { describe, it, expect } from "vitest";
import { SetStat } from "@my-app/contract";
import { server } from "../../fixtures/msw/server";
import { setErrorHandlers } from "../../fixtures/msw/sets.handlers";
import { mockPaginatedSets, mockSetPrinted } from "../../fixtures/data/sets.mock";
import * as setsService from "@/services/sets.service";

describe("sets.service", () => {
  it("getAll returns the unwrapped paginated result", async () => {
    const result = await setsService.getAll({});
    expect(result).toEqual(mockPaginatedSets);
  });

  it("getAll throws on 500", async () => {
    server.use(setErrorHandlers.getAllServerError());
    await expect(setsService.getAll({})).rejects.toMatchObject({ response: { status: 500 } });
  });

  it("create returns the unwrapped DTO (201)", async () => {
    const result = await setsService.create({ numberOfKeys: 100, subscriptionPlanId: "id" });
    expect(result).toEqual(mockSetPrinted);
  });

  it("create throws on a 400 validation error", async () => {
    server.use(setErrorHandlers.createValidationError());
    await expect(
      setsService.create({ numberOfKeys: 100, subscriptionPlanId: "id" }),
    ).rejects.toMatchObject({
      response: { status: 400 },
    });
  });

  it("transition sends the schema-constrained command (PENDING_PRINTING | PRINTED) and returns the unwrapped DTO", async () => {
    const result = await setsService.transition("id", { to: SetStat.PRINTED });
    expect(result).toEqual(mockSetPrinted);
  });

  it("remove resolves void on 204", async () => {
    await expect(setsService.remove("id")).resolves.toBeUndefined();
  });
});
