# Realtime (WebSocket) Initialization Rules

**Goal:** Add a realtime layer to the `apps/api` framework so the Activation module's events reach clients live. Companion to `back-end-rules.md`; same constraints apply.
**Stack add-on:** **Socket.IO v4** (rooms, namespaces, JWT handshake auth, automatic transport fallback to HTTP long-polling, heartbeat, client reconnection — all the things you'd otherwise re-implement on raw `ws`).
**Constraint:** Realtime is **framework code**, not a module. It lives under `src/common/realtime/` and contains **zero business logic**. It is a *bridge*: the typed event bus is the source, the gateway is the only place that knows both the bus and the sockets.
**Bound to:** `@my-app/contract` — socket event names and payloads are the **same** contract event types the Activation module emits on the bus. No second naming layer, no drift.

> Why Socket.IO over raw `ws`: you get namespaces + rooms (the audience model below maps 1:1), a connection-time auth middleware, automatic polling fallback (the client portal spec asked for "WebSocket/SSE with polling fallback"), ping/pong heartbeat, and client-side reconnection with backoff. Raw `ws` means hand-rolling every one of those.

---

## 1. Architecture — the bridge

```text
 module service (Stage 2 Sub-02)
        │  emits AFTER its DB transaction commits
        ▼
   eventBus  (typed EventEmitter, already in common/events)   ← the source of truth
        │  subscribed once, at boot
        ▼
 realtime-gateway  (common/realtime)  ← the ONLY place that knows both bus + sockets
        │  routes each event to a namespace/room
        ▼
   Socket.IO server  ── /client (public)  ── /activators (auth)  ── /admin (auth)
```

The decoupling is the point: a service never imports the socket server. It emits a domain event to the bus and forgets. If realtime were removed tomorrow, services wouldn't change. This honors `back-end-rules.md` §13.1 (common/ never depends on modules/; here modules don't depend on realtime either).

---

## 2. Folder structure (additions to `back-end-rules.md` §1)

```text
src/common/realtime/
├── socket.ts              # IOServer singleton + createSocketServer(httpServer) + getIO()
├── socket.types.ts        # typed ServerToClient / ClientToServer / SocketData (reuse contract DTOs)
├── socket-auth.ts         # handshake auth middleware (JWT), per-namespace role gate
├── rooms.ts               # namespace + room name builders (no magic strings)
└── realtime-gateway.ts    # initRealtimeGateway(io): bus → room emits, + connection wiring
```

---

## 3. Reference implementations

### A. `socket.types.ts` — end-to-end typed events (reuse the contract)

```typescript
import type {
  JWTPayload,
  PendingActivationDTO,
  ClientActivationStatus,
} from '@my-app/contract';

// Server → client: identical names + payloads to the bus/contract events.
export interface ServerToClientEvents {
  'activation:created': (p: PendingActivationDTO) => void;
  'activation:taken': (p: { activationId: string; timestamp: string }) => void;
  'activation:client-updated': (p: { activationId: string; timestamp: string }) => void;
  'activation:frozen': (p: { activationId: string; timestamp: string }) => void;
  'activation:resolved': (p: { activationId: string; outcome: string; timestamp: string }) => void;
  'activation:status-changed': (p: { activationId: string; status: ClientActivationStatus; timestamp: string }) => void;
}

// Client → server: only the public client subscribes to its own activation room.
export interface ClientToServerEvents {
  subscribe: (activationId: string) => void;
  unsubscribe: (activationId: string) => void;
}

export interface InterServerEvents {}        // empty until multi-node (see §9)
export interface SocketData { user?: JWTPayload }
```

> **Recommended small Stage-1 touch-up:** put these three event interfaces in the contract (e.g. `common/realtime.ts`, reusing the existing activation DTOs) so the **frontend imports the exact same types**. It's additive — no breaking change to what you already shipped. If you'd rather not reopen Stage 1, keep this file backend-side; the payloads still come from contract DTOs, so only the interface mapping is duplicated.

### B. `socket.ts` — the singleton

