import {
  AdminResponseSchema,
  AdminWithCredentialsResponseSchema,
  AdminGeneratedPasswordResponseSchema,
  PaginatedAdminsSchema,
  type AdminDTO,
  type AdminWithCredentialsDTO,
  type AdminGeneratedPasswordDTO,
  type PaginatedAdmins,
} from "@my-app/contract";

export const mockAdmin: AdminDTO = AdminResponseSchema.parse({
  id: "d1000000-0000-4000-8000-000000000001",
  userId: "d2000000-0000-4000-8000-000000000001",
  fullName: "Sara Haddad",
  username: "sara.h",
  phone: "0666333444",
  isEnabled: true,
  lastLoginAt: "2026-07-01T07:30:00.000Z",
  createdAt: "2025-11-01T09:00:00.000Z",
});

export const mockAdminNeverLoggedIn: AdminDTO = AdminResponseSchema.parse({
  ...mockAdmin,
  id: "d1000000-0000-4000-8000-000000000002",
  lastLoginAt: null,
});

export const mockAdminWithCredentials: AdminWithCredentialsDTO =
  AdminWithCredentialsResponseSchema.parse({
    admin: mockAdmin,
    generatedPassword: "Tmp-3kq8Wp1z",
  });

export const mockAdminGeneratedPassword: AdminGeneratedPasswordDTO =
  AdminGeneratedPasswordResponseSchema.parse({
    generatedPassword: "Tmp-6rp4Ez9j",
  });

export const mockPaginatedAdmins: PaginatedAdmins = PaginatedAdminsSchema.parse({
  items: [mockAdmin, mockAdminNeverLoggedIn],
  meta: { page: 1, limit: 10, total: 2, totalPages: 1 },
});
