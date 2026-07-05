import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "node:events";
import { UserRole } from "@my-app/contract";
import {
  mockActivationTakenPayload,
  mockActivationClientUpdatedPayload,
  mockActivationFrozenPayload,
  mockActivationResolvedPayload,
  mockActivationStatusChangedPayload,
} from "../../fixtures/data/realtime.mock";
import { mockAuthTokens } from "../../fixtures/data/auth.mock";

vi.mock("socket.io-client", () => ({ io: vi.fn() }));
vi.mock("@/lib/axios", () => ({ refreshTokens: vi.fn() }));

// A minimal fake — real EventEmitter for listener registration/triggering (`.on`/`.emit`
// double as both "the module registers a handler" and "the test simulates a server push"),
// plus the handful of Socket.IO-specific members our module actually touches.
class FakeSocket extends EventEmitter {
  connected = false;
  connect = vi.fn(() => {
    this.connected = true;
  });
  disconnect = vi.fn(() => {
    this.connected = false;
  });
  io = { on: vi.fn() };
}

interface IoCall {
  url: string;
  opts: { auth?: (cb: (data: { token: string | null }) => void) => void };
  socket: FakeSocket;
}

// realtime.ts holds module-level singleton state (roleSocket/clientSocket) with no reset
// export — isolating tests requires resetting the whole module registry and dynamically
// re-importing everything in the same dependency graph (realtime.ts, its mocked axios,
// query-client's singleton, token-store) so they all resolve to the same fresh instances.
async function setup() {
  vi.resetModules();

  const socketIo = await import("socket.io-client");
  const calls: IoCall[] = [];
  vi.mocked(socketIo.io).mockImplementation(((url: string, opts: IoCall["opts"]) => {
    const socket = new FakeSocket();
    calls.push({ url, opts, socket });
    return socket as never;
  }) as unknown as typeof socketIo.io);

  const axios = await import("@/lib/axios");
  const refreshTokensMock = vi.mocked(axios.refreshTokens);
  // vi.mock's factory runs once per file, not once per resetModules() — the underlying
  // vi.fn() is shared across tests, so its call history must be cleared explicitly here.
  refreshTokensMock.mockReset();

  const { queryClient } = await import("@/lib/query-client");
  const tokenStore = await import("@/lib/token-store");
  tokenStore.clear();
  const realtime = await import("@/lib/realtime");

  return { realtime, queryClient, tokenStore, refreshTokensMock, calls };
}

let ctx: Awaited<ReturnType<typeof setup>>;

beforeEach(async () => {
  ctx = await setup();
});

describe("connectRoleSocket — namespace URL composition and role gating", () => {
  it("connects ACTIVATOR to the /activators namespace under VITE_WS_URL", () => {
    ctx.realtime.connectRoleSocket(UserRole.ACTIVATOR);
    expect(ctx.calls).toHaveLength(1);
    expect(ctx.calls[0].url).toBe(`${import.meta.env.VITE_WS_URL}/activators`);
  });

  it("connects ADMIN to the /admin namespace", () => {
    ctx.realtime.connectRoleSocket(UserRole.ADMIN);
    expect(ctx.calls[0].url).toBe(`${import.meta.env.VITE_WS_URL}/admin`);
  });
});

describe("connectRoleSocket — auth handshake callback", () => {
  it("resolves the current token on each call, not a stale capture", () => {
    ctx.tokenStore.setTokens({ accessToken: "first-token", refreshToken: "r1" });
    ctx.realtime.connectRoleSocket(UserRole.ACTIVATOR);
    const { auth } = ctx.calls[0].opts;

    const firstCb = vi.fn();
    auth!(firstCb);
    expect(firstCb).toHaveBeenCalledWith({ token: "first-token" });

    // Simulate a refresh happening after the socket was created but before a later
    // (re)connection attempt re-invokes this same callback.
    ctx.tokenStore.setTokens({ accessToken: "refreshed-token", refreshToken: "r2" });
    const secondCb = vi.fn();
    auth!(secondCb);
    expect(secondCb).toHaveBeenCalledWith({ token: "refreshed-token" });
  });
});

