import {
  ActivationTakenPayloadSchema,
  ActivationClientUpdatedPayloadSchema,
  ActivationFrozenPayloadSchema,
  ActivationResolvedPayloadSchema,
  ActivationStatusChangedPayloadSchema,
  ActivationStat,
  ClientActivationStatus,
  type ActivationTakenPayload,
  type ActivationClientUpdatedPayload,
  type ActivationFrozenPayload,
  type ActivationResolvedPayload,
  type ActivationStatusChangedPayload,
} from "@my-app/contract";
import { mockPendingActivation } from "./activations.mock";

// `activation:created`'s payload is a PendingActivationDTO — reuses the activations
// fixture rather than duplicating it (plan.md §4.1).
export const mockActivationCreatedPayload = mockPendingActivation;

export const mockActivationTakenPayload: ActivationTakenPayload =
  ActivationTakenPayloadSchema.parse({
    activationId: "b1000000-0000-4000-8000-000000000001",
    activatorId: "b2000000-0000-4000-8000-000000000001",
    timestamp: "2026-07-02T09:00:00.000Z",
  });

export const mockActivationClientUpdatedPayload: ActivationClientUpdatedPayload =
  ActivationClientUpdatedPayloadSchema.parse({
    activationId: "b1000000-0000-4000-8000-000000000002",
    activatorId: "b2000000-0000-4000-8000-000000000001",
    timestamp: "2026-07-02T09:05:00.000Z",
  });

export const mockActivationFrozenPayload: ActivationFrozenPayload =
  ActivationFrozenPayloadSchema.parse({
    activationId: "b1000000-0000-4000-8000-000000000003",
    timestamp: "2026-07-02T09:10:00.000Z",
  });

export const mockActivationResolvedPayload: ActivationResolvedPayload =
  ActivationResolvedPayloadSchema.parse({
    activationId: "b1000000-0000-4000-8000-000000000004",
    activatorId: "b2000000-0000-4000-8000-000000000001",
    outcome: ActivationStat.ACTIVATED_BY_ADMIN,
    timestamp: "2026-07-02T09:15:00.000Z",
  });

export const mockActivationStatusChangedPayload: ActivationStatusChangedPayload =
  ActivationStatusChangedPayloadSchema.parse({
    activationId: "b1000000-0000-4000-8000-000000000005",
    status: ClientActivationStatus.PROCESSING,
    timestamp: "2026-07-02T09:20:00.000Z",
  });
