import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/shared/Logo";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { loginSchema, type LoginFormValues } from "./login.schema";

function loginErrorKey(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (err.response?.status === 429) return "auth.login.lockout";
    if (!err.response) return "auth.login.network";
  }
  return "auth.login.error";
}

// Redirect-if-already-authenticated (both before mounting AND right after a successful
// login) is handled entirely by the router's PublicOnlyRoute guard reacting to the session
// query — this page never navigates itself. useLogin's onSuccess already invalidates
// qk.auth.me(), so the moment that refetch resolves, PublicOnlyRoute re-renders with a
// session and redirects by role (activator-portal plan.md §B9/E-4). Declarative guard over
// imperative navigate(), matching this file's own established precedent (ProtectedRoute.tsx).
export default function LoginPage() {
  const { t } = useTranslation();
  const { login, isLoggingIn } = useAuth();
  const [showP, setShowP] = useState(false);
  const [err, setErr] = useState("");
  const [shake, setShake] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema(t)),
    mode: "onSubmit",
  });

  const submit = async (data: LoginFormValues) => {
    setErr("");
    try {
      await login(data);
    } catch (e) {
      setErr(t(loginErrorKey(e)));
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 [background:var(--login-glow)]" />
      <div className="absolute right-4 top-4 flex items-center gap-1">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-4">
        <div
          className={`w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)] ${shake ? "animate-shake" : ""}`}
        >
          <div className="mb-6 flex flex-col items-center text-center">
            <Logo size={56} withText={false} />
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground">
              SETVISION
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("auth.login.subtitle")}</p>
          </div>

          {err && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{err}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(submit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">{t("auth.login.username")}</Label>
              <Input
                id="username"
                autoComplete="username"
                aria-invalid={!!errors.username}
                aria-describedby={errors.username ? "username-error" : undefined}
                {...register("username")}
              />
              {errors.username && (
                <p id="username-error" role="alert" className="text-xs text-destructive">
                  {errors.username.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t("auth.login.password")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showP ? "text" : "password"}
                  autoComplete="current-password"
                  className="pr-10"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowP((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={t(showP ? "auth.login.hidePassword" : "auth.login.showPassword")}
                >
                  {showP ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" role="alert" className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>
            <Button type="submit" disabled={isLoggingIn} className="h-11 w-full text-base">
              {isLoggingIn ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("auth.login.submitting")}
                </>
              ) : (
                t("auth.login.submit")
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
