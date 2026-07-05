import { http } from "msw";
import { SET_ROUTES, ErrorCode } from "@my-app/contract";
import { apiUrl } from "./api-url";
import { ok, fail, noContent } from "./envelope";
import { mockPaginatedSets, mockSetPrinted } from "../data/sets.mock";

export const setUrls = {
  getAll: apiUrl(SET_ROUTES.BASE, SET_ROUTES.GET_ALL),
  create: apiUrl(SET_ROUTES.BASE, SET_ROUTES.CREATE),
  transition: apiUrl(SET_ROUTES.BASE, SET_ROUTES.TRANSITION),
  delete: apiUrl(SET_ROUTES.BASE, SET_ROUTES.DELETE),
};

export const setHandlers = [
  http.get(setUrls.getAll, () => ok(mockPaginatedSets)),
  http.post(setUrls.create, () => ok(mockSetPrinted, 201)),
  http.post(setUrls.transition, () => ok(mockSetPrinted)),
  http.delete(setUrls.delete, () => noContent()),
];

export const setErrorHandlers = {
  getAllServerError: () =>
    http.get(setUrls.getAll, () => fail(ErrorCode.INTERNAL_SERVER_ERROR, "boom", 500)),
  createValidationError: () =>
    http.post(setUrls.create, () => fail(ErrorCode.VALIDATION_ERROR, "Invalid input", 400)),
};
