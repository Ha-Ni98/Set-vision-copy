import { z } from 'zod';
import type { PendingActivationDTO } from './activation.dtos';
import { ActivationStat, ClientActivationStatus } from './activation.enums';

export const ActivationTakenPayloadSchema = z.object({
  activationId: z.uuid(),
  activatorId: z.uuid(),
  timestamp: z.iso.datetime(),
});
export type ActivationTakenPayload = z.infer<typeof ActivationTakenPayloadSchema>;

export const ActivationClientUpdatedPayloadSchema = z.object({
  activationId: z.uuid(),
  activatorId: z.uuid(),
  timestamp: z.iso.datetime(),
});
export type ActivationClientUpdatedPayload = z.infer<typeof ActivationClientUpdatedPayloadSchema>;

export const ActivationFrozenPayloadSchema = z.object({
  activationId: z.uuid(),
  timestamp: z.iso.datetime(),
});
export type ActivationFrozenPayload = z.infer<typeof ActivationFrozenPayloadSchema>;

// outcome is constrained to the two admin-resolution values only
export const ActivationResolvedPayloadSchema = z.object({
  activationId: z.uuid(),
  activatorId: z.uuid(),
  outcome: z.enum([ActivationStat.ACTIVATED_BY_ADMIN, ActivationStat.CANCELLED_BY_ADMIN]),
  timestamp: z.iso.datetime(),
});
export type ActivationResolvedPayload = z.infer<typeof ActivationResolvedPayloadSchema>;

export const ActivationStatusChangedPayloadSchema = z.object({
  activationId: z.uuid(),
  status: z.enum(ClientActivationStatus),
  timestamp: z.iso.datetime(),
});
export type ActivationStatusChangedPayload = z.infer<typeof ActivationStatusChangedPayloadSchema>;

export type ActivationEvents = {
  'activation:created': PendingActivationDTO;
  'activation:taken': ActivationTakenPayload;
  'activation:client-updated': ActivationClientUpdatedPayload;
  'activation:frozen': ActivationFrozenPayload;
  'activation:resolved': ActivationResolvedPayload;
  'activation:status-changed': ActivationStatusChangedPayload;
};
