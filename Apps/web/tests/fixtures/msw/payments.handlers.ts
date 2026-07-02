import { http } from "msw";
import { PAYMENT_ROUTES, ErrorCode } from "@my-app/contract";
import { apiUrl } from "./api-url";
import { ok, fail, noContent } from "./envelope";
import { mockPaginatedPayments, mockPayment } from "../data/payments.mock";

export const paymentUrls = {
  getAll: apiUrl(PAYMENT_ROUTES.BASE, PAYMENT_ROUTES.GET_ALL),
  create: apiUrl(PAYMENT_ROUTES.BASE, PAYMENT_ROUTES.CREATE),
  delete: apiUrl(PAYMENT_ROUTES.BASE, PAYMENT_ROUTES.DELETE),
};

export const paymentHandlers = [
  http.get(paymentUrls.getAll, () => ok(mockPaginatedPayments)),
  http.post(paymentUrls.create, () => ok(mockPayment, 201)),
  http.delete(paymentUrls.delete, () => noContent()),
];

export const paymentErrorHandlers = {
  getAllServerError: () =>
    http.get(paymentUrls.getAll, () => fail(ErrorCode.INTERNAL_SERVER_ERROR, "boom", 500)),
  createValidationError: () =>
    http.post(paymentUrls.create, () => fail(ErrorCode.VALIDATION_ERROR, "Invalid amount", 400)),
};
