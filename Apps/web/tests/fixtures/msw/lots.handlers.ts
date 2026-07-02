import { http } from "msw";
import { LOT_ROUTES, ErrorCode } from "@my-app/contract";
import { apiUrl } from "./api-url";
import { ok, fail, noContent } from "./envelope";
import { mockPaginatedLots, mockLotDelivered } from "../data/lots.mock";

export const lotUrls = {
  getAvailableForOrder: apiUrl(LOT_ROUTES.BASE, LOT_ROUTES.GET_AVAILABLE_FOR_ORDER),
  getAll: apiUrl(LOT_ROUTES.BASE, LOT_ROUTES.GET_ALL),
  create: apiUrl(LOT_ROUTES.BASE, LOT_ROUTES.CREATE),
  delete: apiUrl(LOT_ROUTES.BASE, LOT_ROUTES.DELETE),
};

// available-for-order registered before the general list, mirroring Apps/api's own
// ordering comment on this route.
export const lotHandlers = [
  http.get(lotUrls.getAvailableForOrder, () => ok([mockLotDelivered])),
  http.get(lotUrls.getAll, () => ok(mockPaginatedLots)),
  http.post(lotUrls.create, () => ok(mockLotDelivered, 201)),
  http.delete(lotUrls.delete, () => noContent()),
];

export const lotErrorHandlers = {
  getAllServerError: () =>
    http.get(lotUrls.getAll, () => fail(ErrorCode.INTERNAL_SERVER_ERROR, "boom", 500)),
  createValidationError: () =>
    http.post(lotUrls.create, () => fail(ErrorCode.VALIDATION_ERROR, "Invalid input", 400)),
};
