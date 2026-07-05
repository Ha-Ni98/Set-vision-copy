import { z } from "zod";
import type { UpdateDeliveryCompanyCommand } from "@my-app/contract";
import type { useTranslation } from "@/hooks/useTranslation";

export function updateDeliveryCompanySchema(t: ReturnType<typeof useTranslation>["t"]) {
  return z.object({
    name: z
      .string()
      .min(2, t("common.validation.minLength", { min: 2 }))
      .max(100, t("common.validation.maxLength", { max: 100 }))
      .optional(),
    registeredName: z
      .string()
      .min(2, t("common.validation.minLength", { min: 2 }))
      .max(150, t("common.validation.maxLength", { max: 150 }))
      .optional(),
  });
}

export type UpdateDeliveryCompanyFormValues = z.infer<
  ReturnType<typeof updateDeliveryCompanySchema>
>;

// Compile-time guard — fails to compile if this schema's output drifts from the contract
// Command (e.g. a renamed/removed contract field).
type AssertAssignable<T extends true> = T;
type _UpdateDeliveryCompanyCommandCheck = AssertAssignable<
  UpdateDeliveryCompanyFormValues extends UpdateDeliveryCompanyCommand ? true : false
>;
