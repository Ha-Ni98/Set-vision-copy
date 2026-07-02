import { describe, it, expect } from "vitest";
import { server } from "../../fixtures/msw/server";
import { distributorErrorHandlers } from "../../fixtures/msw/distributors.handlers";
import {
  mockPaginatedDistributors,
  mockDistributor,
  mockDistributorDetail,
} from "../../fixtures/data/distributors.mock";
import * as distributorsService from "@/services/distributors.service";

describe("distributors.service", () => {
  it("getAll returns the unwrapped paginated result", async () => {
    const result = await distributorsService.getAll({});
    expect(result).toEqual(mockPaginatedDistributors);
  });

  it("getAll throws on 500", async () => {
    server.use(distributorErrorHandlers.getAllServerError());
    await expect(distributorsService.getAll({})).rejects.toMatchObject({
      response: { status: 500 },
    });
  });

  it("create returns the unwrapped DTO (201)", async () => {
    const result = await distributorsService.create({
      fullName: "New Distributor",
      storeName: "New Store",
      phone: "0555666777",
      wilayaId: "id",
      communeId: "id",
    });
    expect(result).toEqual(mockDistributor);
  });

  it("create throws on a 400 validation error", async () => {
    server.use(distributorErrorHandlers.createValidationError());
    await expect(
      distributorsService.create({
        fullName: "",
        storeName: "",
        phone: "",
        wilayaId: "id",
        communeId: "id",
      }),
    ).rejects.toMatchObject({ response: { status: 400 } });
  });

  it("getById returns the unwrapped detail DTO", async () => {
    const result = await distributorsService.getById("id");
    expect(result).toEqual(mockDistributorDetail);
  });

  it("getById throws on 404", async () => {
    server.use(distributorErrorHandlers.getByIdNotFound());
    await expect(distributorsService.getById("nonexistent")).rejects.toMatchObject({
      response: { status: 404 },
    });
  });

  it("update returns the unwrapped DTO", async () => {
    const result = await distributorsService.update("id", { fullName: "Updated" });
    expect(result).toEqual(mockDistributor);
  });

  it("toggle returns the unwrapped DTO", async () => {
    const result = await distributorsService.toggle("id");
    expect(result).toEqual(mockDistributor);
  });

  it("remove resolves void on 204", async () => {
    await expect(distributorsService.remove("id")).resolves.toBeUndefined();
  });
});
