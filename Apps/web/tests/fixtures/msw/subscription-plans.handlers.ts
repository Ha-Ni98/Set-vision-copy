import { http } from "msw";
import { SUBSCRIPTION_PLAN_ROUTES, ErrorCode } from "@my-app/contract";
import { apiUrl } from "./api-url";
import { ok, fail } from "./envelope";
import {
  mockSubscriptionPlans,
  mockSubscriptionPlan,
  mockCommissionDurations,
  mockCommissionMatrix,
  mockCommissionCell,
} from "../data/plans.mock";

export const subscriptionPlanUrls = {
  getAll: apiUrl(SUBSCRIPTION_PLAN_ROUTES.BASE, SUBSCRIPTION_PLAN_ROUTES.GET_ALL),
  create: apiUrl(SUBSCRIPTION_PLAN_ROUTES.BASE, SUBSCRIPTION_PLAN_ROUTES.CREATE),
  toggle: apiUrl(SUBSCRIPTION_PLAN_ROUTES.BASE, SUBSCRIPTION_PLAN_ROUTES.TOGGLE),
  getCommissionDurations: apiUrl(
    SUBSCRIPTION_PLAN_ROUTES.BASE,
    SUBSCRIPTION_PLAN_ROUTES.GET_COMMISSION_DURATIONS,
  ),
  getCommissions: apiUrl(SUBSCRIPTION_PLAN_ROUTES.BASE, SUBSCRIPTION_PLAN_ROUTES.GET_COMMISSIONS),
  updateCommission: apiUrl(
    SUBSCRIPTION_PLAN_ROUTES.BASE,
    SUBSCRIPTION_PLAN_ROUTES.UPDATE_COMMISSION,
  ),
};

// Static routes ('/commission-durations', '/commissions') registered before the
// parameterized toggle ('/:id/toggle') — mirrors Apps/api's own router ordering comment
// ("Static routes first (before /:id/toggle to avoid param collision)").
export const subscriptionPlanHandlers = [
  http.get(subscriptionPlanUrls.getCommissionDurations, () => ok(mockCommissionDurations)),
  http.get(subscriptionPlanUrls.getCommissions, () => ok(mockCommissionMatrix)),
  http.patch(subscriptionPlanUrls.updateCommission, () => ok(mockCommissionCell)),
  http.get(subscriptionPlanUrls.getAll, () => ok(mockSubscriptionPlans)),
  http.post(subscriptionPlanUrls.create, () => ok(mockSubscriptionPlan, 201)),
  http.post(subscriptionPlanUrls.toggle, () => ok(mockSubscriptionPlan)),
];

export const subscriptionPlanErrorHandlers = {
  getAllServerError: () =>
    http.get(subscriptionPlanUrls.getAll, () => fail(ErrorCode.INTERNAL_SERVER_ERROR, "boom", 500)),
  createValidationError: () =>
    http.post(subscriptionPlanUrls.create, () =>
      fail(ErrorCode.VALIDATION_ERROR, "Invalid input", 400),
    ),
};
