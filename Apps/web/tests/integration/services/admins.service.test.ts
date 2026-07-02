import { describe, it, expect } from "vitest";
import { server } from "../../fixtures/msw/server";
import { adminErrorHandlers } from "../../fixtures/msw/admins.handlers";
import {
  mockPaginatedAdmins,
  mockAdminWithCredentials,
  mockAdmin,
  mockAdminGeneratedPassword,
} from "../../fixtures/data/admins.mock";
import * as adminsService from "@/services/admins.service";

describe("admins.service", () => {
  it("getAll returns the unwrapped paginated result", async () => {
    const result = await adminsService.getAll({ page: 1, limit: 10 });
    expect(result).toEqual(mockPaginatedAdmins);
  });

  it("getAll throws on 500", async () => {
    server.use(adminErrorHandlers.getAllServerError());
    await expect(adminsService.getAll({ page: 1, limit: 10 })).rejects.toMatchObject({
      response: { status: 500 },
    });
  });

  it("create returns the unwrapped credentials DTO (201)", async () => {
    const result = await adminsService.create({
      fullName: "New Admin",
      username: "new.admin",
      phone: "0555222333",
    });
    expect(result).toEqual(mockAdminWithCredentials);
  });

  it("create throws on a 400 validation error", async () => {
    server.use(adminErrorHandlers.createValidationError());
    await expect(
      adminsService.create({ fullName: "", username: "", phone: "" }),
    ).rejects.toMatchObject({
      response: { status: 400 },
    });
  });

  it("getById returns the unwrapped DTO", async () => {
    const result = await adminsService.getById("id");
    expect(result).toEqual(mockAdmin);
  });

  it("getById throws on 404", async () => {
    server.use(adminErrorHandlers.getByIdNotFound());
    await expect(adminsService.getById("nonexistent")).rejects.toMatchObject({
      response: { status: 404 },
    });
  });

  it("update returns the unwrapped DTO", async () => {
    const result = await adminsService.update("id", { fullName: "Updated" });
    expect(result).toEqual(mockAdmin);
  });

  it("toggle returns the unwrapped DTO", async () => {
    const result = await adminsService.toggle("id");
    expect(result).toEqual(mockAdmin);
  });

  it("resetPassword returns the unwrapped one-time password DTO", async () => {
    const result = await adminsService.resetPassword("id");
    expect(result).toEqual(mockAdminGeneratedPassword);
  });

  it("remove resolves void on 204", async () => {
    await expect(adminsService.remove("id")).resolves.toBeUndefined();
  });
});
