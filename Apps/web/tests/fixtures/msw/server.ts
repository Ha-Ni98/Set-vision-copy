import { setupServer } from "msw/node";
import type { RequestHandler } from "msw";

// Populated incrementally — each sprint appends its domain's handlers array here
// (plan.md §4.2). Empty until the Auth sprint adds the first domain.
const handlers: RequestHandler[] = [];

export const server = setupServer(...handlers);
