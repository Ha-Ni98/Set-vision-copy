import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

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

export function PublicOnlyRoute() {
  const { isAuthenticated, isReady } = useAuth();
  if (!isReady) return <AuthRestoring />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
