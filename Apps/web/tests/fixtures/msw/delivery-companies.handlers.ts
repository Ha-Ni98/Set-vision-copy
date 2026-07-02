import { http } from "msw";
import { DELIVERY_COMPANY_ROUTES, ErrorCode } from "@my-app/contract";
import { apiUrl } from "./api-url";
import { ok, fail } from "./envelope";
import { mockDeliveryCompanies, mockDeliveryCompanyActive } from "../data/delivery-companies.mock";

export const deliveryCompanyUrls = {
  getAll: apiUrl(DELIVERY_COMPANY_ROUTES.BASE, DELIVERY_COMPANY_ROUTES.GET_ALL),
  create: apiUrl(DELIVERY_COMPANY_ROUTES.BASE, DELIVERY_COMPANY_ROUTES.CREATE),
  update: apiUrl(DELIVERY_COMPANY_ROUTES.BASE, DELIVERY_COMPANY_ROUTES.UPDATE),
  toggle: apiUrl(DELIVERY_COMPANY_ROUTES.BASE, DELIVERY_COMPANY_ROUTES.TOGGLE),
};

export const deliveryCompanyHandlers = [
  http.get(deliveryCompanyUrls.getAll, () => ok(mockDeliveryCompanies)),
  http.post(deliveryCompanyUrls.create, () => ok(mockDeliveryCompanyActive, 201)),
  http.patch(deliveryCompanyUrls.update, () => ok(mockDeliveryCompanyActive)),
  http.post(deliveryCompanyUrls.toggle, () => ok(mockDeliveryCompanyActive)),
];

export const deliveryCompanyErrorHandlers = {
  getAllServerError: () =>
    http.get(deliveryCompanyUrls.getAll, () => fail(ErrorCode.INTERNAL_SERVER_ERROR, "boom", 500)),
  createValidationError: () =>
    http.post(deliveryCompanyUrls.create, () =>
      fail(ErrorCode.VALIDATION_ERROR, "Invalid input", 400),
    ),
};
