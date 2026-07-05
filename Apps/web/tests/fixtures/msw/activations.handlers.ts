import { http } from "msw";
import { ACTIVATION_ROUTES, ErrorCode } from "@my-app/contract";
import { apiUrl } from "./api-url";
import { ok, fail, noContent } from "./envelope";
import {
  mockPendingActivation,
  mockActiveRequestNulls,
  mockPaginatedHistory,
  mockRecentActivation,
  mockPaginatedActivations,
  mockActivationDetail,
  mockAdminActivation,
} from "../data/activations.mock";

export const activationsUrls = {
  pending: apiUrl(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.GET_PENDING),
  active: apiUrl(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.GET_ACTIVE),
  myHistory: apiUrl(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.GET_MY_HISTORY),
  recent: apiUrl(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.GET_RECENT),
  all: apiUrl(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.GET_ALL),
  byId: apiUrl(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.GET_BY_ID), // .../:id — registered after statics below
  take: apiUrl(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.TAKE),
  flagWrong: apiUrl(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.FLAG_WRONG),
  requestAdditional: apiUrl(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.REQUEST_ADDITIONAL),
  activate: apiUrl(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.ACTIVATE),
  cancel: apiUrl(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.CANCEL),
  release: apiUrl(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.RELEASE),
  freeze: apiUrl(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.FREEZE),
  activateByAdmin: apiUrl(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.ACTIVATE_BY_ADMIN),
  cancelByAdmin: apiUrl(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.CANCEL_BY_ADMIN),
  setPrice: apiUrl(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.SET_PRICE),
};

// Static GET routes (pending/active/my-history/recent/all) registered before the
// parameterized GET_BY_ID (`:id`) — mirrors Apps/api's own activation.routes.ts ordering
// ("Static GET routes registered before /:id to avoid param-shadow"), since `/activations/
// pending` and `/activations/:id` are structurally identical one-segment paths and MSW
// matches handlers in registration order, first match wins.
export const activationsHandlers = [
  http.get(activationsUrls.pending, () => ok([mockPendingActivation])),
  http.get(activationsUrls.active, () => ok([mockActiveRequestNulls])),
  http.get(activationsUrls.myHistory, () => ok(mockPaginatedHistory)),
  http.get(activationsUrls.recent, () => ok([mockRecentActivation])),
  http.get(activationsUrls.all, () => ok(mockPaginatedActivations)),
  http.get(activationsUrls.byId, () => ok(mockActivationDetail)),
  http.post(activationsUrls.take, () => ok(mockActiveRequestNulls)),
  http.post(activationsUrls.flagWrong, () => ok(mockActiveRequestNulls)),
  http.post(activationsUrls.requestAdditional, () => ok(mockActiveRequestNulls)),
  http.post(activationsUrls.activate, () => ok(mockActiveRequestNulls)),
  http.post(activationsUrls.cancel, () => noContent()),
  http.post(activationsUrls.release, () => noContent()),
  http.post(activationsUrls.freeze, () => ok(mockActiveRequestNulls)),
  http.post(activationsUrls.activateByAdmin, () => ok(mockAdminActivation)),
  http.post(activationsUrls.cancelByAdmin, () => ok(mockAdminActivation)),
  http.post(activationsUrls.setPrice, () => ok(mockAdminActivation)),
];

export const activationsErrorHandlers = {
  takeConflict: () =>
    http.post(activationsUrls.take, () => fail(ErrorCode.RESOURCE_CONFLICT, "Already taken", 409)),
  flagWrongValidation: () =>
    http.post(activationsUrls.flagWrong, () =>
      fail(ErrorCode.VALIDATION_ERROR, "fields required", 400),
    ),
  byIdNotFound: () =>
    http.get(activationsUrls.byId, () => fail(ErrorCode.RESOURCE_NOT_FOUND, "Not found", 404)),
  allServerError: () =>
    http.get(activationsUrls.all, () => fail(ErrorCode.INTERNAL_SERVER_ERROR, "boom", 500)),
  myHistoryServerError: () =>
    http.get(activationsUrls.myHistory, () => fail(ErrorCode.INTERNAL_SERVER_ERROR, "boom", 500)),
};
