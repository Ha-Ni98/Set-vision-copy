import { z } from "zod";
import type { CreateDistributorAccountCommand } from "@my-app/contract";
import type { useTranslation } from "@/hooks/useTranslation";

const USERNAME_PATTERN = /^[A-Za-z0-9_]+$/;

export function createDistributorAccountSchema(t: ReturnType<typeof useTranslation>["t"]) {
  return z.object({
    username: z
      .string()
      .min(3, t("common.validation.minLength", { min: 3 }))
      .max(30, t("common.validation.maxLength", { max: 30 }))
      .regex(USERNAME_PATTERN, t("common.validation.invalidUsername")),
    // Optional admin-chosen password: blank passes and is stripped to `undefined` so the
    // server auto-generates; a typed value must be ≥ 8 chars.
    password: z
      .string()
      .refine((v) => v.length === 0 || v.length >= 8, t("common.validation.minLength", { min: 8 }))
      .transform((v) => (v.length === 0 ? undefined : v))
      .optional(),
  });
}

export type CreateDistributorAccountFormValues = z.infer<
  ReturnType<typeof createDistributorAccountSchema>
>;
// Pre-coercion shape — mirrors create-activator.schema.ts's identical split between the
// form's input type and useForm's resolved output type.
export type CreateDistributorAccountFormInput = z.input<
  ReturnType<typeof createDistributorAccountSchema>
>;

// Compile-time guard — fails to compile if this schema's output drifts from the contract
// Command (e.g. a renamed/removed contract field).
type AssertAssignable<T extends true> = T;
type _CreateDistributorAccountCommandCheck = AssertAssignable<
  CreateDistributorAccountFormValues extends CreateDistributorAccountCommand ? true : false
>;
