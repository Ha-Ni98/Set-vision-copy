import { z } from 'zod';
import { paginated } from '../../common/types';
import { CardStat } from '../card/card.enums';
import { AccountInformation, ActivationStat, ClientActivationStatus } from './activation.enums';

// Helper subshapes
export const ClientBlockSchema = z.object({
  fullName: z.string(),
  phone: z.string(),
});
export type ClientBlock = z.infer<typeof ClientBlockSchema>;

export const DistributorBlockSchema = z.object({
  storeName: z.string(),
  wilayaName: z.string(),
  communeName: z.string(),
});
export type DistributorBlock = z.infer<typeof DistributorBlockSchema>;

export const AccountFieldValueSchema = z.object({
  fieldLabel: z.string(),
  value: z.string(),
});
export type AccountFieldValue = z.infer<typeof AccountFieldValueSchema>;

export const TimelineEntrySchema = z.object({
  stat: z.enum(ActivationStat),
  createdAt: z.iso.datetime(),
  wrongFields: z.array(AccountFieldValueSchema),
  additionalFields: z.array(AccountFieldValueSchema),
  freezeReason: z.string().nullable(),
});
export type TimelineEntry = z.infer<typeof TimelineEntrySchema>;

export const CardHistoryEntrySchema = z.object({
  stat: z.enum(CardStat),
  at: z.iso.datetime(),
});
export type CardHistoryEntry = z.infer<typeof CardHistoryEntrySchema>;

// Client-facing DTOs
export const KeyVerificationResponseSchema = z.object({
  status: z.enum(ClientActivationStatus),
  subscriptionLabel: z.string().optional(),
  planKey: z.string().optional(),
  activationId: z.uuid().optional(),
  submittedFields: z.array(AccountFieldValueSchema).optional(),
  flaggedFields: z
    .array(z.object({ field: z.enum(AccountInformation), label: z.string() }))
    .optional(),
  requestedFields: z
    .array(z.object({ field: z.enum(AccountInformation), label: z.string() }))
    .optional(),
  accountUsername: z.string().optional(),
});
export type KeyVerificationDTO = z.infer<typeof KeyVerificationResponseSchema>;

export const ClientActivationStatusResponseSchema = z.object({
  activationId: z.uuid(),
  status: z.enum(ClientActivationStatus),
});
export type ClientActivationStatusDTO = z.infer<typeof ClientActivationStatusResponseSchema>;

// Activator-facing DTOs
export const PendingActivationResponseSchema = z.object({
  id: z.uuid(),
  subscriptionLabel: z.string(),
  keyMasked: z.string(),
  requestedAt: z.iso.datetime(),
});
export type PendingActivationDTO = z.infer<typeof PendingActivationResponseSchema>;

// Sanctioned §0.1.2 exception: assigned activator receives raw key + account field values
export const ActiveRequestResponseSchema = z.object({
  id: z.uuid(),
  subscriptionLabel: z.string(),
  key: z.string(),
  takenAt: z.iso.datetime(),
  state: z.enum(ActivationStat),
  distributor: DistributorBlockSchema,
  client: ClientBlockSchema,
  accountFields: z.array(AccountFieldValueSchema),
  otpValue: z.string().nullable(),
  freezeReason: z.string().nullable(),
});
export type ActiveRequestDTO = z.infer<typeof ActiveRequestResponseSchema>;

export const ActivatorHistoryItemResponseSchema = z.object({
  id: z.uuid(),
  subscriptionLabel: z.string(),
  key: z.string(),
  state: z.enum(ActivationStat),
  requestedAt: z.iso.datetime(),
  takenAt: z.iso.datetime().nullable(),
  completedAt: z.iso.datetime().nullable(),
  durationSeconds: z.number().int().nullable(),
  earning: z.number().nullable(),
  client: ClientBlockSchema,
});
export type ActivatorHistoryItemDTO = z.infer<typeof ActivatorHistoryItemResponseSchema>;

export const RecentActivationResponseSchema = z.object({
  id: z.uuid(),
  subscriptionLabel: z.string(),
  keyMasked: z.string(),
  completedAt: z.iso.datetime(),
  state: z.enum(ActivationStat),
});
export type RecentActivationDTO = z.infer<typeof RecentActivationResponseSchema>;

// Admin-facing DTOs
export const AdminActivationResponseSchema = z.object({
  id: z.uuid(),
  key: z.string(),
  subscriptionLabel: z.string(),
  activatorFullName: z.string().nullable(),
  distributorStoreName: z.string(),
  clientName: z.string(),
  clientPhone: z.string(),
  state: z.enum(ActivationStat),
  requestedAt: z.iso.datetime(),
  takenAt: z.iso.datetime().nullable(),
  completedAt: z.iso.datetime().nullable(),
  durationSeconds: z.number().int().nullable(),
  activationPrice: z.number().nullable(),
  freezeReason: z.string().nullable(),
});
export type AdminActivationDTO = z.infer<typeof AdminActivationResponseSchema>;

export const ActivationDetailResponseSchema = z.object({
  id: z.uuid(),
  client: ClientBlockSchema,
  distributor: DistributorBlockSchema,
  activator: z.object({ id: z.uuid(), fullName: z.string() }).nullable(),
  submittedInformation: z.array(AccountFieldValueSchema),
  timeline: z.array(TimelineEntrySchema),
  cardHistory: z.array(CardHistoryEntrySchema),
  financial: z.object({
    activationPrice: z.number().nullable(),
    commissionTierLabel: z.string().nullable(),
  }),
});
export type ActivationDetailDTO = z.infer<typeof ActivationDetailResponseSchema>;

// Paginated wrappers
export const PaginatedActivationsSchema = paginated(AdminActivationResponseSchema);
export type PaginatedActivations = z.infer<typeof PaginatedActivationsSchema>;

export const PaginatedActivatorHistorySchema = paginated(ActivatorHistoryItemResponseSchema);
export type PaginatedActivatorHistory = z.infer<typeof PaginatedActivatorHistorySchema>;