describe("connect_error handling — UNAUTHORIZED", () => {
  it("refreshes once via the shared refreshTokens() and reconnects exactly once", async () => {
    ctx.tokenStore.setTokens({ accessToken: "stale", refreshToken: "valid-refresh" });
    ctx.refreshTokensMock.mockResolvedValueOnce(mockAuthTokens);
    ctx.realtime.connectRoleSocket(UserRole.ACTIVATOR);
    const socket = ctx.calls[0].socket;

    socket.emit("connect_error", new Error("UNAUTHORIZED"));
    await vi.waitFor(() => expect(socket.connect).toHaveBeenCalledTimes(1));

    expect(ctx.refreshTokensMock).toHaveBeenCalledTimes(1);
    expect(socket.disconnect).not.toHaveBeenCalled();
  });

  it("disconnects without looping when refresh itself fails", async () => {
    ctx.refreshTokensMock.mockRejectedValueOnce(new Error("refresh failed"));
    ctx.realtime.connectRoleSocket(UserRole.ACTIVATOR);
    const socket = ctx.calls[0].socket;

    socket.emit("connect_error", new Error("UNAUTHORIZED"));
    await vi.waitFor(() => expect(socket.disconnect).toHaveBeenCalledTimes(1));

    expect(socket.connect).not.toHaveBeenCalled();
  });

  it("does not attempt a second refresh if the replayed connection 401s again", async () => {
    ctx.refreshTokensMock.mockResolvedValue(mockAuthTokens);
    ctx.realtime.connectRoleSocket(UserRole.ACTIVATOR);
    const socket = ctx.calls[0].socket;

    socket.emit("connect_error", new Error("UNAUTHORIZED"));
    await vi.waitFor(() => expect(socket.connect).toHaveBeenCalledTimes(1));

    // Still 401ing after the "reconnect" (no real network here, just the same fake socket).
    socket.emit("connect_error", new Error("UNAUTHORIZED"));
    await vi.waitFor(() => expect(socket.disconnect).toHaveBeenCalledTimes(1));

    expect(ctx.refreshTokensMock).toHaveBeenCalledTimes(1); // not 2 — no loop
  });

  it("resets the retry guard on a successful connect, allowing one fresh attempt later", async () => {
    ctx.refreshTokensMock.mockResolvedValue(mockAuthTokens);
    ctx.realtime.connectRoleSocket(UserRole.ACTIVATOR);
    const socket = ctx.calls[0].socket;

    socket.emit("connect_error", new Error("UNAUTHORIZED"));
    await vi.waitFor(() => expect(socket.connect).toHaveBeenCalledTimes(1));

    socket.emit("connect"); // the reconnect actually lands this time
    socket.emit("connect_error", new Error("UNAUTHORIZED")); // a later, unrelated expiry

    await vi.waitFor(() => expect(ctx.refreshTokensMock).toHaveBeenCalledTimes(2));
  });
});

describe("connect_error handling — FORBIDDEN", () => {
  it("disconnects permanently with no refresh attempt", () => {
    ctx.realtime.connectRoleSocket(UserRole.ADMIN);
    const socket = ctx.calls[0].socket;

    socket.emit("connect_error", new Error("FORBIDDEN"));

    expect(socket.disconnect).toHaveBeenCalledTimes(1);
    expect(ctx.refreshTokensMock).not.toHaveBeenCalled();
  });
});

describe("connect_error handling — other errors", () => {
  it("leaves non-auth errors to Socket.IO's own reconnection (no manual disconnect)", () => {
    ctx.realtime.connectRoleSocket(UserRole.ACTIVATOR);
    const socket = ctx.calls[0].socket;

    socket.emit("connect_error", new Error("xhr poll error"));

    expect(socket.disconnect).not.toHaveBeenCalled();
    expect(ctx.refreshTokensMock).not.toHaveBeenCalled();
  });
});

describe("event → invalidation routing — /activators namespace", () => {
  it("activation:created invalidates the pending list", () => {
    ctx.realtime.connectRoleSocket(UserRole.ACTIVATOR);
    const socket = ctx.calls[0].socket;
    const spy = vi.spyOn(ctx.queryClient, "invalidateQueries");

    socket.emit("activation:created", mockActivationTakenPayload);

    expect(spy).toHaveBeenCalledWith({ queryKey: ["activations", "pending"] });
  });

  it("activation:taken invalidates the pending list", () => {
    ctx.realtime.connectRoleSocket(UserRole.ACTIVATOR);
    const socket = ctx.calls[0].socket;
    const spy = vi.spyOn(ctx.queryClient, "invalidateQueries");

    socket.emit("activation:taken", mockActivationTakenPayload);

    expect(spy).toHaveBeenCalledWith({ queryKey: ["activations", "pending"] });
  });

  it("activation:client-updated invalidates the active list", () => {
    ctx.realtime.connectRoleSocket(UserRole.ACTIVATOR);
    const socket = ctx.calls[0].socket;
    const spy = vi.spyOn(ctx.queryClient, "invalidateQueries");

    socket.emit("activation:client-updated", mockActivationClientUpdatedPayload);

    expect(spy).toHaveBeenCalledWith({ queryKey: ["activations", "active"] });
  });

  it("activation:resolved invalidates active, my-history, recent, and the normalized my-stats key", () => {
    ctx.realtime.connectRoleSocket(UserRole.ACTIVATOR);
    const socket = ctx.calls[0].socket;
    const spy = vi.spyOn(ctx.queryClient, "invalidateQueries");

    socket.emit("activation:resolved", mockActivationResolvedPayload);

    expect(spy).toHaveBeenCalledWith({ queryKey: ["activations", "active"] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["activations", "my-history"] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["activations", "recent"] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["activators", "my-stats"] });
  });
});

