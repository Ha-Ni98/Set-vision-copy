import { z } from "zod";
import type { CreateCardOrderRequestCommand } from "@my-app/contract";
import type { useTranslation } from "@/hooks/useTranslation";

export function submitOrderRequestSchema(t: ReturnType<typeof useTranslation>["t"]) {
  return z.object({
    subscriptionPlanId: z.string().min(1, t("common.validation.selectRequired")),
    nbOfCards: z.coerce
      .number()
      .int(t("common.validation.invalidAmount"))
      .min(1, t("distributor.orderRequests.form.quantityRange"))
      .max(10_000, t("distributor.orderRequests.form.quantityRange")),
    note: z.string().max(500).optional(),
  });
}

export type SubmitOrderRequestFormValues = z.infer<ReturnType<typeof submitOrderRequestSchema>>;
// Pre-coercion shape (nbOfCards accepts the raw string a number input produces).
export type SubmitOrderRequestFormInput = z.input<ReturnType<typeof submitOrderRequestSchema>>;

// Compile-time guard — fails to compile if this schema's output drifts from the contract
// Command.
type AssertAssignable<T extends true> = T;
type _SubmitOrderRequestCommandCheck = AssertAssignable<
  SubmitOrderRequestFormValues extends CreateCardOrderRequestCommand ? true : false
>;
