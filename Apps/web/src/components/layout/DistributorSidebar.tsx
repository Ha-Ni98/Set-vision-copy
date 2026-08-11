import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { DISTRIBUTOR_NAV_LINKS } from "@/config/nav-links";

// Structural copy of ActivatorSidebarNav — deliberately does not carry a badge query.
// usePendingActivations() is [ACTIVATOR, ADMIN]-only and would 403 on every render here.
export function DistributorSidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const loc = useLocation();

  return (
    <nav className="flex flex-col gap-1 p-3">
      {DISTRIBUTOR_NAV_LINKS.map((item) => {
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
      })}
    </nav>
  );
}

export function DistributorSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-background lg:block">
      <DistributorSidebarNav />
    </aside>
  );
}
