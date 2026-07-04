import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useRealtimeStatus } from "@/hooks/useRealtimeStatus";

// Feed/badge deferred (plan.md §F-6) — the admin socket is invalidation-only today, with no
// event stream to derive a badge/list from. This renders the bell chrome and a reconnect
// indicator only; a later stage wires the FREEZE-alert feed into this same dropdown body.
export function NotificationBell() {
  const { t } = useTranslation();
  const status = useRealtimeStatus();
  const reconnecting = status === "connecting";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={t("admin.shell.bell.label")}
        >
          <Bell className="h-5 w-5" />
          {reconnecting && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 animate-pulse rounded-full bg-warning" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>{t("admin.shell.bell.label")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="px-2 py-6 text-center text-sm text-muted-foreground">
          {reconnecting ? t("admin.shell.bell.reconnecting") : t("admin.shell.bell.empty")}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
