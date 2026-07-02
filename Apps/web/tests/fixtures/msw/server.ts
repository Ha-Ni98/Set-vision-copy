import { setupServer } from "msw/node";
import type { RequestHandler } from "msw";
import { authHandlers } from "./auth.handlers";
import { keysHandlers } from "./keys.handlers";
import { activationsHandlers } from "./activations.handlers";
import { activatorHandlers } from "./activators.handlers";
import { adminHandlers } from "./admins.handlers";
import { paymentHandlers } from "./payments.handlers";
import { geographyHandlers } from "./geography.handlers";
import { distributorHandlers } from "./distributors.handlers";
import { deliveryCompanyHandlers } from "./delivery-companies.handlers";

// Populated incrementally — each sprint appends its domain's handlers array here
// (plan.md §4.2).
const handlers: RequestHandler[] = [
  ...authHandlers,
  ...keysHandlers,
  ...activationsHandlers,
  ...activatorHandlers,
  ...adminHandlers,
  ...paymentHandlers,
  ...geographyHandlers,
  ...distributorHandlers,
  ...deliveryCompanyHandlers,
];

export const server = setupServer(...handlers);
