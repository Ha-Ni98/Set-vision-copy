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

// Discriminator-keyed (unlike AccountFieldValueSchema's free-text fieldLabel) so the client
// form can match a submitted value back to its own field by enum, the same way flaggedFields/
// requestedFields already do — matching on a label string couldn't survive relabeling/i18n.
export const SubmittedFieldSchema = z.object({
  field: z.enum(AccountInformation),
  value: z.string(),
});
export type SubmittedField = z.infer<typeof SubmittedFieldSchema>;

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
  // Real, unmasked saved values (incl. password) — access is gated by the client's own key,
  // so the Step-2 form can prefill on re-check or a live status change (Stage-04-fix #4A)
  // instead of showing blank fields the client already filled in.
  submittedFields: z.array(SubmittedFieldSchema).optional(),
  clientFullName: z.string().nullable().optional(),
  clientPhone: z.string().nullable().optional(),
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
  // Stage-04-fix #2 — surfaced in the admin dashboard and activator "Global Recent" tables.
  activationEmail: z.string().nullable(),
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
  // Set 9 (D10): a snapshot of the plan's cost, stamped at completion. null only if the
  // activation predates completion logic entirely; otherwise defaults to 0.
  activationCost: z.number().nullable(),
  freezeReason: z.string().nullable(),
});
export type AdminActivationDTO = z.infer<typeof AdminActivationResponseSchema>;

export const CardChainSchema = z.object({
  key: z.string(),
  setNumber: z.string(),
  lotNumber: z.string().nullable(),
  subscriptionLabel: z.string(),
});
export type CardChain = z.infer<typeof CardChainSchema>;

export const ActivationTimingSchema = z.object({
  requestedAt: z.iso.datetime(),
  takenAt: z.iso.datetime().nullable(),
  completedAt: z.iso.datetime().nullable(),
  durationSeconds: z.number().int().nullable(),
});
export type ActivationTiming = z.infer<typeof ActivationTimingSchema>;

// PASSWORD and OTP values appear here in the clear, and that is deliberate — do not "fix" it.
// These are the client's own Snapchat credentials, which the client changes after activation;
// they are NOT system secrets. They already reach the public client (KeyVerificationDTO
// .submittedFields, key-gated) and the assigned activator (ActiveRequestDTO.accountFields)
// unmasked, so masking them here made the admin the least-privileged reader of data the client
// typed. Decision D3, v2-decisions.md §D3 + R3 — an explicit, informed override of the
// schema.prisma "activator-only exposure" comments. contract-rules.md §3.5/§6.5 still applies in
// full to User.password, RefreshToken.tokenHash and JWTs; none of those appear in any DTO.
export const ActivationDetailResponseSchema = z.object({
  id: z.uuid(),
  state: z.enum(ActivationStat),
  client: ClientBlockSchema,
  distributor: DistributorBlockSchema,
  activator: z.object({ id: z.uuid(), fullName: z.string() }).nullable(),
  card: CardChainSchema,
  timing: ActivationTimingSchema,
  activationEmail: z.string().nullable(),
  submittedInformation: z.array(AccountFieldValueSchema),
  timeline: z.array(TimelineEntrySchema),
  cardHistory: z.array(CardHistoryEntrySchema),
  financial: z.object({
    activationPrice: z.number().nullable(),
    activationCost: z.number().nullable(),
    commissionTierLabel: z.string().nullable(),
  }),
});
export type ActivationDetailDTO = z.infer<typeof ActivationDetailResponseSchema>;

// Paginated wrappers
export const PaginatedActivationsSchema = paginated(AdminActivationResponseSchema);
export type PaginatedActivations = z.infer<typeof PaginatedActivationsSchema>;

export const PaginatedActivatorHistorySchema = paginated(ActivatorHistoryItemResponseSchema);
export type PaginatedActivatorHistory = z.infer<typeof PaginatedActivatorHistorySchema>;

// Distributor-facing. Built field-by-field; NOT derived from AdminActivationResponseSchema, which
// carries activatorFullName and activationPrice — both forbidden here (Set 7: "No activator
// earnings, credits, or commission data"; the activator's identity is equally not the
// distributor's business).
//
// DELIBERATELY ABSENT, and none of these may be added later without revisiting Set 7's scope:
//   activatorFullName / activator{}   — activator identity
//   activationPrice / earning         — activator commission
//   activationEmail                   — the pool address the activation was completed with
//   submittedInformation / accountFields / otpValue / timeline[].wrongFields
//                                     — the client's Snapchat credentials. D3 opened these to the
//                                       ADMIN only; the distributor is not in that decision.
export const DistributorActivationResponseSchema = z.object({
  id: z.uuid(),
  subscriptionLabel: z.string(),
  // Same gate as the card list — see distributorVisibleKey(). An activation always implies the
  // card is in the lifecycle, so in practice this is full or 4-char-prefixed, never null; the
  // nullable type keeps the ONE policy honest instead of special-casing it here.
  key: z.string().nullable(),
  cardId: z.uuid(),
  cardStat: z.enum(CardStat),
  client: ClientBlockSchema,
  state: z.enum(ActivationStat),
  requestedAt: z.iso.datetime(),
  completedAt: z.iso.datetime().nullable(),
  durationSeconds: z.number().int().nullable(),
});
export type DistributorActivationDTO = z.infer<typeof DistributorActivationResponseSchema>;

// Detail adds only the card's own chain and the status history — no new sensitive surface.
export const DistributorActivationDetailResponseSchema = DistributorActivationResponseSchema.extend({
  lotNumber: z.string().nullable(),
  // Status transitions and their timestamps ONLY. NOT TimelineEntrySchema — that carries
  // wrongFields/additionalFields, i.e. the client's credential values.
  statusHistory: z.array(z.object({ stat: z.enum(ActivationStat), at: z.iso.datetime() })),
});
export type DistributorActivationDetailDTO = z.infer<typeof DistributorActivationDetailResponseSchema>;

export const PaginatedDistributorActivationsSchema = paginated(DistributorActivationResponseSchema);
export type PaginatedDistributorActivations = z.infer<typeof PaginatedDistributorActivationsSchema>;
