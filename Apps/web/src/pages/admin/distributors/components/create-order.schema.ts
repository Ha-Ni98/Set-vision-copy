import { z } from "zod";
import { DeliveryType, type CreateOrderCommand } from "@my-app/contract";
import type { useTranslation } from "@/hooks/useTranslation";

const ALGERIAN_PHONE_PATTERN = /^(?:\+213|0)(5|6|7)\d{8}$/;

// One schema for the whole wizard — steps validate slices of it via form.trigger([...fields])
// rather than each owning a separate schema (plan.md §A5).
export function createOrderSchema(t: ReturnType<typeof useTranslation>["t"]) {
  return z.object({
    distributorId: z.string().min(1, t("common.validation.selectRequired")),
    lotIds: z.array(z.string().min(1)).nonempty(t("common.validation.selectAtLeastOne")),
    receivedName: z
      .string()
      .min(3, t("common.validation.minLength", { min: 3 }))
      .max(100, t("common.validation.maxLength", { max: 100 })),
    receivedPhone: z.string().regex(ALGERIAN_PHONE_PATTERN, t("common.validation.invalidPhone")),
    wilayaId: z.string().min(1, t("common.validation.selectRequired")),
    communeId: z.string().min(1, t("common.validation.selectRequired")),
    deliveryCompanyId: z.string().min(1, t("common.validation.selectRequired")),
    deliveryType: z.enum(DeliveryType, t("common.validation.selectRequired")),
    orderPrice: z.coerce
      .number()
      .positive(t("common.validation.positiveNumber"))
      .multipleOf(0.01, t("common.validation.invalidAmount")),
    deliverPrice: z.coerce
      .number()
      .nonnegative(t("common.validation.nonNegativeNumber"))
      .multipleOf(0.01, t("common.validation.invalidAmount")),
    // D5: the optional selector over approved, unlinked CardOrderRequest rows. `undefined`,
    // never `""` — an empty string would fail the contract's z.uuid() server-side.
    orderRequestId: z.string().optional(),
  });
}

export type CreateOrderFormValues = z.infer<ReturnType<typeof createOrderSchema>>;
// Pre-coercion shape (orderPrice/deliverPrice accept the raw string a number input produces).
export type CreateOrderFormInput = z.input<ReturnType<typeof createOrderSchema>>;

// Compile-time guard — fails to compile if this schema's output drifts from the contract
// Command (e.g. a renamed/removed contract field).
type AssertAssignable<T extends true> = T;
type _CreateOrderCommandCheck = AssertAssignable<
  CreateOrderFormValues extends CreateOrderCommand ? true : false
>;
