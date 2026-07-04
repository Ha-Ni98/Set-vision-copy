import { z } from "zod";
import type { LoginCommand } from "@my-app/contract";
import type { useTranslation } from "@/hooks/useTranslation";

// The contract's own LoginSchema is `z.string()` on both fields (no min-length) — this
// wrapper adds the translated "Please fill in all fields." validation the spec wants,
// same pattern as every other co-located schema in this codebase.
export function loginSchema(t: ReturnType<typeof useTranslation>["t"]) {
  return z.object({
    username: z.string().min(1, t("auth.login.emptyFields")),
    password: z.string().min(1, t("auth.login.emptyFields")),
  });
}

export type LoginFormValues = z.infer<ReturnType<typeof loginSchema>>;

// Compile-time guard — fails to compile if this schema's output drifts from the contract
// Command (e.g. a renamed/removed contract field).
type AssertAssignable<T extends true> = T;
type _LoginCommandCheck = AssertAssignable<LoginFormValues extends LoginCommand ? true : false>;