describe("event → invalidation routing — /admin namespace", () => {
  it("activation:frozen invalidates the whole activations domain", () => {
    ctx.realtime.connectRoleSocket(UserRole.ADMIN);
    const socket = ctx.calls[0].socket;
    const spy = vi.spyOn(ctx.queryClient, "invalidateQueries");

    socket.emit("activation:frozen", mockActivationFrozenPayload);

    expect(spy).toHaveBeenCalledWith({ queryKey: ["activations"] });
  });

  it("does not attach activator-only listeners to the admin socket", () => {
    ctx.realtime.connectRoleSocket(UserRole.ADMIN);
    const socket = ctx.calls[0].socket;
    const spy = vi.spyOn(ctx.queryClient, "invalidateQueries");

    socket.emit("activation:created", mockActivationTakenPayload);

    expect(spy).not.toHaveBeenCalled();
  });
});

describe("portal socket (/client) — subscribe/unsubscribe and event routing", () => {
  it("connects to the /client namespace on first subscription", () => {
    ctx.realtime.subscribeActivation("id-1");
    expect(ctx.calls).toHaveLength(1);
    expect(ctx.calls[0].url).toBe(`${import.meta.env.VITE_WS_URL}/client`);
  });

  it("emits subscribe immediately when already connected", () => {
    ctx.realtime.subscribeActivation("id-1");
    const socket = ctx.calls[0].socket;
    socket.connected = true;
    const emitSpy = vi.spyOn(socket, "emit");

    ctx.realtime.subscribeActivation("id-2");

    expect(emitSpy).toHaveBeenCalledWith("subscribe", "id-2");
  });

  it("defers the subscribe emit until connect when not yet connected, then resubscribes on every connect", () => {
    ctx.realtime.subscribeActivation("id-1");
    const socket = ctx.calls[0].socket;
    const emitSpy = vi.spyOn(socket, "emit");

    expect(emitSpy).not.toHaveBeenCalledWith("subscribe", "id-1");

    socket.connected = true;
    socket.emit("connect");
    expect(emitSpy).toHaveBeenCalledWith("subscribe", "id-1");

    // Reconnect after a drop — realtime-rules.md §8: re-emit subscribe on every connect.
    emitSpy.mockClear();
    socket.emit("connect");
    expect(emitSpy).toHaveBeenCalledWith("subscribe", "id-1");
  });

  it("unsubscribeActivation emits unsubscribe and stops resubscribing on later reconnects", () => {
    ctx.realtime.subscribeActivation("id-1");
    const socket = ctx.calls[0].socket;
    socket.connected = true;
    socket.emit("connect");

    const emitSpy = vi.spyOn(socket, "emit");
    ctx.realtime.unsubscribeActivation("id-1");
    expect(emitSpy).toHaveBeenCalledWith("unsubscribe", "id-1");

    emitSpy.mockClear();
    socket.emit("connect");
    expect(emitSpy).not.toHaveBeenCalledWith("subscribe", "id-1");
  });

  it("activation:status-changed invalidates that activation's status key", () => {
    ctx.realtime.subscribeActivation(mockActivationStatusChangedPayload.activationId);
    const socket = ctx.calls[0].socket;
    const spy = vi.spyOn(ctx.queryClient, "invalidateQueries");

    socket.emit("activation:status-changed", mockActivationStatusChangedPayload);

    expect(spy).toHaveBeenCalledWith({
      queryKey: ["keys", "status", mockActivationStatusChangedPayload.activationId],
    });
  });

  it("never attaches auth error handling to the public portal socket", () => {
    ctx.realtime.subscribeActivation("id-1");
    const socket = ctx.calls[0].socket;

    socket.emit("connect_error", new Error("UNAUTHORIZED"));

    expect(ctx.refreshTokensMock).not.toHaveBeenCalled();
    expect(socket.disconnect).not.toHaveBeenCalled();
  });
});

describe("disconnectRoleSocket", () => {
  it("disconnects and removes all listeners on the underlying socket", () => {
    ctx.realtime.connectRoleSocket(UserRole.ACTIVATOR);
    const socket = ctx.calls[0].socket;
    const removeAllSpy = vi.spyOn(socket, "removeAllListeners");

    ctx.realtime.disconnectRoleSocket();

    expect(socket.disconnect).toHaveBeenCalledTimes(1);
    expect(removeAllSpy).toHaveBeenCalledTimes(1);
  });

  it("is a safe no-op when no role socket is connected", () => {
    expect(() => ctx.realtime.disconnectRoleSocket()).not.toThrow();
  });
});

describe("connectRoleSocket — reconnecting replaces any existing role socket", () => {
  it("tears down the previous role socket before creating a new one", () => {
    ctx.realtime.connectRoleSocket(UserRole.ACTIVATOR);
    const first = ctx.calls[0].socket;

    ctx.realtime.connectRoleSocket(UserRole.ADMIN);

    expect(first.disconnect).toHaveBeenCalledTimes(1);
    expect(ctx.calls).toHaveLength(2);
    expect(ctx.calls[1].url).toBe(`${import.meta.env.VITE_WS_URL}/admin`);
  });
});
