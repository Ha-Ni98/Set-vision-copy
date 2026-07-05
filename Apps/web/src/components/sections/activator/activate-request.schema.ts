import { z } from "zod";
import type { ActivateActivationCommand } from "@my-app/contract";
import type { useTranslation } from "@/hooks/useTranslation";

// Required, valid activation email (Stage-04-fix #2) — collected on the activator's own
// Activate action, mirroring freeze-request.schema.ts's pattern.
export function activateRequestSchema(t: ReturnType<typeof useTranslation>["t"]) {
  return z.object({
    activationEmail: z
      .string()
      .min(1, t("common.validation.required"))
      .email(t("common.validation.invalidEmail")),
  });
}

export type ActivateRequestFormValues = z.infer<ReturnType<typeof activateRequestSchema>>;

// Compile-time guard — fails to compile if this schema's output drifts from the contract
// Command (e.g. a renamed/removed contract field).
type AssertAssignable<T extends true> = T;
type _ActivateActivationCommandCheck = AssertAssignable<
  ActivateRequestFormValues extends ActivateActivationCommand ? true : false
>;
