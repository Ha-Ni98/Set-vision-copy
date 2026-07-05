import { z } from "zod";
import type { SetActivatorPriceCommand } from "@my-app/contract";
import type { useTranslation } from "@/hooks/useTranslation";

// Shared by the Activations list (row action) and Activation Detail (Financial block).
export function setActivatorPriceSchema(t: ReturnType<typeof useTranslation>["t"]) {
  return z.object({
    amount: z.coerce
      .number()
      .nonnegative(t("common.validation.nonNegativeNumber"))
      .multipleOf(0.01, t("common.validation.invalidAmount")),
  });
}

export type SetActivatorPriceFormValues = z.infer<ReturnType<typeof setActivatorPriceSchema>>;
// Pre-coercion shape (amount accepts the raw string a number input produces).
export type SetActivatorPriceFormInput = z.input<ReturnType<typeof setActivatorPriceSchema>>;

// Compile-time guard — fails to compile if this schema's output drifts from the contract
// Command (e.g. a renamed/removed contract field).
type AssertAssignable<T extends true> = T;
type _SetActivatorPriceCommandCheck = AssertAssignable<
  SetActivatorPriceFormValues extends SetActivatorPriceCommand ? true : false
>;
