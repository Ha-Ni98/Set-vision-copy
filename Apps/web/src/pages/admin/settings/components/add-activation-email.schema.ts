import { z } from "zod";
import type { CreateActivationEmailCommand } from "@my-app/contract";
import type { useTranslation } from "@/hooks/useTranslation";

export function addActivationEmailSchema(t: ReturnType<typeof useTranslation>["t"]) {
  return z.object({
    subscriptionPlanId: z.string().min(1, t("common.validation.required")),
    email: z
      .string()
      .min(1, t("common.validation.required"))
      .email(t("common.validation.invalidEmail")),
  });
}

export type AddActivationEmailFormValues = z.infer<ReturnType<typeof addActivationEmailSchema>>;

// Compile-time guard — fails to compile if this schema's output drifts from the contract
// Command (e.g. a renamed/removed contract field).
type AssertAssignable<T extends true> = T;
type _CreateActivationEmailCommandCheck = AssertAssignable<
  AddActivationEmailFormValues extends CreateActivationEmailCommand ? true : false
>;
