import { http } from "msw";
import { GEOGRAPHY_ROUTES, ErrorCode } from "@my-app/contract";
import { apiUrl } from "./api-url";
import { ok, fail } from "./envelope";
import { mockWilayas, mockCommunes } from "../data/geography.mock";

export const geographyUrls = {
  wilayas: apiUrl(GEOGRAPHY_ROUTES.BASE, GEOGRAPHY_ROUTES.GET_WILAYAS),
  communes: apiUrl(GEOGRAPHY_ROUTES.BASE, GEOGRAPHY_ROUTES.GET_COMMUNES), // .../geography/wilayas/:wilayaId/communes
};

export const geographyHandlers = [
  http.get(geographyUrls.wilayas, () => ok(mockWilayas)),
  http.get(geographyUrls.communes, () => ok(mockCommunes)),
];

export const geographyErrorHandlers = {
  wilayasServerError: () =>
    http.get(geographyUrls.wilayas, () => fail(ErrorCode.INTERNAL_SERVER_ERROR, "boom", 500)),
  communesServerError: () =>
    http.get(geographyUrls.communes, () => fail(ErrorCode.INTERNAL_SERVER_ERROR, "boom", 500)),
};
