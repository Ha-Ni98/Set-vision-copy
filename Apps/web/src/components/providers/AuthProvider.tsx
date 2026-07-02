import { createContext, useContext, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserRole, type LoginCommand, type SessionUserDTO } from "@my-app/contract";
import * as authService from "@/services/auth.service";

interface AuthCtx {
  isAuthenticated: boolean;
  displayName: string | null;
  login: (command: LoginCommand) => Promise<void>;
  isLoggingIn: boolean;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // TODO(Sub-02): delete this local state once `me()` reflects a real session. The
  // auth.service stub always resolves null (there is no backend to authenticate against
  // yet), so invalidating/refetching the me-query after a "successful" stub login can't
  // reflect it. This bridges that gap without ever writing into the query cache by hand —
  // once me() is real, a cookie set by the login response makes invalidate+refetch alone
  // correct, and stubSession goes away.
  const [stubSession, setStubSession] = useState<SessionUserDTO | null>(null);

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: authService.me,
    staleTime: Infinity,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: () => {
      setStubSession({ id: "", username: "", role: UserRole.ACTIVATOR, fullName: "" });
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      setStubSession(null);
      queryClient.clear();
    },
  });

  const session = meQuery.data ?? stubSession;

  return (
    <Ctx.Provider
      value={{
        isAuthenticated: !!session,
        displayName: session?.fullName || null,
        login: async (command) => {
          await loginMutation.mutateAsync(command);
        },
        isLoggingIn: loginMutation.isPending,
        logout: () => logoutMutation.mutate(),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside provider");
  return c;
}
