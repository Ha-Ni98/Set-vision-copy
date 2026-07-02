import { setupServer } from "msw/node";
import type { RequestHandler } from "msw";
import { authHandlers } from "./auth.handlers";

// Populated incrementally — each sprint appends its domain's handlers array here
// (plan.md §4.2).
const handlers: RequestHandler[] = [...authHandlers];

export const server = setupServer(...handlers);
