import { z } from "zod";
import type { UpdateDistributorCommand } from "@my-app/contract";
import type { useTranslation } from "@/hooks/useTranslation";

const ALGERIAN_PHONE_PATTERN = /^(?:\+213|0)(5|6|7)\d{8}$/;

export function updateDistributorSchema(t: ReturnType<typeof useTranslation>["t"]) {
  return z.object({
    fullName: z
      .string()
      .min(3, t("common.validation.minLength", { min: 3 }))
      .max(100, t("common.validation.maxLength", { max: 100 }))
      .optional(),
    storeName: z
      .string()
      .min(2, t("common.validation.minLength", { min: 2 }))
      .max(100, t("common.validation.maxLength", { max: 100 }))
      .optional(),
    phone: z.string().regex(ALGERIAN_PHONE_PATTERN, t("common.validation.invalidPhone")).optional(),
    wilayaId: z.string().min(1, t("common.validation.selectRequired")).optional(),
    communeId: z.string().min(1, t("common.validation.selectRequired")).optional(),
  });
}

export type UpdateDistributorFormValues = z.infer<ReturnType<typeof updateDistributorSchema>>;

// Compile-time guard — fails to compile if this schema's output drifts from the contract
// Command (e.g. a renamed/removed contract field).
type AssertAssignable<T extends true> = T;
type _UpdateDistributorCommandCheck = AssertAssignable<
  UpdateDistributorFormValues extends UpdateDistributorCommand ? true : false
>;
