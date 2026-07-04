import { z } from "zod";
import {
  AccountInformation,
  type AccountField,
  type SubmitActivationCommand,
  type UpdateActivationCommand,
} from "@my-app/contract";
import type { useTranslation } from "@/hooks/useTranslation";

// Spec §Step 2 (client-portal plan.md §B4): 3–100 chars, letters/spaces/hyphens only —
// \p{L} covers accented/non-Latin letters (not just A-Z), matching a real Algerian name.
const FULL_NAME_PATTERN = /^[\p{L}\s-]+$/u;
// Same pattern as every other Algerian-phone field in this codebase (co-located per file,
// not shared — e.g. pages/admin/activators/components/create-activator.schema.ts).
const ALGERIAN_PHONE_PATTERN = /^(?:\+213|0)(5|6|7)\d{8}$/;

// `phoneNumber` keeps its current name here — Sprint 2/3 renames it to `snapchatPhone`
// (matching the plan's own field naming) at the same time AccountForm.tsx itself gets
// rewritten into its 5 status variants; renaming it now with no consumer changes yet would
// be a no-op field-name churn with no behavioral difference this sprint.
export function createAccountFormSchema(t: ReturnType<typeof useTranslation>["t"]) {
  const required = t("common.validation.required");
  return z
    .object({
      fullName: z
        .string()
        .min(3, t("common.validation.minLength", { min: 3 }))
        .max(100, t("common.validation.maxLength", { max: 100 }))
        .regex(FULL_NAME_PATTERN, t("common.validation.invalidName")),
      phone: z.string().regex(ALGERIAN_PHONE_PATTERN, t("common.validation.invalidPhone")),
      username: z.string().min(1, required),
      email: z.string().min(1, required).email(t("common.validation.invalidEmail")),
      // Optional, but if set it's validated as a real phone number (spec: "defaults to the
      // personal phone; if set, valid format") — an empty string skips the regex entirely
      // rather than failing on required-but-blank.
      phoneNumber: z
        .string()
        .optional()
        .refine((v) => !v || ALGERIAN_PHONE_PATTERN.test(v), {
          message: t("common.validation.invalidPhone"),
        }),
      password: z.string().min(6, t("common.validation.minLength", { min: 6 })),
      confirmPassword: z.string().min(1, required),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("public.landing.form.passwordMismatch"),
      path: ["confirmPassword"],
    });
}

export type AccountFormValues = z.infer<ReturnType<typeof createAccountFormSchema>>;

// Snapchat's collected fields → `Activation information` rows (contract's per-field
// storage) — the one mapping every write (submit/update) needs, so it's built once here
// rather than duplicated at each call site. `phoneNumber` (optional) defaults to the
// Group-A `phone` when left blank — the account's phone_number field is never omitted, per
// spec ("defaults to the personal phone"), unlike the current AccountForm.tsx inline mapping
// which drops the field entirely when blank (fixed here; AccountForm.tsx switches to this
// helper when Sprint 3 rewires its submit handler).
export function toAccountFields(values: AccountFormValues): AccountField[] {
  return [
    { field: AccountInformation.USERNAME, value: values.username },
    { field: AccountInformation.EMAIL, value: values.email },
    { field: AccountInformation.PHONE_NUMBER, value: values.phoneNumber || values.phone },
    { field: AccountInformation.PASSWORD, value: values.password },
  ];
}

export function toSubmitCommand(key: string, values: AccountFormValues): SubmitActivationCommand {
  return {
    key,
    fullName: values.fullName,
    phone: values.phone,
    accountFields: toAccountFields(values),
  };
}

export function toUpdateCommand(values: AccountFormValues): UpdateActivationCommand {
  return { accountFields: toAccountFields(values) };
}

// Compile-time guards — fail to compile if either mapping drifts from its contract Command.
type AssertAssignable<T extends true> = T;
type _SubmitCheck = AssertAssignable<
  ReturnType<typeof toSubmitCommand> extends SubmitActivationCommand ? true : false
>;
type _UpdateCheck = AssertAssignable<
  ReturnType<typeof toUpdateCommand> extends UpdateActivationCommand ? true : false
>;
