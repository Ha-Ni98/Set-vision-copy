import type { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { AdminSidebar } from "@/components/layout/AdminSidebar";

interface Props {
  /** Explicit children override <Outlet/> — used by the catch-all route, which isn't a matched child route. */
  children?: ReactNode;
}

// No socket connect/disconnect here — AuthProvider already owns the role-socket lifecycle
// globally, keyed on session+role (connects the moment an admin session resolves, regardless
// of route). Managing it again from this layout's mount/unmount would fight that effect:
// navigating within /admin never remounts this component, but disconnecting on unmount here
// while the admin session is still alive would kill a socket AuthProvider isn't watching to
// reconnect (its effect deps haven't changed).
export function AdminLayout({ children }: Props) {
  return (
    <div className="min-h-screen bg-surface">
      <AdminHeader />
      <div className="mx-auto flex max-w-7xl">
        <AdminSidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children ?? <Outlet />}</main>
      </div>
    </div>
  );
}
