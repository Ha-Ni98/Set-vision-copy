import { z } from "zod";
import type { ReviewCardRevocationRequestCommand } from "@my-app/contract";
import type { useTranslation } from "@/hooks/useTranslation";

export function reviewRevocationRequestSchema(_t: ReturnType<typeof useTranslation>["t"]) {
  return z.object({
    adminNote: z.string().max(500).optional(),
  });
}

export type ReviewRevocationRequestFormValues = z.infer<
  ReturnType<typeof reviewRevocationRequestSchema>
>;

type AssertAssignable<T extends true> = T;
type _ReviewRevocationRequestCommandCheck = AssertAssignable<
  ReviewRevocationRequestFormValues extends ReviewCardRevocationRequestCommand ? true : false
>;
