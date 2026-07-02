import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Logo } from "@/components/shared/Logo";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Bell, Menu, LayoutDashboard, Zap, History, LogOut, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";

// Guard is folded into the shell (temporary — Sprint 3 splits this into a router-level
// ProtectedRoute + ActivatorLayout per the plan; TanStack's file-route guard had no
// direct nested-route equivalent yet in this sprint's plain react-router-dom setup).
// Nav data stays local here — moving it to config/nav-links.ts is Sprint 3 scope.
const NAV = [
  { to: "/dashboard", labelKey: "activator.nav.dashboard", icon: LayoutDashboard, badge: null as null | number },
  { to: "/requests", labelKey: "activator.nav.requests", icon: Zap, badge: 4 },
  { to: "/history", labelKey: "activator.nav.history", icon: History, badge: null },
] as const;

export function ActivatorShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { isAuthenticated, displayName, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) nav("/login");
  }, [isAuthenticated, nav]);

  if (!isAuthenticated) return null;

  const handleLogout = () => { logout(); nav("/login"); };

  const SidebarNav = ({ onClick }: { onClick?: () => void }) => (
    <nav className="flex flex-col gap-1 p-3">
      {NAV.map((item) => {
        const active = loc.pathname === item.to;
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onClick}
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

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-background/90 px-4 backdrop-blur-md">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <div className="flex h-16 items-center border-b border-border px-4">
              <Logo size={32} />
            </div>
            <SidebarNav onClick={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        <Link to="/dashboard" className="flex items-center">
          <Logo size={32} />
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">3</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>{t("activator.shell.notifications")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex flex-col items-start gap-0.5">
                <span className="font-medium">{t("activator.shell.notif.newPending")}</span>
                <span className="text-xs text-muted-foreground">{t("activator.shell.notif.newPendingDetail")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-0.5">
                <span className="font-medium">{t("activator.shell.notif.completed")}</span>
                <span className="text-xs text-muted-foreground">{t("activator.shell.notif.completedDetail")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-0.5">
                <span className="font-medium">{t("activator.shell.notif.earningCredited")}</span>
                <span className="text-xs text-muted-foreground">{t("activator.shell.notif.earningCreditedDetail")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <LanguageToggle />
          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="ml-1 gap-2 px-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {displayName?.split(" ").map((s) => s[0]).join("").slice(0, 2)}
                </div>
                <span className="hidden text-sm font-medium sm:inline">{displayName}</span>
                <ChevronsUpDown className="hidden h-3 w-3 text-muted-foreground sm:inline" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" /> {t("activator.shell.signOut")}
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("activator.shell.signOutTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>{t("activator.shell.signOutBody")}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.actions.cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleLogout}>{t("activator.shell.signOut")}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        <aside className="hidden w-64 shrink-0 border-r border-border bg-background lg:block">
          <SidebarNav />
        </aside>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
