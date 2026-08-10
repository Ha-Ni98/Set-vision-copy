import {
  LayoutDashboard,
  Zap,
  History,
  Users,
  Store,
  Package,
  Layers,
  CreditCard,
  BarChart3,
  Settings,
  FileText,
  BellRing,
  type LucideIcon,
} from "lucide-react";

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

export const DISTRIBUTOR_NAV_LINKS: NavLink[] = [
  { to: "/portal", labelKey: "distributor.nav.portal", icon: LayoutDashboard },
  { to: "/portal/requests", labelKey: "distributor.nav.orderRequests", icon: Package },
  { to: "/portal/revocations", labelKey: "distributor.nav.revocations", icon: CreditCard },
];

// A collapsible group in the admin sidebar (e.g. "Distributors ▾"). Additive to NavLink —
// ACTIVATOR_NAV_LINKS is untouched.
export interface NavGroup {
  labelKey: string;
  icon: LucideIcon;
  children: NavLink[];
}

export type AdminNavItem = NavLink | NavGroup;

export function isNavGroup(item: AdminNavItem): item is NavGroup {
  return "children" in item;
}

// Renders the full Part 1–3 conception nav (SV-PAGE-006-010 shared shell mockup). Only the
// Part 1 leaves (Dashboard, Activators, the Distributors group's own "Distributors" child)
// resolve to a real route today — every other entry is a scope-confined <Link> to a page
// this stage doesn't build (plan.md §C).
export const ADMIN_NAV_LINKS: AdminNavItem[] = [
  { to: "/admin", labelKey: "admin.shell.nav.dashboard", icon: LayoutDashboard },
  { to: "/admin/activators", labelKey: "admin.shell.nav.activators", icon: Users },
  {
    labelKey: "admin.shell.nav.distributors",
    icon: Store,
    children: [
      { to: "/admin/distributors", labelKey: "admin.shell.nav.distributors", icon: Store },
      { to: "/admin/distributors/orders", labelKey: "admin.shell.nav.orders", icon: Package },
      {
        to: "/admin/distributors/order-requests",
        labelKey: "admin.shell.nav.orderRequests",
        icon: Package,
      },
      {
        to: "/admin/distributors/revocation-requests",
        labelKey: "admin.shell.nav.revocationRequests",
        icon: CreditCard,
      },
    ],
  },
  {
    labelKey: "admin.shell.nav.activations",
    icon: Zap,
    children: [
      { to: "/admin/activations/sets-lots", labelKey: "admin.shell.nav.setsAndLots", icon: Layers },
      { to: "/admin/activations/cards", labelKey: "admin.shell.nav.cards", icon: CreditCard },
      { to: "/admin/activations", labelKey: "admin.shell.nav.activations", icon: Zap },
    ],
  },
  { to: "/admin/statistics", labelKey: "admin.shell.nav.statistics", icon: BarChart3 },
  { to: "/admin/settings", labelKey: "admin.shell.nav.settings", icon: Settings },
  { to: "/admin/logs", labelKey: "admin.shell.nav.logs", icon: FileText },
  { to: "/admin/notifications", labelKey: "admin.shell.nav.notifications", icon: BellRing },
];
