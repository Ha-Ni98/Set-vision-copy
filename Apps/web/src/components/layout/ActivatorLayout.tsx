import type { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { ActivatorHeader } from "@/components/layout/ActivatorHeader";
import { ActivatorSidebar } from "@/components/layout/ActivatorSidebar";

interface Props {
  /** Explicit children override <Outlet/> — used by the catch-all route, which isn't a matched child route. */
  children?: ReactNode;
}

export function ActivatorLayout({ children }: Props) {
  return (
    <div className="min-h-screen bg-surface">
      <ActivatorHeader />
      <div className="mx-auto flex max-w-7xl">
        <ActivatorSidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children ?? <Outlet />}</main>
      </div>
    </div>
  );
}
