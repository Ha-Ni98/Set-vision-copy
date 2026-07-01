import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/shared/Logo";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Eye, EyeOff, Loader2, ChevronDown, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const nav = useNavigate();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [showP, setShowP] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (isAuthenticated) nav("/dashboard");
  }, [isAuthenticated, nav]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    setTimeout(() => {
      const ok = login(u, p);
      setLoading(false);
      if (ok) nav("/dashboard");
      else {
        setErr("Incorrect username or password. Please try again.");
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    }, 500);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(60%_50%_at_50%_0%,oklch(0.95_0.04_295/0.7),transparent),radial-gradient(50%_40%_at_80%_100%,oklch(0.95_0.04_295/0.5),transparent)] dark:[background:radial-gradient(60%_50%_at_50%_0%,oklch(0.30_0.10_295/0.5),transparent),radial-gradient(50%_40%_at_80%_100%,oklch(0.30_0.10_295/0.4),transparent)]" />
      <div className="absolute right-4 top-4 flex items-center gap-1">
        <button className="inline-flex items-center gap-1 rounded-md px-2 py-2 text-sm text-muted-foreground hover:text-foreground">EN <ChevronDown className="h-3 w-3" /></button>
        <ThemeToggle />
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-4">
        <div className={`w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)] ${shake ? "animate-shake" : ""}`}>
          <div className="mb-6 flex flex-col items-center text-center">
            <Logo size={56} withText={false} />
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground">SETVISION</h1>
            <p className="mt-1 text-sm text-muted-foreground">Activator Login</p>
          </div>

          {err && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{err}</span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="u">Username</Label>
              <Input id="u" value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p">Password</Label>
              <div className="relative">
                <Input id="p" type={showP ? "text" : "password"} value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" required className="pr-10" />
                <button type="button" onClick={() => setShowP((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                  {showP ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="h-11 w-full text-base">
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...</> : "Log In"}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Demo: <span className="font-mono text-foreground">ahmed / ahmed123</span> · <span className="font-mono text-foreground">sara / sara123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
