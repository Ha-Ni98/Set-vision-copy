import { z } from "zod";
import type { UpdateCommissionCommand } from "@my-app/contract";
import type { useTranslation } from "@/hooks/useTranslation";

// `subscriptionPlanId`/`commissionDurationId` are injected by the caller (the cell already
// knows its row/column) — mirrors record-payment.schema.ts's activatorId injection.
export function commissionCellSchema(t: ReturnType<typeof useTranslation>["t"]) {
  return z.object({
    commission: z.coerce
      .number()
      .nonnegative(t("common.validation.nonNegativeNumber"))
      .multipleOf(0.01, t("common.validation.invalidAmount")),
  });
}

export type CommissionCellFormValues = z.infer<ReturnType<typeof commissionCellSchema>>;
// Pre-coercion shape (commission accepts the raw string a number input produces).
export type CommissionCellFormInput = z.input<ReturnType<typeof commissionCellSchema>>;

// Compile-time guard — fails to compile if the cell's output plus the injected ids drifts
// from the contract Command.
type AssertAssignable<T extends true> = T;
type _UpdateCommissionCommandCheck = AssertAssignable<
  CommissionCellFormValues & {
    subscriptionPlanId: string;
    commissionDurationId: string;
  } extends UpdateCommissionCommand
    ? true
    : false
>;
