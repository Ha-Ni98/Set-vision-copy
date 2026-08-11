import { z } from "zod";
import type { ReviewCardOrderRequestCommand } from "@my-app/contract";
import type { useTranslation } from "@/hooks/useTranslation";

export function reviewOrderRequestSchema(_t: ReturnType<typeof useTranslation>["t"]) {
  return z.object({
    adminNote: z.string().max(500).optional(),
  });
}

export type ReviewOrderRequestFormValues = z.infer<ReturnType<typeof reviewOrderRequestSchema>>;

type AssertAssignable<T extends true> = T;
type _ReviewOrderRequestCommandCheck = AssertAssignable<
  ReviewOrderRequestFormValues extends ReviewCardOrderRequestCommand ? true : false
>;
