import { setupServer } from "msw/node";
import type { RequestHandler } from "msw";
import { authHandlers } from "./auth.handlers";
import { keysHandlers } from "./keys.handlers";
import { activationsHandlers } from "./activations.handlers";

// Populated incrementally — each sprint appends its domain's handlers array here
// (plan.md §4.2).
const handlers: RequestHandler[] = [...authHandlers, ...keysHandlers, ...activationsHandlers];

export const server = setupServer(...handlers);
