import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { UserRole } from "@my-app/contract";
import { useSession } from "@/hooks/useSession";
import { ROLE_HOME } from "@/config/role-home";

// Full-screen, not PageLoader's content-scoped min-h-[50vh] — no layout has mounted yet at
// this gate (mirrors ProtectedRoute's AuthRestoring).
function RoleSessionResolving() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

interface Props {
  allow: UserRole[];
}

// Role-aware gate, nested inside <ProtectedRoute/> (authentication-only). A wrong-role
// session is valid but belongs elsewhere — it's sent to its own ROLE_HOME rather than
// /login (which would just bounce it back here via PublicOnlyRoute anyway).
export function RoleGuard({ allow }: Props) {
  const { data: session, isPending } = useSession();

  if (isPending) return <RoleSessionResolving />;
  if (!session) return <Navigate to="/login" replace />;
  if (!allow.includes(session.role)) return <Navigate to={ROLE_HOME[session.role]} replace />;

  return <Outlet />;
}
