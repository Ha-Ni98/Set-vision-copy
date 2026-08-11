import { UserRole } from "@my-app/contract";
import { RoleGuard } from "@/components/layout/RoleGuard";

// Thin wrapper over RoleGuard — export name and file path unchanged so App.tsx and
// everything else keep working. RoleGuard now owns the loading/redirect logic (Set 1
// plan.md §5.3); a wrong-role session lands on its own ROLE_HOME instead of the hardcoded
// /dashboard this used to redirect to — the fix that lets a DISTRIBUTOR hitting /admin/...
// land on /portal instead of the activator dashboard.
export function AdminGuard() {
  return <RoleGuard allow={[UserRole.ADMIN]} />;
}
