import { z } from "zod";
import type { FreezeRequestCommand } from "@my-app/contract";
import type { useTranslation } from "@/hooks/useTranslation";

export function freezeRequestSchema(t: ReturnType<typeof useTranslation>["t"]) {
  return z.object({
    reason: z.string().min(1, t("common.validation.required")),
  });
}

export type FreezeRequestFormValues = z.infer<ReturnType<typeof freezeRequestSchema>>;

// Compile-time guard — fails to compile if this schema's output drifts from the contract
// Command (e.g. a renamed/removed contract field).
type AssertAssignable<T extends true> = T;
type _FreezeRequestCommandCheck = AssertAssignable<
  FreezeRequestFormValues extends FreezeRequestCommand ? true : false
>;
