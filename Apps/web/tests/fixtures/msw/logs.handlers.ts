import { http } from "msw";
import { LOG_ROUTES, ErrorCode } from "@my-app/contract";
import { apiUrl } from "./api-url";
import { ok, fail } from "./envelope";
import { mockPaginatedLogs } from "../data/logs.mock";

export const logUrls = {
  getAll: apiUrl(LOG_ROUTES.BASE, LOG_ROUTES.GET_ALL),
};

export const logHandlers = [http.get(logUrls.getAll, () => ok(mockPaginatedLogs))];

export const logErrorHandlers = {
  getAllServerError: () =>
    http.get(logUrls.getAll, () => fail(ErrorCode.INTERNAL_SERVER_ERROR, "boom", 500)),
};
