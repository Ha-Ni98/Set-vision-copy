import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";
import { server } from "../msw/server";
import * as tokenStore from "@/lib/token-store";

// `onUnhandledRequest: 'error'` — an un-mocked request is a test bug, not a pass-through
// (test-rules §3/§4: handlers must exist for every route a test exercises).
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

// JSDOM implements neither of these, and Radix's Select/Popover pointer-interaction
// internals call both — without a stub, clicking a shadcn Select trigger under RTL throws
// "target.hasPointerCapture is not a function" (a well-known JSDOM+Radix gap, not specific
// to this project). Needed by any test that opens a Select, not just this admin sub-stage.
if (typeof window !== "undefined") {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
}

// JSDOM has no ResizeObserver either — Radix's Checkbox (`@radix-ui/react-use-size`) calls
// it unconditionally on mount. Needed by any test that renders a shadcn Checkbox, not just
// this admin sub-stage (first hit here, in the create-lot candidate list).
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

afterEach(() => {
  // RTL's auto-cleanup hooks into a global afterEach when the test runner exposes one;
  // this project runs with `globals: false` (vitest.config.ts), so nothing unmounts
  // previous renders unless called explicitly here — every component test needs this.
  cleanup();
  server.resetHandlers();
  tokenStore.clear();
  localStorage.clear();
});

afterAll(() => server.close());
