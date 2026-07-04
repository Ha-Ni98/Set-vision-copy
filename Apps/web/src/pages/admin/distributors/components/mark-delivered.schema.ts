import { z } from "zod";
import { OrderStat, type TransitionOrderCommand } from "@my-app/contract";
import type { useTranslation } from "@/hooks/useTranslation";

// `to: DELIVERED` is injected by the caller (the row already knows it's transitioning to
// DELIVERED) — the form itself only collects deliveredCount (mirrors record-payment.schema.ts's
// activatorId injection). `maxCount` is the order's cardsCount, known only at render time.
export function markDeliveredSchema(t: ReturnType<typeof useTranslation>["t"], maxCount: number) {
  return z.object({
    deliveredCount: z.coerce
      .number()
      .int(t("common.validation.nonNegativeNumber"))
      .nonnegative(t("common.validation.nonNegativeNumber"))
      .max(maxCount, t("common.validation.maxValue", { max: maxCount })),
  });
}

export type MarkDeliveredFormValues = z.infer<ReturnType<typeof markDeliveredSchema>>;
// Pre-coercion shape (deliveredCount accepts the raw string a number input produces).
export type MarkDeliveredFormInput = z.input<ReturnType<typeof markDeliveredSchema>>;

// Compile-time guard — fails to compile if the form's output plus the injected `to` drifts
// from the contract Command.
type AssertAssignable<T extends true> = T;
type _MarkDeliveredCommandCheck = AssertAssignable<
  MarkDeliveredFormValues & { to: OrderStat.DELIVERED } extends TransitionOrderCommand
    ? true
    : false
>;
