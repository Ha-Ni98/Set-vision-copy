import {
  PendingActivationResponseSchema,
  ActiveRequestResponseSchema,
  ActivatorHistoryItemResponseSchema,
  RecentActivationResponseSchema,
  AdminActivationResponseSchema,
  ActivationDetailResponseSchema,
  PaginatedActivationsSchema,
  PaginatedActivatorHistorySchema,
  ActivationStat,
  CardStat,
  type PendingActivationDTO,
  type ActiveRequestDTO,
  type ActivatorHistoryItemDTO,
  type RecentActivationDTO,
  type AdminActivationDTO,
  type ActivationDetailDTO,
  type PaginatedActivations,
  type PaginatedActivatorHistory,
} from "@my-app/contract";

export const mockPendingActivation: PendingActivationDTO = PendingActivationResponseSchema.parse({
  id: "a1000000-0000-4000-8000-000000000001",
  subscriptionLabel: "Snapchat+ — 1 Week",
  keyMasked: "XXXX-XXXX-1234",
  requestedAt: "2026-07-01T10:00:00.000Z",
});

export const mockActiveRequestNulls: ActiveRequestDTO = ActiveRequestResponseSchema.parse({
  id: "a2000000-0000-4000-8000-000000000001",
  subscriptionLabel: "Snapchat+ — 1 Month",
  key: "AAAA-BBBB-CCCC-DDDD",
  takenAt: "2026-07-01T10:05:00.000Z",
  state: ActivationStat.PROCESSING,
  distributor: {
    storeName: "Store Alger Centre",
    wilayaName: "Alger",
    communeName: "Sidi M'Hamed",
  },
  client: { fullName: "Yacine Boudiaf", phone: "0555123456" },
  accountFields: [{ fieldLabel: "Username", value: "yacineb" }],
  otpValue: null,
  freezeReason: null,
});

export const mockActiveRequestPopulated: ActiveRequestDTO = ActiveRequestResponseSchema.parse({
  id: "a2000000-0000-4000-8000-000000000002",
  subscriptionLabel: "Snapchat+ — 1 Month",
  key: "AAAA-BBBB-CCCC-EEEE",
  takenAt: "2026-07-01T10:05:00.000Z",
  state: ActivationStat.FREEZE,
  distributor: { storeName: "Store Oran", wilayaName: "Oran", communeName: "Oran" },
  client: { fullName: "Sami Kaddour", phone: "0666789012" },
  accountFields: [
    { fieldLabel: "Username", value: "samik" },
    { fieldLabel: "Email", value: "sami@example.com" },
  ],
  otpValue: "482913",
  freezeReason: "Client reported suspicious activity",
});

export const mockHistoryItemCompleted: ActivatorHistoryItemDTO =
  ActivatorHistoryItemResponseSchema.parse({
    id: "a3000000-0000-4000-8000-000000000001",
    subscriptionLabel: "Snapchat+ — 1 Month",
    key: "EEEE-FFFF-GGGG-HHHH",
    state: ActivationStat.ACTIVATED,
    requestedAt: "2026-06-30T09:00:00.000Z",
    takenAt: "2026-06-30T09:05:00.000Z",
    completedAt: "2026-06-30T09:12:00.000Z",
    durationSeconds: 420,
    earning: 150.5,
    client: { fullName: "Nadia Cherif", phone: "0777456789" },
  });

export const mockHistoryItemInProgress: ActivatorHistoryItemDTO =
  ActivatorHistoryItemResponseSchema.parse({
    id: "a3000000-0000-4000-8000-000000000002",
    subscriptionLabel: "Snapchat+ — 1 Week",
    key: "IIII-JJJJ-KKKK-LLLL",
    state: ActivationStat.PROCESSING,
    requestedAt: "2026-07-01T09:00:00.000Z",
    takenAt: "2026-07-01T09:05:00.000Z",
    completedAt: null,
    durationSeconds: null,
    earning: null,
    client: { fullName: "Rania Belaid", phone: "0555987654" },
  });

export const mockRecentActivation: RecentActivationDTO = RecentActivationResponseSchema.parse({
  id: "a4000000-0000-4000-8000-000000000001",
  subscriptionLabel: "Snapchat+ — 3 Month",
  keyMasked: "XXXX-XXXX-5678",
  completedAt: "2026-07-01T08:00:00.000Z",
  state: ActivationStat.ACTIVATED,
  activationEmail: "client@example.com",
});

export const mockAdminActivation: AdminActivationDTO = AdminActivationResponseSchema.parse({
  id: "a5000000-0000-4000-8000-000000000001",
  key: "MMMM-NNNN-OOOO-PPPP",
  subscriptionLabel: "Snapchat+ — 6 Month",
  activatorFullName: "Amine Belkacem",
  distributorStoreName: "Store Constantine",
  clientName: "Walid Amrani",
  clientPhone: "0666111222",
  state: ActivationStat.ACTIVATED,
  requestedAt: "2026-06-29T09:00:00.000Z",
  takenAt: "2026-06-29T09:05:00.000Z",
  completedAt: "2026-06-29T09:15:00.000Z",
  durationSeconds: 600,
  activationPrice: 200,
  freezeReason: null,
});

// Null `activator` variant — a request that's still pending assignment.
export const mockActivationDetail: ActivationDetailDTO = ActivationDetailResponseSchema.parse({
  id: "a6000000-0000-4000-8000-000000000001",
  client: { fullName: "Hakim Zerrouki", phone: "0555333444" },
  distributor: { storeName: "Store Annaba", wilayaName: "Annaba", communeName: "Annaba" },
  activator: null,
  submittedInformation: [{ fieldLabel: "Username", value: "hakimz" }],
  timeline: [
    {
      stat: ActivationStat.PENDING,
      createdAt: "2026-06-28T09:00:00.000Z",
      wrongFields: [],
      additionalFields: [],
      freezeReason: null,
    },
  ],
  cardHistory: [{ stat: CardStat.ACTIVATION_PROGRESS, at: "2026-06-28T09:05:00.000Z" }],
  financial: { activationPrice: null, commissionTierLabel: null },
});

export const mockPaginatedActivations: PaginatedActivations = PaginatedActivationsSchema.parse({
  items: [mockAdminActivation],
  meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
});

export const mockPaginatedActivationsEmpty: PaginatedActivations = PaginatedActivationsSchema.parse(
  {
    items: [],
    meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
  },
);

export const mockPaginatedHistory: PaginatedActivatorHistory =
  PaginatedActivatorHistorySchema.parse({
    items: [mockHistoryItemCompleted, mockHistoryItemInProgress],
    meta: { page: 1, limit: 10, total: 2, totalPages: 1 },
  });

export const mockPaginatedHistoryEmpty: PaginatedActivatorHistory =
  PaginatedActivatorHistorySchema.parse({
    items: [],
    meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
  });
