import { http } from "msw";
import { ORDER_ROUTES, ErrorCode } from "@my-app/contract";
import { apiUrl } from "./api-url";
import { ok, fail, noContent } from "./envelope";
import {
  mockPaginatedOrders,
  mockOrderDetail,
  mockOrderPendingDelivery,
} from "../data/orders.mock";

export const orderUrls = {
  getAll: apiUrl(ORDER_ROUTES.BASE, ORDER_ROUTES.GET_ALL),
  getById: apiUrl(ORDER_ROUTES.BASE, ORDER_ROUTES.GET_BY_ID),
  create: apiUrl(ORDER_ROUTES.BASE, ORDER_ROUTES.CREATE),
  transition: apiUrl(ORDER_ROUTES.BASE, ORDER_ROUTES.TRANSITION),
  delete: apiUrl(ORDER_ROUTES.BASE, ORDER_ROUTES.DELETE),
};

export const orderHandlers = [
  http.get(orderUrls.getAll, () => ok(mockPaginatedOrders)),
  http.get(orderUrls.getById, () => ok(mockOrderDetail)),
  http.post(orderUrls.create, () => ok(mockOrderPendingDelivery, 201)),
  http.post(orderUrls.transition, () => ok(mockOrderPendingDelivery)),
  http.delete(orderUrls.delete, () => noContent()),
];

export const orderErrorHandlers = {
  getAllServerError: () =>
    http.get(orderUrls.getAll, () => fail(ErrorCode.INTERNAL_SERVER_ERROR, "boom", 500)),
  createValidationError: () =>
    http.post(orderUrls.create, () => fail(ErrorCode.VALIDATION_ERROR, "Invalid input", 400)),
};
