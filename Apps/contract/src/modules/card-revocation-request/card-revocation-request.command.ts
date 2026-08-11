import { z } from 'zod';

export const CreateCardRevocationRequestSchema = z.object({
  cardId: z.uuid(),
  reason: z.string().min(3).max(500),
});
export type CreateCardRevocationRequestCommand = z.infer<typeof CreateCardRevocationRequestSchema>;

export const ReviewCardRevocationRequestSchema = z.object({
  adminNote: z.string().max(500).optional(),
});
export type ReviewCardRevocationRequestCommand = z.infer<typeof ReviewCardRevocationRequestSchema>;
