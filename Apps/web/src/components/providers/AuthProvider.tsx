import { createContext, useContext, useEffect, type ReactNode } from "react";
import type { LoginCommand } from "@my-app/contract";
import { useSession } from "@/hooks/useSession";
import { useLogin } from "@/hooks/useLogin";
import { useLogout } from "@/hooks/useLogout";
import { connectRoleSocket, disconnectRoleSocket } from "@/lib/realtime";

interface AuthCtx {
  isAuthenticated: boolean;
  // True once the session query has settled (success or error) at least once — lets
  // ProtectedRoute/PublicOnlyRoute hold rendering during the cold-start restore instead of
  // flashing to /login before the silent refresh (axios's 401 interceptor) has a chance to
  // resolve (plan.md §2.1).
  isReady: boolean;
  displayName: string | null;
  login: (command: LoginCommand) => Promise<void>;
  isLoggingIn: boolean;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const sessionQuery = useSession();
  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  const session = sessionQuery.data ?? null;
  const isAuthenticated = !!session;
  const role = session?.role;

  // Role socket lifecycle (plan.md §5.1): connects once a session with a role is present,
  // disconnects on logout (queryClient.clear() drops the cached session, so `role` goes
  // undefined on the very next render) or unmount. Keyed on the role value, not the session
  // object, so an unrelated me() refetch with the same role never reconnects the socket.
  useEffect(() => {
    if (!isAuthenticated || !role) {
      disconnectRoleSocket();
      return;
    }
    connectRoleSocket(role);
    return () => disconnectRoleSocket();
  }, [isAuthenticated, role]);

  return (
    <Ctx.Provider
      value={{
        isAuthenticated,
        isReady: !sessionQuery.isPending,
        displayName: session?.fullName ?? null,
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
