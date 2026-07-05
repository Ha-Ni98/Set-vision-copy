import { http } from "msw";
import { ADMIN_ROUTES, ErrorCode } from "@my-app/contract";
import { apiUrl } from "./api-url";
import { ok, fail, noContent } from "./envelope";
import {
  mockPaginatedAdmins,
  mockAdminWithCredentials,
  mockAdmin,
  mockAdminGeneratedPassword,
} from "../data/admins.mock";

export const adminUrls = {
  getAll: apiUrl(ADMIN_ROUTES.BASE, ADMIN_ROUTES.GET_ALL),
  create: apiUrl(ADMIN_ROUTES.BASE, ADMIN_ROUTES.CREATE),
  getById: apiUrl(ADMIN_ROUTES.BASE, ADMIN_ROUTES.GET_BY_ID),
  update: apiUrl(ADMIN_ROUTES.BASE, ADMIN_ROUTES.UPDATE),
  toggle: apiUrl(ADMIN_ROUTES.BASE, ADMIN_ROUTES.TOGGLE),
  resetPassword: apiUrl(ADMIN_ROUTES.BASE, ADMIN_ROUTES.RESET_PASSWORD),
  delete: apiUrl(ADMIN_ROUTES.BASE, ADMIN_ROUTES.DELETE),
};

export const adminHandlers = [
  http.get(adminUrls.getAll, () => ok(mockPaginatedAdmins)),
  http.post(adminUrls.create, () => ok(mockAdminWithCredentials, 201)),
  http.get(adminUrls.getById, () => ok(mockAdmin)),
  http.patch(adminUrls.update, () => ok(mockAdmin)),
  http.post(adminUrls.toggle, () => ok(mockAdmin)),
  http.post(adminUrls.resetPassword, () => ok(mockAdminGeneratedPassword)),
  http.delete(adminUrls.delete, () => noContent()),
];

export const adminErrorHandlers = {
  getAllServerError: () =>
    http.get(adminUrls.getAll, () => fail(ErrorCode.INTERNAL_SERVER_ERROR, "boom", 500)),
  getByIdNotFound: () =>
    http.get(adminUrls.getById, () => fail(ErrorCode.RESOURCE_NOT_FOUND, "Not found", 404)),
  createValidationError: () =>
    http.post(adminUrls.create, () => fail(ErrorCode.VALIDATION_ERROR, "Invalid input", 400)),
};
