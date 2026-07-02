import { http } from "msw";
import { DISTRIBUTOR_ROUTES, ErrorCode } from "@my-app/contract";
import { apiUrl } from "./api-url";
import { ok, fail, noContent } from "./envelope";
import {
  mockPaginatedDistributors,
  mockDistributor,
  mockDistributorDetail,
} from "../data/distributors.mock";

export const distributorUrls = {
  getAll: apiUrl(DISTRIBUTOR_ROUTES.BASE, DISTRIBUTOR_ROUTES.GET_ALL),
  create: apiUrl(DISTRIBUTOR_ROUTES.BASE, DISTRIBUTOR_ROUTES.CREATE),
  getById: apiUrl(DISTRIBUTOR_ROUTES.BASE, DISTRIBUTOR_ROUTES.GET_BY_ID),
  update: apiUrl(DISTRIBUTOR_ROUTES.BASE, DISTRIBUTOR_ROUTES.UPDATE),
  toggle: apiUrl(DISTRIBUTOR_ROUTES.BASE, DISTRIBUTOR_ROUTES.TOGGLE),
  delete: apiUrl(DISTRIBUTOR_ROUTES.BASE, DISTRIBUTOR_ROUTES.DELETE),
};

export const distributorHandlers = [
  http.get(distributorUrls.getAll, () => ok(mockPaginatedDistributors)),
  http.post(distributorUrls.create, () => ok(mockDistributor, 201)),
  http.get(distributorUrls.getById, () => ok(mockDistributorDetail)),
  http.patch(distributorUrls.update, () => ok(mockDistributor)),
  http.post(distributorUrls.toggle, () => ok(mockDistributor)),
  http.delete(distributorUrls.delete, () => noContent()),
];

export const distributorErrorHandlers = {
  getAllServerError: () =>
    http.get(distributorUrls.getAll, () => fail(ErrorCode.INTERNAL_SERVER_ERROR, "boom", 500)),
  getByIdNotFound: () =>
    http.get(distributorUrls.getById, () => fail(ErrorCode.RESOURCE_NOT_FOUND, "Not found", 404)),
  createValidationError: () =>
    http.post(distributorUrls.create, () => fail(ErrorCode.VALIDATION_ERROR, "Invalid input", 400)),
};