```typescript
import { Server as IOServer } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import { env } from '../../env';
import type {
  ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData,
} from './socket.types';

export type AppIOServer =
  IOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

let io: AppIOServer | undefined;

export const createSocketServer = (httpServer: HttpServer): AppIOServer => {
  io = new IOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
    httpServer,
    {
      path: env.WS_PATH,
      cors: { origin: env.CORS_ORIGIN }, // token is in handshake.auth, not cookies → no credentials
      pingInterval: 25_000,
      pingTimeout: 20_000,
      // transports default to ['polling','websocket'] → automatic fallback
    },
  );
  return io;
};

export const getIO = (): AppIOServer => {
  if (!io) throw new Error('Socket server not initialized');
  return io;
};
```

### C. `rooms.ts` — names, never literals

```typescript
export const NS = {
  CLIENT: '/client',
  ACTIVATORS: '/activators',
  ADMIN: '/admin',
} as const;

export const rooms = {
  activation: (activationId: string) => `activation:${activationId}`,
  activator: (activatorId: string) => `activator:${activatorId}`,
  ADMIN_BELL: 'admin', // single room inside the /admin namespace
} as const;
```

### D. `socket-auth.ts` — handshake guard (mirrors `requireAuth`, for sockets)

```typescript
import type { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../../env';
import { JWTPayloadSchema, UserRole } from '@my-app/contract';

// Socket.IO namespace middleware. Auth errors surface to the client as `connect_error`.
export const authNamespace =
  (roles: UserRole[]) =>
  (socket: Socket, next: (err?: Error) => void): void => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error('UNAUTHORIZED'));
      const payload = JWTPayloadSchema.parse(jwt.verify(token, env.JWT_SECRET));
      if (!roles.includes(payload.role)) return next(new Error('FORBIDDEN'));
      socket.data.user = payload;
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  };
```

### E. `realtime-gateway.ts` — the bus → socket bridge

```typescript
import { z } from 'zod';
import { eventBus } from '../events/event-bus';
import { logger } from '../config/logger';
import { NS, rooms } from './rooms';
import type { AppIOServer } from './socket';

const ActivationIdSchema = z.uuid();

export const initRealtimeGateway = (io: AppIOServer): void => {
  const clientNs = io.of(NS.CLIENT);
  const activatorNs = io.of(NS.ACTIVATORS);
  const adminNs = io.of(NS.ADMIN);

  // --- connection wiring (which rooms a socket joins) ---
  activatorNs.on('connection', (socket) => {
    const userId = socket.data.user?.id;
    if (userId) void socket.join(rooms.activator(userId)); // personal "bell" room
    // pending-pool events broadcast to the whole namespace — no extra room needed
  });

  adminNs.on('connection', (socket) => {
    void socket.join(rooms.ADMIN_BELL);
  });

  clientNs.on('connection', (socket) => {
    // Public namespace: capability = possessing the non-guessable activation UUID.
    socket.on('subscribe', (activationId) => {
      const parsed = ActivationIdSchema.safeParse(activationId);
      if (parsed.success) void socket.join(rooms.activation(parsed.data));
    });
    socket.on('unsubscribe', (activationId) => {
      const parsed = ActivationIdSchema.safeParse(activationId);
      if (parsed.success) void socket.leave(rooms.activation(parsed.data));
    });
  });

  // --- bus → socket bridge (guarded so a bad emit can never crash the process) ---
  const safe = (fn: () => void, evt: string) => {
    try { fn(); } catch (err) { logger.error({ err, evt }, 'Realtime emit failed'); }
  };

  eventBus.on('activation:created', (p) =>
    safe(() => activatorNs.emit('activation:created', p), 'activation:created'));

  eventBus.on('activation:taken', (p) =>
    safe(() => activatorNs.emit('activation:taken', { activationId: p.activationId, timestamp: p.timestamp }), 'activation:taken'));

  eventBus.on('activation:client-updated', (p) =>
    safe(() => activatorNs.to(rooms.activator(p.activatorId)).emit('activation:client-updated', { activationId: p.activationId, timestamp: p.timestamp }), 'activation:client-updated'));

  eventBus.on('activation:frozen', (p) =>
    safe(() => adminNs.to(rooms.ADMIN_BELL).emit('activation:frozen', p), 'activation:frozen'));

  eventBus.on('activation:resolved', (p) =>
    safe(() => activatorNs.to(rooms.activator(p.activatorId)).emit('activation:resolved', { activationId: p.activationId, outcome: p.outcome, timestamp: p.timestamp }), 'activation:resolved'));

  eventBus.on('activation:status-changed', (p) =>
    safe(() => clientNs.to(rooms.activation(p.activationId)).emit('activation:status-changed', p), 'activation:status-changed'));

  logger.info('Realtime gateway initialized');
};
```

