import type { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

interface Props {
  /** Explicit children override <Outlet/> — used by the catch-all route, which isn't a matched child route. */
  children?: ReactNode;
}

export function PublicLayout({ children }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <main className="flex-1">{children ?? <Outlet />}</main>
      <PublicFooter />
    </div>
  );
}
