import { http } from "msw";
import { CARD_ROUTES, ErrorCode } from "@my-app/contract";
import { apiUrl } from "./api-url";
import { ok, fail, noContent } from "./envelope";
import {
  mockPaginatedCards,
  mockAvailableCard,
  mockCardDetail,
  mockCardAtDistributor,
} from "../data/cards.mock";

export const cardUrls = {
  getAll: apiUrl(CARD_ROUTES.BASE, CARD_ROUTES.GET_ALL),
  getAvailableForLot: apiUrl(CARD_ROUTES.BASE, CARD_ROUTES.GET_AVAILABLE_FOR_LOT),
  getById: apiUrl(CARD_ROUTES.BASE, CARD_ROUTES.GET_BY_ID),
  delete: apiUrl(CARD_ROUTES.BASE, CARD_ROUTES.DELETE),
  disable: apiUrl(CARD_ROUTES.BASE, CARD_ROUTES.DISABLE),
  enable: apiUrl(CARD_ROUTES.BASE, CARD_ROUTES.ENABLE),
  revoke: apiUrl(CARD_ROUTES.BASE, CARD_ROUTES.REVOKE),
};

// getAvailableForLot ('/available-for-lot') registered before the parameterized getById
// ('/:id') — both are single-segment GET routes, so MSW's first-match-wins registration
// order matters here exactly as it does in Apps/api's own router (plan.md §2.15 note).
export const cardHandlers = [
  http.get(cardUrls.getAll, () => ok(mockPaginatedCards)),
  http.get(cardUrls.getAvailableForLot, () => ok([mockAvailableCard])),
  http.get(cardUrls.getById, () => ok(mockCardDetail)),
  http.delete(cardUrls.delete, () => noContent()),
  http.post(cardUrls.disable, () => ok(mockCardAtDistributor)),
  http.post(cardUrls.enable, () => ok(mockCardAtDistributor)),
  http.post(cardUrls.revoke, () => ok(mockCardAtDistributor)),
];

export const cardErrorHandlers = {
  getAllServerError: () =>
    http.get(cardUrls.getAll, () => fail(ErrorCode.INTERNAL_SERVER_ERROR, "boom", 500)),
  getByIdNotFound: () =>
    http.get(cardUrls.getById, () => fail(ErrorCode.RESOURCE_NOT_FOUND, "Not found", 404)),
};
