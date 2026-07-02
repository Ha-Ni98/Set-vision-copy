import { HttpResponse } from "msw";
import type { ApiResponse, ErrorCode } from "@my-app/contract";

// Mirrors Apps/api's sendSuccess()/globalErrorHandler exactly (test-rules §3) so a handler
// can never drift from what the live API actually sends.
export function ok<T>(data: T, status = 200) {
  const body: ApiResponse<T> = { success: true, data };
  return HttpResponse.json(body, { status });
}

export function fail(code: ErrorCode, message: string, status: number, details?: unknown) {
  const body: ApiResponse<never> = { success: false, error: { code, message, details } };
  return HttpResponse.json(body, { status });
}

// 204 endpoints (logout, cancel, release, deletes) are an envelope exception — no body at
// all, not `ApiResponse<null>` (plan.md §7.2).
export function noContent() {
  return new HttpResponse(null, { status: 204 });
}
