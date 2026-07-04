import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import { UserRole, type ServerToClientEvents } from "@my-app/contract";
import * as tokenStore from "./token-store";
import { refreshTokens } from "./axios";
import { queryClient } from "./query-client";
import { qk } from "./query-keys";
import { translate, getLanguage } from "./i18n";

// Namespace names and the client→server interface are NOT in @my-app/contract yet —
// ClientToServerEvents there is `Record<string, never>` ("none in Stage 1"), while the
// API only defines `subscribe`/`unsubscribe` and the three namespace paths locally in its
// own common/realtime/rooms.ts (contract gap, plan.md §7.5; realtime-rules.md §3A
// suggests the additive touch-up of moving these into the contract). Pinned here, in this
// one module, until that lands upstream.
const NS = {
  CLIENT: "/client",
  ACTIVATORS: "/activators",
  ADMIN: "/admin",
} as const;

interface ClientToServerEvents {
  subscribe: (activationId: string) => void;
  unsubscribe: (activationId: string) => void;
}

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

function wsUrl(namespace: string): string {
  return import.meta.env.VITE_WS_URL + namespace;
}

// ─── Connection status store (backs useRealtimeStatus, plan.md §5.1) ─────────
// Sockets are a freshness signal, never a data source (plan.md §5) — this store is purely
// UI-facing connection health, never written with domain data.

export type RealtimeStatus = "disconnected" | "connecting" | "connected";

type StatusListener = () => void;
const statusListeners = new Set<StatusListener>();
let status: RealtimeStatus = "disconnected";

function setStatus(next: RealtimeStatus): void {
  if (status === next) return;
  status = next;
  statusListeners.forEach((listener) => listener());
}

export function getRealtimeStatus(): RealtimeStatus {
  return status;
}

