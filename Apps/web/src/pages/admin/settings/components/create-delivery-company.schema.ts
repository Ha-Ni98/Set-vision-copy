import { z } from "zod";
import type { CreateDeliveryCompanyCommand } from "@my-app/contract";
import type { useTranslation } from "@/hooks/useTranslation";

export function createDeliveryCompanySchema(t: ReturnType<typeof useTranslation>["t"]) {
  return z.object({
    name: z
      .string()
      .min(2, t("common.validation.minLength", { min: 2 }))
      .max(100, t("common.validation.maxLength", { max: 100 })),
    registeredName: z
      .string()
      .min(2, t("common.validation.minLength", { min: 2 }))
      .max(150, t("common.validation.maxLength", { max: 150 })),
  });
}

export type CreateDeliveryCompanyFormValues = z.infer<
  ReturnType<typeof createDeliveryCompanySchema>
>;

// Compile-time guard — fails to compile if this schema's output drifts from the contract
// Command (e.g. a renamed/removed contract field).
type AssertAssignable<T extends true> = T;
type _CreateDeliveryCompanyCommandCheck = AssertAssignable<
  CreateDeliveryCompanyFormValues extends CreateDeliveryCompanyCommand ? true : false
>;
