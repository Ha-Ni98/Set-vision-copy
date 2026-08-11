import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useSession } from "@/hooks/useSession";
import { ROLE_HOME } from "@/config/role-home";

// Router-level auth gates, declarative (<Navigate>) rather than the MVP's imperative
// useEffect+navigate() redirects. MVP behavior kept exactly — no return-to-target invention.

// Full-screen, not PageLoader's content-scoped min-h-[50vh] — no layout has mounted yet at
// this gate. Distinct from PageLoader's Suspense-only role (that component's own comment
// scopes it to route code-splitting, not data loading).
function AuthRestoring() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export function ProtectedRoute() {
  const { isAuthenticated, isReady } = useAuth();
  if (!isReady) return <AuthRestoring />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

// Reads useSession() directly rather than useAuth() — AuthCtx doesn't expose `role` (same
// reasoning as AdminGuard's identical comment); this is the one other place that needs it,
// to send an already-authenticated user to their own ROLE_HOME (activator-portal plan.md
// §B9/E-4 — the sibling fix to LoginPage's own post-login redirect below; Set 1 plan.md §5.3
// generalized this from a two-way admin/activator check to every role via ROLE_HOME).
export function PublicOnlyRoute() {
  const { isReady } = useAuth();
  const { data: session } = useSession();
  if (!isReady) return <AuthRestoring />;
  if (session) {
    return <Navigate to={ROLE_HOME[session.role]} replace />;
  }
  return <Outlet />;
}
