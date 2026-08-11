import { z } from "zod";
import type { CreateCardRevocationRequestCommand } from "@my-app/contract";
import type { useTranslation } from "@/hooks/useTranslation";

export function submitRevocationRequestSchema(t: ReturnType<typeof useTranslation>["t"]) {
  return z.object({
    cardId: z.string().min(1, t("common.validation.selectRequired")),
    reason: z
      .string()
      .min(3, t("common.validation.minLength", { min: 3 }))
      .max(500, t("common.validation.maxLength", { max: 500 })),
  });
}

export type SubmitRevocationRequestFormValues = z.infer<
  ReturnType<typeof submitRevocationRequestSchema>
>;

type AssertAssignable<T extends true> = T;
type _SubmitRevocationRequestCommandCheck = AssertAssignable<
  SubmitRevocationRequestFormValues extends CreateCardRevocationRequestCommand ? true : false
>;
