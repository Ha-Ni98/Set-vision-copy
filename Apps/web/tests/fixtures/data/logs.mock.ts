import {
  LogResponseSchema,
  PaginatedLogsSchema,
  LogActionType,
  type LogDTO,
  type PaginatedLogs,
} from "@my-app/contract";

export const mockLogPasswordChange: LogDTO = LogResponseSchema.parse({
  id: "92000000-0000-4000-8000-000000000001",
  actionType: LogActionType.CHANGE_USER_PASSWORD,
  actionDescription: "Changed password for user Karim Ferhat",
  userName: "admin",
  createdAt: "2026-06-15T09:00:00.000Z",
});

export const mockLogCardRevoked: LogDTO = LogResponseSchema.parse({
  id: "92000000-0000-4000-8000-000000000002",
  actionType: LogActionType.REVOKE_CARD,
  actionDescription: "Revoked card KKKK-LLLL-MMMM-NNNN",
  userName: "admin",
  createdAt: "2026-06-16T09:00:00.000Z",
});

export const mockPaginatedLogs: PaginatedLogs = PaginatedLogsSchema.parse({
  items: [mockLogPasswordChange, mockLogCardRevoked],
  meta: { page: 1, limit: 10, total: 2, totalPages: 1 },
});
