import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { UserRole } from "@my-app/contract";
import { useSession } from "@/hooks/useSession";

// Full-screen, not PageLoader's content-scoped min-h-[50vh] — no layout has mounted yet at
// this gate (mirrors ProtectedRoute's AuthRestoring).
function AdminSessionResolving() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

// Reads useSession() directly rather than useAuth() — AuthCtx doesn't expose `role` (it's
// only used internally by AuthProvider for the socket connection), and this is the one
// place that needs it. Same cache entry either way (TanStack dedupes by queryKey), so this
// isn't a second network call.
export function AdminGuard() {
  const { data: session, isPending } = useSession();

  if (isPending) return <AdminSessionResolving />;
  if (!session) return <Navigate to="/login" replace />;
  // A non-admin session is valid but wrong-role — send them to their own home rather than
  // /login (which would just bounce them back here via PublicOnlyRoute anyway).
  if (session.role !== UserRole.ADMIN) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
