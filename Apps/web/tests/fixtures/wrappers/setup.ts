import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "../msw/server";
import * as tokenStore from "@/lib/token-store";

// `onUnhandledRequest: 'error'` — an un-mocked request is a test bug, not a pass-through
// (test-rules §3/§4: handlers must exist for every route a test exercises).
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

afterEach(() => {
  server.resetHandlers();
  tokenStore.clear();
  localStorage.clear();
});

afterAll(() => server.close());
