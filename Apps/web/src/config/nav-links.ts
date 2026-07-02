import { LayoutDashboard, Zap, History, type LucideIcon } from "lucide-react";

export interface NavLink {
  to: string;
  labelKey: string;
  icon: LucideIcon;
}

// Badges aren't configured here — the Requests link's badge is derived live from
// useActiveRequests data length (hidden at 0), see ActivatorSidebarNav (§8.Q5 sibling task).
export const ACTIVATOR_NAV_LINKS: NavLink[] = [
  { to: "/dashboard", labelKey: "activator.nav.dashboard", icon: LayoutDashboard },
  { to: "/requests", labelKey: "activator.nav.requests", icon: Zap },
  { to: "/history", labelKey: "activator.nav.history", icon: History },
];
