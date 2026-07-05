import { http } from "msw";
import { ACTIVATOR_ROUTES, ErrorCode } from "@my-app/contract";
import { apiUrl } from "./api-url";
import { ok, fail, noContent } from "./envelope";
import {
  mockActivatorDashboard,
  mockPaginatedActivators,
  mockActivatorWithCredentials,
  mockActivatorDetail,
  mockActivator,
  mockActivatorGeneratedPassword,
  mockActivatorPerformance,
} from "../data/activators.mock";

export const activatorUrls = {
  myStats: apiUrl(ACTIVATOR_ROUTES.BASE, ACTIVATOR_ROUTES.MY_STATS),
  getAll: apiUrl(ACTIVATOR_ROUTES.BASE, ACTIVATOR_ROUTES.GET_ALL),
  create: apiUrl(ACTIVATOR_ROUTES.BASE, ACTIVATOR_ROUTES.CREATE),
  getById: apiUrl(ACTIVATOR_ROUTES.BASE, ACTIVATOR_ROUTES.GET_BY_ID),
  update: apiUrl(ACTIVATOR_ROUTES.BASE, ACTIVATOR_ROUTES.UPDATE),
  toggle: apiUrl(ACTIVATOR_ROUTES.BASE, ACTIVATOR_ROUTES.TOGGLE),
  resetPassword: apiUrl(ACTIVATOR_ROUTES.BASE, ACTIVATOR_ROUTES.RESET_PASSWORD),
  delete: apiUrl(ACTIVATOR_ROUTES.BASE, ACTIVATOR_ROUTES.DELETE),
  performance: apiUrl(ACTIVATOR_ROUTES.BASE, ACTIVATOR_ROUTES.PERFORMANCE),
};

// MY_STATS ('/me/stats') registered before the parameterized GET_BY_ID ('/:id') — mirrors
// Apps/api's own ordering comment on this exact route.
export const activatorHandlers = [
  http.get(activatorUrls.myStats, () => ok(mockActivatorDashboard)),
  http.get(activatorUrls.getAll, () => ok(mockPaginatedActivators)),
  http.post(activatorUrls.create, () => ok(mockActivatorWithCredentials, 201)),
  http.get(activatorUrls.getById, () => ok(mockActivatorDetail)),
  http.patch(activatorUrls.update, () => ok(mockActivator)),
  http.post(activatorUrls.toggle, () => ok(mockActivator)),
  http.post(activatorUrls.resetPassword, () => ok(mockActivatorGeneratedPassword)),
  http.delete(activatorUrls.delete, () => noContent()),
  http.get(activatorUrls.performance, () => ok(mockActivatorPerformance)),
];

export const activatorErrorHandlers = {
  myStatsServerError: () =>
    http.get(activatorUrls.myStats, () => fail(ErrorCode.INTERNAL_SERVER_ERROR, "boom", 500)),
  getAllServerError: () =>
    http.get(activatorUrls.getAll, () => fail(ErrorCode.INTERNAL_SERVER_ERROR, "boom", 500)),
  getByIdNotFound: () =>
    http.get(activatorUrls.getById, () => fail(ErrorCode.RESOURCE_NOT_FOUND, "Not found", 404)),
  createValidationError: () =>
    http.post(activatorUrls.create, () => fail(ErrorCode.VALIDATION_ERROR, "Invalid input", 400)),
};
