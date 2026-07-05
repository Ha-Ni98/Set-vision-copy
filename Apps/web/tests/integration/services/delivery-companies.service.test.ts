import { describe, it, expect } from "vitest";
import { http } from "msw";
import { server } from "../../fixtures/msw/server";
import {
  deliveryCompanyUrls,
  deliveryCompanyErrorHandlers,
} from "../../fixtures/msw/delivery-companies.handlers";
import { ok } from "../../fixtures/msw/envelope";
import {
  mockDeliveryCompanies,
  mockDeliveryCompanyActive,
} from "../../fixtures/data/delivery-companies.mock";
import * as deliveryCompaniesService from "@/services/delivery-companies.service";

describe("delivery-companies.service", () => {
  it("getAll returns the unwrapped array", async () => {
    const result = await deliveryCompaniesService.getAll({});
    expect(result).toEqual(mockDeliveryCompanies);
  });

  it("getAll throws on 500", async () => {
    server.use(deliveryCompanyErrorHandlers.getAllServerError());
    await expect(deliveryCompaniesService.getAll({})).rejects.toMatchObject({
      response: { status: 500 },
    });
  });

  it("getAll serializes active as the literal string 'true'", async () => {
    let seenSearch = "";
    server.use(
      http.get(deliveryCompanyUrls.getAll, ({ request }) => {
        seenSearch = new URL(request.url).search;
        return ok(mockDeliveryCompanies);
      }),
    );
    await deliveryCompaniesService.getAll({ active: true });
    expect(seenSearch).toContain("active=true");
  });

  it("getAll serializes active as the literal string 'false'", async () => {
    let seenSearch = "";
    server.use(
      http.get(deliveryCompanyUrls.getAll, ({ request }) => {
        seenSearch = new URL(request.url).search;
        return ok(mockDeliveryCompanies);
      }),
    );
    await deliveryCompaniesService.getAll({ active: false });
    expect(seenSearch).toContain("active=false");
  });

  it("create returns the unwrapped DTO (201)", async () => {
    const result = await deliveryCompaniesService.create({
      name: "New Co",
      registeredName: "New Co SARL",
    });
    expect(result).toEqual(mockDeliveryCompanyActive);
  });

  it("create throws on a 400 validation error", async () => {
    server.use(deliveryCompanyErrorHandlers.createValidationError());
    await expect(
      deliveryCompaniesService.create({ name: "", registeredName: "" }),
    ).rejects.toMatchObject({
      response: { status: 400 },
    });
  });

  it("update returns the unwrapped DTO", async () => {
    const result = await deliveryCompaniesService.update("id", { name: "Updated" });
    expect(result).toEqual(mockDeliveryCompanyActive);
  });

  it("toggle returns the unwrapped DTO", async () => {
    const result = await deliveryCompaniesService.toggle("id");
    expect(result).toEqual(mockDeliveryCompanyActive);
  });
});
