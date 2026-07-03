import { z } from "zod";
import type { RecordPaymentCommand } from "@my-app/contract";
import type { useTranslation } from "@/hooks/useTranslation";

// `activatorId` is injected by the caller (the row/detail page already has it) — the form
// itself only collects what the admin actually types (plan.md §D2.4).
export function recordPaymentSchema(t: ReturnType<typeof useTranslation>["t"]) {
  return z.object({
    amount: z.coerce
      .number()
      .positive(t("common.validation.positiveNumber"))
      .multipleOf(0.01, t("common.validation.invalidAmount")),
    date: z.string().optional(),
  });
}

export type RecordPaymentFormValues = z.infer<ReturnType<typeof recordPaymentSchema>>;
// Pre-coercion shape (amount accepts the raw string a number input produces) — see
// create-activator.schema.ts's CreateActivatorFormInput for why this exists.
export type RecordPaymentFormInput = z.input<ReturnType<typeof recordPaymentSchema>>;

// Compile-time guard — fails to compile if the form's output plus the injected
// `activatorId` drifts from the contract Command.
type AssertAssignable<T extends true> = T;
type _RecordPaymentCommandCheck = AssertAssignable<
  RecordPaymentFormValues & { activatorId: string } extends RecordPaymentCommand ? true : false
>;
