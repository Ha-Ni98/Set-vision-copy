import type { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { DistributorHeader } from "@/components/layout/DistributorHeader";
import { DistributorSidebar } from "@/components/layout/DistributorSidebar";

interface Props {
  /** Explicit children override <Outlet/> — used by the catch-all route, which isn't a matched child route. */
  children?: ReactNode;
}

export function DistributorLayout({ children }: Props) {
  return (
    <div className="min-h-screen bg-surface">
      <DistributorHeader />
      <div className="mx-auto flex max-w-7xl">
        <DistributorSidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children ?? <Outlet />}</main>
      </div>
    </div>
  );
}
