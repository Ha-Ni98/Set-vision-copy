import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { ACTIVATOR_NAV_LINKS } from "@/config/nav-links";

export function ActivatorSidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const loc = useLocation();
  return (
    <nav className="flex flex-col gap-1 p-3">
      {ACTIVATOR_NAV_LINKS.map((item) => {
        const active = loc.pathname === item.to;
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary-light text-primary border-l-4 border-primary -ml-1 pl-2"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <span className="flex items-center gap-3">
              <Icon className="h-4 w-4" />
              {t(item.labelKey)}
            </span>
            {item.badge !== null && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-semibold text-destructive-foreground">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function ActivatorSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-background lg:block">
      <ActivatorSidebarNav />
    </aside>
  );
}