export function onRealtimeStatusChange(listener: StatusListener): () => void {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

function attachStatusTracking(socket: AppSocket): void {
  socket.on("connect", () => setStatus("connected"));
  socket.on("disconnect", () => setStatus("disconnected"));
  socket.io.on("reconnect_attempt", () => setStatus("connecting"));
}

// ─── Auth handshake + reconnect-on-refresh (authed namespaces only) ──────────
// Callback form re-evaluates on every (re)connection attempt, so a token refreshed after
// the socket was created is still picked up on the next handshake (realtime-rules.md §7.6
// — validate at handshake only; §11.7 — never skip re-auth on reconnect).
function authCallback(cb: (data: { token: string | null }) => void): void {
  cb({ token: tokenStore.getAccessToken() });
}

// One shared refreshTokens() (src/lib/axios.ts) — the same single-flight promise REST
// requests use, so a 401 on a REST call and an UNAUTHORIZED socket handshake happening
// together never trigger two separate refreshes (plan.md §5.1).
function attachAuthErrorHandling(socket: AppSocket): void {
  let hasRetried = false;
  socket.on("connect", () => {
    hasRetried = false;
  });
  socket.on("connect_error", (err) => {
    if (err.message === "UNAUTHORIZED") {
      if (hasRetried) {
        // Already tried once this cycle and it 401'd again — stop, don't loop
        // (sprints.md Sprint 4 risk: "no reconnect loop when refresh fails").
        socket.disconnect();
        return;
      }
      hasRetried = true;
      refreshTokens()
        .then(() => socket.connect())
        .catch(() => socket.disconnect()); // refresh failed — REST's axios interceptor owns the logout redirect
    } else if (err.message === "FORBIDDEN") {
      socket.disconnect(); // wrong role for this namespace — permanent, no retry
    }
    // Any other connect_error (network blip, server down) is left to Socket.IO's own
    // default reconnection/backoff — we only intervene on the two auth-specific cases.
  });
}

// ─── Event → invalidation routing (plan.md §5.2, mirrors realtime-rules.md §6) ────────
// Every handler invalidates only — payloads are never written into the cache (rules §2:
// no manual cache mutation). REST stays the single source of truth.

function attachActivatorNamespaceListeners(socket: AppSocket): void {
  // Shell reconnect UX (spec SV-PAGE-002-005 §Authenticated shell): a real drop shows the
  // "Connection lost. Reconnecting…" toast; a manual disconnect (logout → disconnectRoleSocket)
  // must not, since that's an intentional, expected teardown, not a failure. A stable toast id
  // means a flaky connection replaces the same toast instead of stacking duplicates.
  socket.on("disconnect", (reason) => {
    if (reason === "io client disconnect") return;
    toast.warning(translate("activator.shell.connectionLost", getLanguage()), {
      id: "activator-realtime-reconnecting",
    });
  });
  // Re-fetch on (re)connect — covers events missed while offline (spec: "re-fetch active +
  // pending on reconnect"); harmless no-op extra fetch on the very first login connect too.
  socket.on("connect", () => {
    queryClient.invalidateQueries({ queryKey: qk.activations.active() });
    queryClient.invalidateQueries({ queryKey: qk.activations.pending() });
  });

  socket.on("activation:created", () => {
    queryClient.invalidateQueries({ queryKey: qk.activations.pending() });
  });
  socket.on("activation:taken", () => {
    queryClient.invalidateQueries({ queryKey: qk.activations.pending() });
  });
  socket.on("activation:client-updated", () => {
    queryClient.invalidateQueries({ queryKey: qk.activations.active() });
  });
  socket.on("activation:resolved", () => {
    queryClient.invalidateQueries({ queryKey: qk.activations.active() });
    queryClient.invalidateQueries({ queryKey: qk.activations.myHistoryAll() });
    queryClient.invalidateQueries({ queryKey: qk.activations.recent() });
    // Normalized key — this module carries no legacy singular-key baggage to preserve
    // (see the same reasoning in useCancelActivation, Sprint 3). The D4 rename of
    // useMyStats itself still lands atomically in Sprint 5.
    queryClient.invalidateQueries({ queryKey: qk.activators.myStats() });
  });
}

function attachAdminNamespaceListeners(socket: AppSocket): void {
  socket.on("activation:frozen", () => {
    queryClient.invalidateQueries({ queryKey: qk.activations.all() });
  });
}

function attachClientNamespaceListeners(socket: AppSocket): void {
  socket.on("activation:status-changed", (payload) => {
    queryClient.invalidateQueries({ queryKey: qk.keys.status(payload.activationId) });
  });
}

// ─── Role socket (authed — /activators or /admin) ────────────────────────────

let roleSocket: AppSocket | null = null;

export function connectRoleSocket(role: UserRole): void {
  disconnectRoleSocket();
  const namespace = role === UserRole.ADMIN ? NS.ADMIN : NS.ACTIVATORS;
  const socket = io(wsUrl(namespace), { auth: authCallback }) as AppSocket;

  attachAuthErrorHandling(socket);
  attachStatusTracking(socket);
  if (role === UserRole.ADMIN) {
    attachAdminNamespaceListeners(socket);
  } else {
    attachActivatorNamespaceListeners(socket);
  }

  roleSocket = socket;
}

export function disconnectRoleSocket(): void {
  if (!roleSocket) return;
  roleSocket.disconnect();
  roleSocket.removeAllListeners();
  roleSocket = null;
}

// ─── Portal socket (public — /client) ─────────────────────────────────────────
// Created lazily on first subscription; the current subscription is re-emitted on every
// `connect` (including reconnects), per realtime-rules.md §8's client reconnection guidance.

let clientSocket: AppSocket | null = null;
let currentSubscription: string | null = null;

function ensureClientSocket(): AppSocket {
  if (clientSocket) return clientSocket;

  const socket = io(wsUrl(NS.CLIENT)) as AppSocket;
  attachStatusTracking(socket);
  attachClientNamespaceListeners(socket);
  socket.on("connect", () => {
    if (currentSubscription) socket.emit("subscribe", currentSubscription);
  });

  clientSocket = socket;
  return socket;
}

export function subscribeActivation(activationId: string): void {
  const socket = ensureClientSocket();
  currentSubscription = activationId;
  if (socket.connected) socket.emit("subscribe", activationId);
  // else: the "connect" handler above emits once the handshake completes.
}

export function unsubscribeActivation(activationId: string): void {
  if (clientSocket?.connected) clientSocket.emit("unsubscribe", activationId);
  if (currentSubscription === activationId) currentSubscription = null;
}
