import { z } from "zod";
import type { UpdateActivatorCommand } from "@my-app/contract";
import type { useTranslation } from "@/hooks/useTranslation";

const USERNAME_PATTERN = /^[A-Za-z0-9_]+$/;
const ALGERIAN_PHONE_PATTERN = /^(?:\+213|0)(5|6|7)\d{8}$/;

export function updateActivatorSchema(t: ReturnType<typeof useTranslation>["t"]) {
  return z.object({
    fullName: z
      .string()
      .min(3, t("common.validation.minLength", { min: 3 }))
      .max(100, t("common.validation.maxLength", { max: 100 }))
      .optional(),
    username: z
      .string()
      .min(3, t("common.validation.minLength", { min: 3 }))
      .max(30, t("common.validation.maxLength", { max: 30 }))
      .regex(USERNAME_PATTERN, t("common.validation.invalidUsername"))
      .optional(),
    phone: z.string().regex(ALGERIAN_PHONE_PATTERN, t("common.validation.invalidPhone")).optional(),
  });
}

export type UpdateActivatorFormValues = z.infer<ReturnType<typeof updateActivatorSchema>>;

// Compile-time guard — fails to compile if this schema's output drifts from the contract
// Command (e.g. a renamed/removed contract field).
type AssertAssignable<T extends true> = T;
type _UpdateActivatorCommandCheck = AssertAssignable<
  UpdateActivatorFormValues extends UpdateActivatorCommand ? true : false
>;
