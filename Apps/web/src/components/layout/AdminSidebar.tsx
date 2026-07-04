import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { ADMIN_NAV_LINKS, isNavGroup } from "@/config/nav-links";

export function AdminSidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const loc = useLocation();
  // Groups default open (matches the SV-PAGE-006-010 shell mockup's "▼" state); collapsing
  // is per-group, keyed by labelKey since these render statelessly from config.
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  return (
    <nav className="flex flex-col gap-1 p-3">
      {ADMIN_NAV_LINKS.map((item) => {
        if (!isNavGroup(item)) {
          const active = loc.pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary-light text-primary border-l-4 border-primary -ml-1 pl-2"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {t(item.labelKey)}
            </Link>
          );
        }

        const Icon = item.icon;
        const isOpen = !collapsedGroups[item.labelKey];
        const groupActive = item.children.some((child) => loc.pathname === child.to);

        return (
          <div key={item.labelKey}>
            <button
              type="button"
              onClick={() =>
                setCollapsedGroups((prev) => ({ ...prev, [item.labelKey]: !prev[item.labelKey] }))
              }
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                groupActive
                  ? "text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4" />
                {t(item.labelKey)}
              </span>
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", !isOpen && "-rotate-90")}
              />
            </button>
            {isOpen && (
              <div className="ml-4 flex flex-col gap-1 border-l border-border pl-3">
                {item.children.map((child) => {
                  const active = loc.pathname === child.to;
                  const ChildIcon = child.icon;
                  return (
                    <Link
                      key={child.to}
                      to={child.to}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary-light text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      <ChildIcon className="h-3.5 w-3.5" />
                      {t(child.labelKey)}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export function AdminSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-background lg:block">
      <AdminSidebarNav />
    </aside>
  );
}
