import { z } from "zod";
import type { CreateLotCommand } from "@my-app/contract";
import type { useTranslation } from "@/hooks/useTranslation";

export function createLotSchema(t: ReturnType<typeof useTranslation>["t"]) {
  return z.object({
    subscriptionPlanId: z.string().min(1, t("common.validation.selectRequired")),
    cardIds: z.array(z.string().min(1)).nonempty(t("common.validation.selectAtLeastOne")),
  });
}

export type CreateLotFormValues = z.infer<ReturnType<typeof createLotSchema>>;

// Compile-time guard — fails to compile if this schema's output drifts from the contract
// Command (e.g. a renamed/removed contract field).
type AssertAssignable<T extends true> = T;
type _CreateLotCommandCheck = AssertAssignable<
  CreateLotFormValues extends CreateLotCommand ? true : false
>;
