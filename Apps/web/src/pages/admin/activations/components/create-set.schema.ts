import { z } from "zod";
import { CARD_KEY_PATTERN, MAX_KEYS_PER_SET, type CreateSetCommand } from "@my-app/contract";
import type { useTranslation } from "@/hooks/useTranslation";

// A set is created from an explicit, admin-editable list of keys (Stage-04-fix). Same shape
// and rules as the contract's CreateSetSchema — format, at-least-one, cap, and no duplicates.
export function createSetSchema(t: ReturnType<typeof useTranslation>["t"]) {
  return z.object({
    subscriptionPlanId: z.string().min(1, t("common.validation.selectRequired")),
    keys: z
      .array(z.string().regex(CARD_KEY_PATTERN, t("admin.setsLots.sets.create.invalidKey")))
      .min(1, t("admin.setsLots.sets.create.noKeys"))
      .max(MAX_KEYS_PER_SET, t("admin.setsLots.sets.create.tooManyKeys", { max: MAX_KEYS_PER_SET }))
      .refine(
        (keys) => new Set(keys).size === keys.length,
        t("admin.setsLots.sets.create.duplicateKeys"),
      ),
  });
}

export type CreateSetFormValues = z.infer<ReturnType<typeof createSetSchema>>;

// Compile-time guard — fails to compile if this schema's output drifts from the contract
// Command (e.g. a renamed/removed contract field).
type AssertAssignable<T extends true> = T;
type _CreateSetCommandCheck = AssertAssignable<
  CreateSetFormValues extends CreateSetCommand ? true : false
>;
