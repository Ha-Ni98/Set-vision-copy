import { z } from "zod";
import type { UpdateSubscriptionPlanCostCommand } from "@my-app/contract";
import type { useTranslation } from "@/hooks/useTranslation";

// `subscriptionPlanId` is injected by the caller (the cell already knows its row) — mirrors
// commission-cell.schema.ts's own injection pattern.
export function planCostCellSchema(t: ReturnType<typeof useTranslation>["t"]) {
  return z.object({
    cost: z.coerce
      .number()
      .nonnegative(t("common.validation.nonNegativeNumber"))
      .multipleOf(0.01, t("common.validation.invalidAmount")),
  });
}

export type PlanCostCellFormValues = z.infer<ReturnType<typeof planCostCellSchema>>;
// Pre-coercion shape (cost accepts the raw string a number input produces).
export type PlanCostCellFormInput = z.input<ReturnType<typeof planCostCellSchema>>;

// Compile-time guard — fails to compile if the cell's output plus the injected id drifts
// from the contract Command.
type AssertAssignable<T extends true> = T;
type _UpdateSubscriptionPlanCostCommandCheck = AssertAssignable<
  PlanCostCellFormValues & { subscriptionPlanId: string } extends UpdateSubscriptionPlanCostCommand
    ? true
    : false
>;
