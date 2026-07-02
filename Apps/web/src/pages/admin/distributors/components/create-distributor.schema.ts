import { z } from "zod";
import type { CreateDistributorCommand } from "@my-app/contract";
import type { useTranslation } from "@/hooks/useTranslation";

const ALGERIAN_PHONE_PATTERN = /^(?:\+213|0)(5|6|7)\d{8}$/;

export function createDistributorSchema(t: ReturnType<typeof useTranslation>["t"]) {
  return z.object({
    fullName: z
      .string()
      .min(3, t("common.validation.minLength", { min: 3 }))
      .max(100, t("common.validation.maxLength", { max: 100 })),
    storeName: z
      .string()
      .min(2, t("common.validation.minLength", { min: 2 }))
      .max(100, t("common.validation.maxLength", { max: 100 })),
    phone: z.string().regex(ALGERIAN_PHONE_PATTERN, t("common.validation.invalidPhone")),
    // Selects send ids; a select's unset value is "" so this catches "nothing chosen" with
    // a selection-specific message rather than z.uuid()'s format-error wording.
    wilayaId: z.string().min(1, t("common.validation.selectRequired")),
    communeId: z.string().min(1, t("common.validation.selectRequired")),
  });
}

export type CreateDistributorFormValues = z.infer<ReturnType<typeof createDistributorSchema>>;

// Compile-time guard — fails to compile if this schema's output drifts from the contract
// Command (e.g. a renamed/removed contract field).
type AssertAssignable<T extends true> = T;
type _CreateDistributorCommandCheck = AssertAssignable<
  CreateDistributorFormValues extends CreateDistributorCommand ? true : false
>;
