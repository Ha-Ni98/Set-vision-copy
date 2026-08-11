import { z } from "zod";
import type { UpdateAdminCommand } from "@my-app/contract";
import type { useTranslation } from "@/hooks/useTranslation";

const ALGERIAN_PHONE_PATTERN = /^(?:\+213|0)(5|6|7)\d{8}$/;

export function updateAdminSchema(t: ReturnType<typeof useTranslation>["t"]) {
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
      .regex(/^[A-Za-z0-9_]+$/, t("common.validation.invalidUsername"))
      .optional(),
    phone: z.string().regex(ALGERIAN_PHONE_PATTERN, t("common.validation.invalidPhone")).optional(),
    // Optional new password (Set 14): blank passes and is stripped to `undefined` so the
    // current password is left unchanged; a typed value must be ≥ 8 chars.
    password: z
      .string()
      .refine((v) => v.length === 0 || v.length >= 8, t("common.validation.minLength", { min: 8 }))
      .transform((v) => (v.length === 0 ? undefined : v))
      .optional(),
  });
}

export type UpdateAdminFormValues = z.infer<ReturnType<typeof updateAdminSchema>>;
// Pre-transform shape — what useForm's field-values generic needs (see update-activator.schema.ts).
export type UpdateAdminFormInput = z.input<ReturnType<typeof updateAdminSchema>>;

// Compile-time guard — fails to compile if this schema's output drifts from the contract
// Command (e.g. a renamed/removed contract field).
type AssertAssignable<T extends true> = T;
type _UpdateAdminCommandCheck = AssertAssignable<
  UpdateAdminFormValues extends UpdateAdminCommand ? true : false
>;
