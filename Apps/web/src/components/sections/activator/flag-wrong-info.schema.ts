import { z } from "zod";
import { AccountInformation, type FlagWrongInfoCommand } from "@my-app/contract";
import type { useTranslation } from "@/hooks/useTranslation";

// Checkbox-group selection, not an RHF text form — the translated message backs the
// nonempty-array guard so the WrongInfoModal can show "Select at least one field."
export function flagWrongInfoSchema(t: ReturnType<typeof useTranslation>["t"]) {
  return z.object({
    fields: z
      .array(z.enum(AccountInformation))
      .nonempty(t("activator.requests.card.selectAtLeastOne")),
  });
}

export type FlagWrongInfoFormValues = z.infer<ReturnType<typeof flagWrongInfoSchema>>;

// Compile-time guard — fails to compile if this schema's output drifts from the contract
// Command (e.g. a renamed/removed contract field).
type AssertAssignable<T extends true> = T;
type _FlagWrongInfoCommandCheck = AssertAssignable<
  FlagWrongInfoFormValues extends FlagWrongInfoCommand ? true : false
>;