---

## 4. Modifications to existing files

### `package.json` (§1 deps)
Add `socket.io`. Dev: `socket.io-client` (integration tests). Optional, only when you scale past one instance (§9): `@socket.io/redis-adapter`, `ioredis`.

### `src/env.ts` (and `.env.example` / `env-template.md`)
Add one variable; reuse the existing `CORS_ORIGIN` and `JWT_SECRET`.

```typescript
// add to envSchema
WS_PATH: z.string().default('/socket.io'),
// REDIS_URL: z.url().optional(),   // uncomment only when running >1 instance (§9)
```

`.env.example` add:
```bash
# Realtime
WS_PATH="/socket.io"
```

> With socket auth carried in `handshake.auth.token` (not cookies), CORS credentials aren't needed, so `CORS_ORIGIN` can stay as-is. Set it to the real frontend origin in production rather than `*`.

### `src/common/events/event-bus.ts`
Widen `AppEvents` to include the contract's activation events so the gateway's `eventBus.on('activation:…')` calls are type-checked:

```typescript
import type { UserEvents, ActivationEvents } from '@my-app/contract';
type AppEvents = UserEvents & ActivationEvents;
```

### `src/server.ts` (replaces the §11 listener)
`app.ts` is unchanged — Socket.IO attaches at the **server** layer, not the Express app. Create an explicit HTTP server, attach IO, gate the authed namespaces, init the gateway, and close IO first on shutdown.

```typescript
import { createServer } from 'node:http';
import { app } from './app';
import { env } from './env';
import { prisma } from './common/db/prisma';
import { logger } from './common/config/logger';
import { createSocketServer } from './common/realtime/socket';
import { authNamespace } from './common/realtime/socket-auth';
import { initRealtimeGateway } from './common/realtime/realtime-gateway';
import { NS } from './common/realtime/rooms';
import { UserRole } from '@my-app/contract';

const httpServer = createServer(app);
const io = createSocketServer(httpServer);

io.of(NS.ACTIVATORS).use(authNamespace([UserRole.ACTIVATOR]));
io.of(NS.ADMIN).use(authNamespace([UserRole.ADMIN]));
// NS.CLIENT is public — no auth middleware

initRealtimeGateway(io);

async function main(): Promise<void> {
  await prisma.$connect();
  httpServer.listen(env.PORT, () => logger.info(`API listening on ${env.PORT}`));
}

function shutdown(signal: string): void {
  logger.info({ signal }, 'Shutting down');
  io.close(); // stop accepting sockets, disconnect clients
  httpServer.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

void main();
```

### `back-end-rules.md` §11 (boot sequence) — note
Append to the `server.ts` description: "wrap `app` in `http.createServer`, attach the Socket.IO server, apply namespace auth, and `initRealtimeGateway(io)`; graceful shutdown closes `io` before the HTTP server."

---

## 5. Namespace & room model

| Namespace | Auth | On connect joins | Receives |
|-----------|------|------------------|----------|
| `/client` | Public | `activation:{id}` after a validated `subscribe` | `activation:status-changed` for that activation |
| `/activators` | JWT, role `ACTIVATOR` | `activator:{userId}` (personal bell) | namespace-wide: `activation:created`, `activation:taken`; personal: `activation:client-updated`, `activation:resolved` |
| `/admin` | JWT, role `ADMIN` | `admin` (bell) | `activation:frozen` |

