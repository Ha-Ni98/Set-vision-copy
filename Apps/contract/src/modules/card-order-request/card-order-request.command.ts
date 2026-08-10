import { z } from 'zod';

export const CreateCardOrderRequestSchema = z.object({
  subscriptionPlanId: z.uuid(),
  nbOfCards: z.number().int().min(1).max(10_000),
  note: z.string().max(500).optional(),
});
export type CreateCardOrderRequestCommand = z.infer<typeof CreateCardOrderRequestSchema>;

export const ReviewCardOrderRequestSchema = z.object({
  adminNote: z.string().max(500).optional(),
});
export type ReviewCardOrderRequestCommand = z.infer<typeof ReviewCardOrderRequestSchema>;
