import { z } from "zod";
import {
  SubscriptionType,
  SubscriptionDuration,
  type CreateSubscriptionPlanCommand,
} from "@my-app/contract";
import type { useTranslation } from "@/hooks/useTranslation";

// Type/duration are enum-driven dropdowns, not free text (plan.md decision #3 — the spec's
// separate subscription-types/durations endpoints don't exist and aren't needed).
export function createSubscriptionPlanSchema(t: ReturnType<typeof useTranslation>["t"]) {
  return z.object({
    subscriptionType: z.enum(SubscriptionType, t("common.validation.selectRequired")),
    subscriptionDuration: z.enum(SubscriptionDuration, t("common.validation.selectRequired")),
  });
}

export type CreateSubscriptionPlanFormValues = z.infer<
  ReturnType<typeof createSubscriptionPlanSchema>
>;

// Compile-time guard — fails to compile if this schema's output drifts from the contract
// Command (e.g. a renamed/removed contract field).
type AssertAssignable<T extends true> = T;
type _CreateSubscriptionPlanCommandCheck = AssertAssignable<
  CreateSubscriptionPlanFormValues extends CreateSubscriptionPlanCommand ? true : false
>;
