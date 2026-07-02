import { Outlet } from "react-router-dom";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { AdminSidebar } from "@/components/layout/AdminSidebar";

// No socket connect/disconnect here — AuthProvider already owns the role-socket lifecycle
// globally, keyed on session+role (connects the moment an admin session resolves, regardless
// of route). Managing it again from this layout's mount/unmount would fight that effect:
// navigating within /admin never remounts this component, but disconnecting on unmount here
// while the admin session is still alive would kill a socket AuthProvider isn't watching to
// reconnect (its effect deps haven't changed).
export function AdminLayout() {
  return (
    <div className="min-h-screen bg-surface">
      <AdminHeader />
      <div className="mx-auto flex max-w-7xl">
        <AdminSidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
