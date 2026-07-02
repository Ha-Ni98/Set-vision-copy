import { z } from "zod";
import type { useTranslation } from "@/hooks/useTranslation";

export function createAccountFormSchema(t: ReturnType<typeof useTranslation>["t"]) {
  const required = t("common.validation.required");
  return z
    .object({
      fullName: z.string().min(1, required),
      phone: z.string().min(1, required),
      username: z.string().min(1, required),
      email: z.string().min(1, required).email(t("common.validation.invalidEmail")),
      phoneNumber: z.string().optional(),
      password: z.string().min(1, required),
      confirmPassword: z.string().min(1, required),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("public.landing.form.passwordMismatch"),
      path: ["confirmPassword"],
    });
}

export type AccountFormValues = z.infer<ReturnType<typeof createAccountFormSchema>>;
