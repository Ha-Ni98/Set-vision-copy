import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { MOCK_USERS } from "@/lib/mock-data";

interface AuthCtx {
  isAuthenticated: boolean;
  displayName: string | null;
  username: string | null;
  login: (u: string, p: string) => boolean;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("sv_auth");
    if (saved) {
      try {
        const p = JSON.parse(saved);
        setDisplayName(p.displayName);
        setUsername(p.username);
      } catch {}
    }
  }, []);

  const login = (u: string, p: string) => {
    const m = MOCK_USERS.find((x) => x.username === u && x.password === p);
    if (!m) return false;
    setDisplayName(m.display_name);
    setUsername(m.username);
    localStorage.setItem("sv_auth", JSON.stringify({ displayName: m.display_name, username: m.username }));
    return true;
  };

  const logout = () => {
    setDisplayName(null);
    setUsername(null);
    localStorage.removeItem("sv_auth");
  };

  return (
    <Ctx.Provider value={{ isAuthenticated: !!displayName, displayName, username, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside provider");
  return c;
}
