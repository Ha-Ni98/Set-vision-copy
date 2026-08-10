import { z } from 'zod';
import { RevocationRequestStat } from './card-revocation-request.enums';

export const RevocationRequestCreatedPayloadSchema = z.object({
  requestId: z.uuid(),
  distributorId: z.uuid(), // Distributor.id — the room key, not User.id
  distributorName: z.string(),
  cardId: z.uuid(),
  cardKey: z.string(),
  subscriptionLabel: z.string(),
  reason: z.string(),
  timestamp: z.iso.datetime(),
});
export type RevocationRequestCreatedPayload = z.infer<typeof RevocationRequestCreatedPayloadSchema>;

export const RevocationRequestStatusChangedPayloadSchema = z.object({
  requestId: z.uuid(),
  distributorId: z.uuid(),
  cardId: z.uuid(),
  cardKey: z.string(),
  stat: z.enum(RevocationRequestStat),
  previousStat: z.enum(RevocationRequestStat),
  adminNote: z.string().nullable(),
  timestamp: z.iso.datetime(),
});
export type RevocationRequestStatusChangedPayload = z.infer<
  typeof RevocationRequestStatusChangedPayloadSchema
>;

export type CardRevocationRequestEvents = {
  'revocation-request:created': RevocationRequestCreatedPayload;
  'revocation-request:status-changed': RevocationRequestStatusChangedPayload;
};
