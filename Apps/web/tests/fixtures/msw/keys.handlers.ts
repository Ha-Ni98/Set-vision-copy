import { http } from "msw";
import { KEY_ROUTES, ErrorCode } from "@my-app/contract";
import { apiUrl } from "./api-url";
import { ok, fail } from "./envelope";
import { mockKeyReady, mockClientActivationStatus } from "../data/keys.mock";

export const keysUrls = {
  verify: apiUrl(KEY_ROUTES.BASE, KEY_ROUTES.VERIFY),
  submit: apiUrl(KEY_ROUTES.BASE, KEY_ROUTES.SUBMIT),
  update: apiUrl(KEY_ROUTES.BASE, KEY_ROUTES.UPDATE), // .../keys/:activationId/update
  additional: apiUrl(KEY_ROUTES.BASE, KEY_ROUTES.ADDITIONAL),
  status: apiUrl(KEY_ROUTES.BASE, KEY_ROUTES.STATUS),
};

export const keysHandlers = [
  http.post(keysUrls.verify, () => ok(mockKeyReady)),
  http.post(keysUrls.submit, () => ok(mockClientActivationStatus, 201)),
  http.post(keysUrls.update, () => ok(mockClientActivationStatus)),
  http.post(keysUrls.additional, () => ok(mockClientActivationStatus)),
  http.get(keysUrls.status, () => ok(mockClientActivationStatus)),
];

export const keysErrorHandlers = {
  submitValidationError: () =>
    http.post(keysUrls.submit, () => fail(ErrorCode.VALIDATION_ERROR, "Invalid submission", 400)),
  updateNotFound: () =>
    http.post(keysUrls.update, () =>
      fail(ErrorCode.RESOURCE_NOT_FOUND, "Activation not found", 404),
    ),
  statusServerError: () =>
    http.get(keysUrls.status, () => fail(ErrorCode.INTERNAL_SERVER_ERROR, "boom", 500)),
};
