import { UserRole } from "@my-app/contract";

// Typed as Record<UserRole, string>, so adding a fourth role later is a compile error
// until every consumer's landing page is decided — not a silent fallback to /dashboard.
export const ROLE_HOME: Record<UserRole, string> = {
  [UserRole.ADMIN]: "/admin",
  [UserRole.ACTIVATOR]: "/dashboard",
  [UserRole.DISTRIBUTOR]: "/portal",
};