## 6. Event → destination (the gateway routing table)

| Bus event | Destination | Purpose |
|-----------|-------------|---------|
| `activation:created` | `/activators` (all) | new request in the pending pool |
| `activation:taken` | `/activators` (all) | remove a request from others' pools |
| `activation:client-updated` | `/activators` → `activator:{activatorId}` | bell: client corrected info / sent OTP |
| `activation:frozen` | `/admin` → `admin` | bell: a request needs admin resolution |
| `activation:resolved` | `/activators` → `activator:{activatorId}` | admin resolved this activator's frozen request |
| `activation:status-changed` | `/client` → `activation:{activationId}` | client portal live status |

---

## 7. Best practices (the "and so on")

1. **Emit after commit, never inside the transaction.** The Activation service (Sub-02) must put `eventBus.emit(...)` *after* the Prisma transaction resolves — otherwise clients can be told about a state that then rolls back. (Worth restating in `module-implementation-rules.md`.)
2. **The gateway holds no business logic.** It maps events to rooms and nothing else. No DB calls, no decisions. If a destination needs computing, the payload carries it (that's why the bus payloads include `activatorId`).
3. **Single source of truth for event shapes.** Socket events reuse the contract event names/payloads. Don't invent a parallel set of socket-only strings — that's how FE/BE drift.
4. **Validate inbound socket messages.** The only client→server message is `subscribe`/`unsubscribe`; validate the id with `z.uuid()` before joining a room. Never `socket.join(arbitraryClientString)` unchecked.
5. **Capability, not enumeration.** The public client joins `activation:{id}` only by presenting the non-guessable activation UUID it already holds. The room only carries lifecycle status (no account data), so possession of the id is sufficient authorization — consistent with the REST `/keys/:activationId/*` capability model.
6. **Token expiry vs long-lived sockets.** The access JWT is 15 min; a socket outlives it. Validate at the **handshake** only; when the client refreshes its token it reconnects with the new one (Socket.IO reconnection re-runs the handshake). Don't try to keep a socket alive past its token by skipping re-auth on reconnect.
7. **Heartbeat + reconnection are configured, not coded.** `pingInterval`/`pingTimeout` on the server; reconnection with backoff is the client default. The frontend specs' "reconnecting…" toast hangs off Socket.IO's `disconnect`/`reconnect` events.
8. **Polling fallback is free + REST backup exists.** Socket.IO falls back to long-polling automatically; the client portal additionally has the REST `GET /keys/:activationId/status` endpoint as a hard fallback if sockets are blocked entirely.
9. **Guard every emit.** Wrap bridge handlers in try/catch and log via Pino — an `EventEmitter` listener that throws would otherwise take down the process. (Done in the reference `safe()` wrapper.)
10. **No `console.*`, no `process.env`** in the realtime layer either — same as the rest of `common/`.
11. **Rate-limit the public namespace** (optional but recommended): cap connections/`subscribe` calls per IP to blunt abuse on the unauthenticated `/client` namespace. A simple per-socket counter or an IP middleware suffices.

---

## 8. Connection lifecycle (frontend contract, for reference)

- Authed clients connect with `io('<origin>/activators', { auth: { token } })`; on `connect_error` with message `UNAUTHORIZED`/`FORBIDDEN`, redirect to login.
- Public client connects to `/client`, then emits `subscribe(activationId)` after `verify`/`submit` returns the id; emits `unsubscribe` on "Check Another Key".
- All clients rely on built-in reconnection; on `reconnect`, re-emit `subscribe` (client) or simply resume (authed rooms are rejoined in the namespace `connection` handler).

---

## 9. Horizontal scaling (when, and only when, you need it)

Everything above is correct for a **single backend instance**, which is almost certainly your scale. The moment you run **two or more** instances behind a load balancer, two things break and must be fixed together:
- A socket connected to instance B won't receive an event emitted on instance A → add the **Socket.IO Redis adapter** (`@socket.io/redis-adapter` + `ioredis`, using the `REDIS_URL` already reserved in `env-template.md`) so emits fan out across instances.
- The in-process `eventBus` only fires on the instance that ran the mutation → either keep all socket emits behind the Redis adapter (so it doesn't matter which instance emits) or move the bus itself onto Redis pub/sub.

Until then: **do not add Redis.** It's complexity you don't need yet. Just keep `INTERSERVER`/`REDIS_URL` reserved so the upgrade is additive.

---

## 10. Testing (add to the Sub-01 harness)

One integration test proves the whole bridge: connect a typed `socket.io-client`, emit a bus event, assert the socket receives it in the right room.

```typescript
// test/integration/realtime/gateway.spec.ts  (sketch)
import { io as Client } from 'socket.io-client';
import { eventBus } from '@common/events/event-bus';
// boot the http+io server on an ephemeral port in a beforeAll, close in afterAll

it('routes activation:status-changed to the client room', async () => {
  const client = Client(`${baseUrl}/client`);
  await new Promise((r) => client.on('connect', r));
  client.emit('subscribe', activationId); // a valid uuid from a factory

  const received = new Promise((resolve) =>
    client.on('activation:status-changed', resolve));

  eventBus.emit('activation:status-changed', { activationId, status: 'PROCESSING', timestamp: new Date().toISOString() });

  await expect(received).resolves.toMatchObject({ activationId, status: 'PROCESSING' });
  client.close();
});
```

Cover at minimum: (a) status-changed reaches the subscribed client room and **not** other rooms; (b) an authed namespace rejects a missing/invalid token (`connect_error`); (c) a frozen event reaches the admin room. Use the existing factories from `test/data`; no hardcoded ids.

---

## 11. Anti-patterns

1. **Business logic in the gateway** — it routes events, period. No DB, no branching on domain rules.
2. **A service importing `getIO()`** — services emit to the bus only; they must not know sockets exist.
3. **Emitting inside the transaction** — emit after commit.
4. **Parallel socket event names** — reuse the contract event types; don't invent `new_pending_request`-style strings on one side only.
5. **Unvalidated `socket.join`** — always validate the inbound id.
6. **Adding Redis "to be safe"** — only when you actually run >1 instance.
7. **Re-auth skipped on reconnect** — the handshake must re-validate the (possibly refreshed) token.

---

## 12. Sprint addition — Stage 02 · Sub-01

Append one sprint to `sprints.md` (it depends on the event bus from Sprint 2 and the bootloader from Sprint 4):

````markdown
### Sprint 5: Realtime Gateway   — Status: ⬜ Pending

**Goals**
- Socket.IO attached to the HTTP server, three namespaces (public client, authed activator, authed admin), and the bus→socket bridge.

**Tasks**
- [ ] Deps: add `socket.io` (+ dev `socket.io-client`).
- [ ] Env: add `WS_PATH`; widen `AppEvents` in `event-bus.ts` to include `ActivationEvents`.
- [ ] Impl: `common/realtime/socket.types.ts`, `socket.ts`, `rooms.ts`, `socket-auth.ts`, `realtime-gateway.ts`.
- [ ] Modify: `server.ts` (http.createServer + attach io + namespace auth + initRealtimeGateway + close io on shutdown).
- [ ] Test: `test/integration/realtime/gateway.spec.ts` — status-changed reaches the client room; authed namespace rejects a bad token; frozen reaches the admin room (factories only).

**Validation**
- [ ] `tsc --noEmit` clean; `npm run test:int` green.
- [ ] No business logic / no DB calls in `common/realtime/`; no service imports `getIO()`.
- [ ] No `console.*`; no `process.env` outside `env.ts`.
- [ ] Committed on green.
````

And add to `plan.md` Step 4 (or a new Step 5): "Realtime — Socket.IO server, namespaces + handshake auth, `initRealtimeGateway` bridging the event bus; graceful shutdown closes `io`."
