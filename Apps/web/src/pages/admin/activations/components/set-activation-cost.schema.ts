import { z } from "zod";
import type { SetActivationCostCommand } from "@my-app/contract";
import type { useTranslation } from "@/hooks/useTranslation";

// Shared by the Activations list (row action) and Activation Detail (Financial block) —
// mirrors set-activator-price.schema.ts's own pattern (Set 9 plan §5.3).
export function setActivationCostSchema(t: ReturnType<typeof useTranslation>["t"]) {
  return z.object({
    amount: z.coerce
      .number()
      .nonnegative(t("common.validation.nonNegativeNumber"))
      .multipleOf(0.01, t("common.validation.invalidAmount")),
  });
}

export type SetActivationCostFormValues = z.infer<ReturnType<typeof setActivationCostSchema>>;
// Pre-coercion shape (amount accepts the raw string a number input produces).
export type SetActivationCostFormInput = z.input<ReturnType<typeof setActivationCostSchema>>;

// Compile-time guard — fails to compile if this schema's output drifts from the contract
// Command (e.g. a renamed/removed contract field).
type AssertAssignable<T extends true> = T;
type _SetActivationCostCommandCheck = AssertAssignable<
  SetActivationCostFormValues extends SetActivationCostCommand ? true : false
>;
