import { describe, it, expect } from "vitest";
import { SubscriptionType, SubscriptionDuration } from "@my-app/contract";
import { server } from "../../fixtures/msw/server";
import { subscriptionPlanErrorHandlers } from "../../fixtures/msw/subscription-plans.handlers";
import {
  mockSubscriptionPlans,
  mockSubscriptionPlan,
  mockCommissionDurations,
  mockCommissionMatrix,
  mockCommissionCell,
} from "../../fixtures/data/plans.mock";
import * as subscriptionPlansService from "@/services/subscription-plans.service";

describe("subscription-plans.service", () => {
  it("getAll returns the unwrapped array (not paginated)", async () => {
    const result = await subscriptionPlansService.getAll({});
    expect(result).toEqual(mockSubscriptionPlans);
  });

  it("getAll throws on 500", async () => {
    server.use(subscriptionPlanErrorHandlers.getAllServerError());
    await expect(subscriptionPlansService.getAll({})).rejects.toMatchObject({
      response: { status: 500 },
    });
  });

  it("create returns the unwrapped DTO (201)", async () => {
    const result = await subscriptionPlansService.create({
      subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
      subscriptionDuration: SubscriptionDuration.ONE_MONTH,
    });
    expect(result).toEqual(mockSubscriptionPlan);
  });

  it("create throws on a 400 validation error", async () => {
    server.use(subscriptionPlanErrorHandlers.createValidationError());
    await expect(
      subscriptionPlansService.create({
        subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
        subscriptionDuration: SubscriptionDuration.ONE_MONTH,
      }),
    ).rejects.toMatchObject({ response: { status: 400 } });
  });

  it("toggle returns the unwrapped DTO", async () => {
    const result = await subscriptionPlansService.toggle("id");
    expect(result).toEqual(mockSubscriptionPlan);
  });

  it("getCommissionDurations returns the unwrapped array", async () => {
    const result = await subscriptionPlansService.getCommissionDurations();
    expect(result).toEqual(mockCommissionDurations);
  });

  it("getCommissions returns the unwrapped matrix, null cells reaching the caller untouched", async () => {
    const result = await subscriptionPlansService.getCommissions();
    expect(result).toEqual(mockCommissionMatrix);
    expect(result.rows[0].cells[1].commission).toBeNull();
  });

  it("updateCommission PATCHes and returns the unwrapped cell DTO", async () => {
    const result = await subscriptionPlansService.updateCommission({
      subscriptionPlanId: "id",
      commissionDurationId: "id",
      commission: 75,
    });
    expect(result).toEqual(mockCommissionCell);
  });
});
