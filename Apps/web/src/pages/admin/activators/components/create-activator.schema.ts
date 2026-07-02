import { z } from "zod";
import type { CreateActivatorCommand } from "@my-app/contract";
import type { useTranslation } from "@/hooks/useTranslation";

const USERNAME_PATTERN = /^[A-Za-z0-9_]+$/;
const ALGERIAN_PHONE_PATTERN = /^(?:\+213|0)(5|6|7)\d{8}$/;

export function createActivatorSchema(t: ReturnType<typeof useTranslation>["t"]) {
  return z.object({
    fullName: z
      .string()
      .min(3, t("common.validation.minLength", { min: 3 }))
      .max(100, t("common.validation.maxLength", { max: 100 })),
    username: z
      .string()
      .min(3, t("common.validation.minLength", { min: 3 }))
      .max(30, t("common.validation.maxLength", { max: 30 }))
      .regex(USERNAME_PATTERN, t("common.validation.invalidUsername")),
    phone: z.string().regex(ALGERIAN_PHONE_PATTERN, t("common.validation.invalidPhone")),
    initialCredits: z.coerce
      .number()
      .min(0, t("common.validation.nonNegativeNumber"))
      .optional()
      .default(0),
  });
}

export type CreateActivatorFormValues = z.infer<ReturnType<typeof createActivatorSchema>>;

// Compile-time guard — fails to compile if this schema's output drifts from the contract
// Command (e.g. a renamed/removed contract field).
type AssertAssignable<T extends true> = T;
type _CreateActivatorCommandCheck = AssertAssignable<
  CreateActivatorFormValues extends CreateActivatorCommand ? true : false
>;
