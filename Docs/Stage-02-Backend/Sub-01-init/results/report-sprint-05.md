---
sprint: 5
title: Realtime Gateway
status: ✅ Done
commit: tbd
---

# Sprint 5 Report — Realtime Gateway

## Work done

### L6 — Realtime layer (`src/common/realtime/`)
| File | Notes |
|---|---|
| `socket.types.ts` | `ServerToClientEvents` (6 activation events → function signatures reusing contract DTOs/payloads), `ClientToServerEvents` (`subscribe`/`unsubscribe`), `InterServerEvents = {}`, `SocketData = { user?: JWTPayload }`. Local to backend — contract already exports socket interfaces but with `ClientToServerEvents = Record<string, never>` (no subscribe/unsubscribe). |
| `socket.ts` | `createSocketServer(httpServer)` → typed `AppIOServer` with `path: env.WS_PATH`, `cors: { origin: env.CORS_ORIGIN }`, `pingInterval: 25_000`, `pingTimeout: 20_000`. Module-scoped `io` + `getIO()` throws if uninitialized. Exports `AppIOServer` type alias for use in other realtime files. |
| `rooms.ts` | `NS = { CLIENT: '/client', ACTIVATORS: '/activators', ADMIN: '/admin' }` and `rooms = { activation(id), activator(id), ADMIN_BELL: 'admin' }`. No magic strings anywhere else. |
| `socket-auth.ts` | `authNamespace(roles)` — extracts `socket.handshake.auth.token`, `jwt.verify` → `JWTPayloadSchema.parse` → role gate → `socket.data.user = payload`; failures surface as `next(new Error('UNAUTHORIZED'|'FORBIDDEN'))`. Typed with `AppSocket` using all four socket generic params to avoid implicit `any` on `socket.data`. |
| `realtime-gateway.ts` | `initRealtimeGateway(io)`: connection handlers join correct rooms (activator personal bell, admin bell, client activation room via validated `z.uuid()` subscribe/unsubscribe); 6 `eventBus.on(...)` handlers bridging all `ActivationEvents` to the correct namespace/room, each wrapped in `safe()` (try/catch + `logger.error`). Logs "Realtime gateway initialized" on boot. |

### L7 (final) — `src/server.ts`
Supersedes the Sprint 4 body. `http.createServer(app)` → `createSocketServer(httpServer)` → namespace auth middleware for `/activators` (ACTIVATOR role) and `/admin` (ADMIN role) → `initRealtimeGateway(io)` → `prisma.$connect()` inside `main()` → `httpServer.listen(env.PORT)`. Shutdown: `io.close()` first → `httpServer.close(cb)` → `prisma.$disconnect()` → `process.exit(0)`.

### Tests
| File | Cases |
|---|---|
| `test/integration/realtime/gateway.spec.ts` | (a) `/client` subscribed to `activationId` receives `activation:status-changed` for that id but NOT for a different id; (b) `/activators` rejects no-token connection with `UNAUTHORIZED` and wrong-role token with `FORBIDDEN`; (c) `/admin` client in `ADMIN_BELL` room receives `activation:frozen` after `eventBus.emit(...)`. Uses `faker` for ids, `mintToken` from auth fixture for tokens — no hardcoded values. |

## Validation results
- `tsc --noEmit` ✅ clean (0 errors — no `any`, no `@ts-ignore`)
- `npm run test:unit` ✅ 34/34 (all Sprints 1–3 specs still green)
- `npm run test:int` ✅ 4/4 (`health.spec.ts` + `gateway.spec.ts`)
- `madge --circular src` ✅ no circular dependencies (20 files checked)

## Decisions & deviations
- **`socket-auth.ts` typed socket**: used a local `AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>` alias so `socket.data.user` is typed as `JWTPayload | undefined` rather than `any` — avoids an implicit `any` that `strict: true` would otherwise flag.
- **`socket.handshake.auth?.['token']`**: used bracket notation to satisfy `noUncheckedIndexedAccess` on the `auth` object (which is typed as `{ [key: string]: any }`).
- **Gateway test delays**: used `delay(100ms)` after `subscribe` emit to give the server time to process the async `socket.join` before emitting on the event bus. Conservative but reliable; 80ms proved sufficient in practice.
- **`reconnection: false` in auth test clients**: prevents socket.io-client from retrying after `connect_error`, which would make the test hang waiting for a second error.
- **`io.close()` before `httpServer.close()`** in test `afterAll`: ensures all socket.io connections are cleanly terminated before the HTTP server closes, matching the production shutdown sequence.
