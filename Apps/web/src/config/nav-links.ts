import { LayoutDashboard, Zap, History, type LucideIcon } from "lucide-react";

export interface NavLink {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  badge: number | null;
}

// `badge` stays a hardcoded placeholder here (matches the ported MVP) — deriving it from
// real active-request data is Sprint 4 scope (plan §4, §8.Q5).
export const ACTIVATOR_NAV_LINKS: NavLink[] = [
  { to: "/dashboard", labelKey: "activator.nav.dashboard", icon: LayoutDashboard, badge: null },
  { to: "/requests", labelKey: "activator.nav.requests", icon: Zap, badge: 4 },
  { to: "/history", labelKey: "activator.nav.history", icon: History, badge: null },
];
