import { describe, it, expect } from "vitest";
import { server } from "../../fixtures/msw/server";
import { cardErrorHandlers } from "../../fixtures/msw/cards.handlers";
import {
  mockPaginatedCards,
  mockAvailableCard,
  mockCardDetail,
  mockCardAtDistributor,
} from "../../fixtures/data/cards.mock";
import * as cardsService from "@/services/cards.service";

describe("cards.service", () => {
  it("getAll returns the unwrapped paginated result", async () => {
    const result = await cardsService.getAll({});
    expect(result).toEqual(mockPaginatedCards);
  });

  it("getAll throws on 500", async () => {
    server.use(cardErrorHandlers.getAllServerError());
    await expect(cardsService.getAll({})).rejects.toMatchObject({ response: { status: 500 } });
  });

  it("getAvailableForLot hits its own literal-path handler, not the parameterized getById (handler-ordering regression guard)", async () => {
    const result = await cardsService.getAvailableForLot({ subscriptionPlanId: "id" });
    expect(result).toEqual([mockAvailableCard]);
    // If handler registration order were reversed, this would resolve mockCardDetail
    // (getById's fixture) instead — this proves ordering actually matters, not just
    // documents it.
    expect(result).not.toEqual(mockCardDetail);
  });

  it("getById returns the unwrapped detail DTO", async () => {
    const result = await cardsService.getById("id");
    expect(result).toEqual(mockCardDetail);
  });

  it("getById throws on 404", async () => {
    server.use(cardErrorHandlers.getByIdNotFound());
    await expect(cardsService.getById("nonexistent")).rejects.toMatchObject({
      response: { status: 404 },
    });
  });

  it("remove resolves void on 204", async () => {
    await expect(cardsService.remove("id")).resolves.toBeUndefined();
  });

  it("disable returns the unwrapped DTO", async () => {
    const result = await cardsService.disable("id");
    expect(result).toEqual(mockCardAtDistributor);
  });

  it("enable returns the unwrapped DTO", async () => {
    const result = await cardsService.enable("id");
    expect(result).toEqual(mockCardAtDistributor);
  });

  it("revoke returns the unwrapped DTO", async () => {
    const result = await cardsService.revoke("id");
    expect(result).toEqual(mockCardAtDistributor);
  });
});
