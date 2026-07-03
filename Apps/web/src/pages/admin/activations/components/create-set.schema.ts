import { z } from "zod";
import type { CreateSetCommand } from "@my-app/contract";
import type { useTranslation } from "@/hooks/useTranslation";

export function createSetSchema(t: ReturnType<typeof useTranslation>["t"]) {
  return z.object({
    subscriptionPlanId: z.string().min(1, t("common.validation.selectRequired")),
    numberOfKeys: z.coerce
      .number()
      .int(t("common.validation.positiveNumber"))
      .positive(t("common.validation.positiveNumber")),
  });
}

export type CreateSetFormValues = z.infer<ReturnType<typeof createSetSchema>>;
// Pre-coercion shape (numberOfKeys accepts the raw string a number input produces).
export type CreateSetFormInput = z.input<ReturnType<typeof createSetSchema>>;

// Compile-time guard — fails to compile if this schema's output drifts from the contract
// Command (e.g. a renamed/removed contract field).
type AssertAssignable<T extends true> = T;
type _CreateSetCommandCheck = AssertAssignable<
  CreateSetFormValues extends CreateSetCommand ? true : false
>;
