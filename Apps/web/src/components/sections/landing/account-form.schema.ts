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

// Renamed from `phoneNumber` to `snapchatPhone` in Sprint 2 (matching the plan's own field
// naming), at the same time AccountForm.tsx itself got rewritten to consume these helpers —
// deferred from Sprint 1 specifically to land both changes together, not as a no-op rename.
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
      // Optional — left blank if the client never sets a distinct Snapchat email. If set,
      // validated as a real email; an empty string skips the check entirely (mirrors
      // snapchatPhone just below).
      email: z
        .string()
        .optional()
        .refine((v) => !v || z.string().email().safeParse(v).success, {
          message: t("common.validation.invalidEmail"),
        }),
      // Optional — left blank if the client never sets a distinct Snapchat phone (Stage-04-fix
      // #3.2: must NOT fall back to the personal `phone`, which previously leaked into the
      // activator's card as a false "Snapchat phone"). If set, validated as a real phone number;
      // an empty string skips the regex entirely rather than failing on required-but-blank.
      snapchatPhone: z
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
// rather than duplicated at each call site. `snapchatPhone` (optional) is sent as-is — an
// unset Snapchat phone must stay blank rather than silently reusing the personal `phone`
// (Stage-04-fix #3.2), since the activator's card can't otherwise tell "no Snap phone" apart
// from "Snap phone happens to equal the personal number".
export function toAccountFields(values: AccountFormValues): AccountField[] {
  return [
    { field: AccountInformation.USERNAME, value: values.username },
    { field: AccountInformation.EMAIL, value: values.email?.trim() ?? "" },
    { field: AccountInformation.PHONE_NUMBER, value: values.snapchatPhone?.trim() ?? "" },
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
