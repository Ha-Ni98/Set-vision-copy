---
stage: 02
sub: 01
phase: 02
title: Backend Initialization — Sprint Plan
status: ready-for-execute
---

# Stage 02 · Sub-01 · Phase 02 — Sprint Plan

Six sprints, dependency-ordered, each shipping its layer **with its tests**. Each sprint can be merged independently because the layer it produces is only consumed by later sprints.

> **Sprint count deviation (declared up front, not a conflict).** `stage-02-sub-01-phase-02-sprints.md` suggests a 4-sprint shape; the plan splits Step 4 (boot) from Step 5 (realtime), and `realtime-rules.md` §12 *explicitly mandates* "Sprint 5: Realtime Gateway". Plan-level Step 6 (the contract-conformance scaffold) is small but useful to gate as its own sprint so the conformance harness exists before Sub-02 starts adding routes. Phase-02 explicitly invites this: *"Suggested shape (adjust to the plan)"*. Net: 6 sprints, one per layer.
>
> **Contract pre-check.** Before any "Impl" task below, every type/enum/route it references was verified to exist in `Apps/contract/src/`:
> - `ApiResponse<T>`, `PaginationMeta`, `paginated` — `common/types.ts`
> - `ErrorCode` — `common/errors.ts`
> - `JWTPayload`, `JWTPayloadSchema` — `common/auth.ts`
> - `UserRole` — `modules/user/user.enums.ts`
> - `ActivationEvents`, `ClientActivationStatus`, `PendingActivationDTO`, payload schemas — `modules/activation/`
> - Route constants (`AUTH_ROUTES`, …) — each module's `*.routes.ts`
>
> No new types/enums/routes are declared inside `Apps/api/`. The only contract dependency that does **not** appear in the current contract (`grep` confirmed) is `UserEvents` (referenced in `realtime-rules.md` §4 as `UserEvents & ActivationEvents`). Per precedence (HOW conflicts → rules win, but the contract governs WHICH), Sprint 2 widens `AppEvents` to `ActivationEvents` only. The intersection with `UserEvents` is left as a TODO in `event-bus.ts` to be flipped on as soon as the contract exports it; this is a one-line edit, no callers change.

---

## Sprint Sequencing (dependency view)

```
S1 Foundation        scaffold + env + errors + prisma singleton          (L0 + L1)
   └─►  S2 Framework      logger + response + event bus + utils + fixtures (L2)
        └─►  S3 Guards        Request augmentation + 3 middlewares          (L3 + L4)
             └─►  S4 Boot          app.ts + /health integration test         (L5 + minimal L7)
                  └─►  S5 Realtime    socket layer + bus bridge + final server  (L6 + final L7)
                       └─►  S6 Conformance  contract route-load scaffold       (L8)
```

A sprint may only depend on artifacts produced by earlier sprints. The plan's "Depends on" column was the source of truth for placement.

---

### Sprint 1: Foundation — Status: ⬜ Pending

**Goals**
- A bootable, type-strict workspace at `Apps/api/` with the env validator (crash-on-invalid), the error class hierarchy, and the Prisma singleton. **No HTTP, no middleware, no logger.** This sprint produces nothing that needs running — only things that need compiling and one unit test.

**Tasks**
- [ ] Scaffold: `Apps/api/package.json` (plan §0.1: full prod + dev deps incl. `socket.io` reserved for Sprint 5, `socket.io-client` dev; workspace dep on `@my-app/contract`; scripts `dev`, `build`, `start`, `test`, `test:unit`, `test:int`, `prisma:generate`, `prisma:migrate`).
- [ ] Scaffold: `Apps/api/tsconfig.json` (plan §0.2: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, ESM, aliases `@common/*`, `@modules/*`, `@my-app/contract`).
- [ ] Scaffold: `Apps/api/.env.example` (plan §0.3, includes `WS_PATH`; `REDIS_URL` commented per `realtime-rules.md` §9).
- [ ] Scaffold: `Apps/api/prisma/schema.prisma` — verbatim copy of `Docs/Stage-00-Conception/schema.prisma` (plan §0.4).
- [ ] Scaffold: `Apps/api/vitest.config.ts` (plan §0.5; alias resolution mirroring tsconfig).
- [ ] Scaffold: `Apps/api/docker-compose.test.yml` (plan §0.6 — local Postgres for `test:int`; not exercised until Sprint 4).
- [ ] Scaffold: empty `Apps/api/src/modules/` with `.gitkeep` (plan §0.7).
- [ ] Scaffold: empty `Apps/api/test/{data,fixtures,unit,integration,contract}/` with `.gitkeep` in each (so Sprint 2 can place test foundations without scaffolding).
- [ ] Impl: `src/env.ts` (plan §1.1, `back-end-rules.md` §2 + `WS_PATH` from `realtime-rules.md` §4). `process.exit(1)` on invalid via `z.treeifyError`. **Only file allowed to read `process.env`**.
- [ ] Impl: `src/common/errors/app-error.ts` (plan §1.2): `class AppError extends Error { statusCode, code: ErrorCode, details? }`.
- [ ] Impl: `src/common/errors/index.ts` (plan §1.3): `AuthError` 401 / `AUTH_UNAUTHORIZED`; `ForbiddenError` 403 / `AUTH_FORBIDDEN`; `NotFoundError` 404 / `RESOURCE_NOT_FOUND`; `ConflictError` 409 / `RESOURCE_CONFLICT`; `BadRequestError` 400 / `VALIDATION_ERROR`. Re-export `AppError`. All `ErrorCode` values **imported from contract** — no string literals.
- [ ] Impl: `src/common/db/prisma.ts` (plan §1.4): `export const prisma = new PrismaClient()`. Nothing else.
- [ ] Test: `test/unit/env.spec.ts` — (a) valid stub parses and exposes typed values; (b) missing/short `JWT_SECRET` causes `process.exit(1)`. Uses `vi.spyOn(process, 'exit')` + `vi.resetModules()` to re-import per case (does not actually kill the runner).
- [ ] Test: `test/unit/common/errors.spec.ts` — for each subclass: `instanceof AppError`, correct `statusCode`, correct contract `ErrorCode` value.

**Validation**
- [ ] `tsc --noEmit` clean.
- [ ] `npm run test:unit` — all new unit tests pass (only `env.spec.ts` + `errors.spec.ts` exist at this point).
- [ ] `npm run prisma:generate` succeeds (schema parses; client is generated).
- [ ] Files in correct folders per `back-end-rules.md` §1; no hardcoded data.
- [ ] No `console.*`; no `process.env` outside `src/env.ts`.
- [ ] No `src/modules/*.ts` business code — only `.gitkeep`.
- [ ] `madge --circular Apps/api/src` clean.
- [ ] Committed on green.

---

### Sprint 2: Framework — Status: ⬜ Pending

**Goals**
- The dependency-free "framework" services that every later layer consumes: Pino logger, success-envelope helper, typed event bus, password/token utils. Lands the **test foundations** (factories + fixtures) so Sprint 3 can write middleware tests without scaffolding.

**Tasks**
- [ ] Impl: `src/common/config/logger.ts` (plan §2.1) — Pino with `level: env.LOG_LEVEL`, `pino-pretty` transport only when `NODE_ENV === 'development'`, redact `req.headers.authorization` + `req.body.password`.
- [ ] Impl: `src/common/http/response.ts` (plan §2.2) — `sendSuccess<T>(res, data, status = 200)`. Body typed as `ApiResponse<T>` **imported from contract**.
- [ ] Impl: `src/common/events/event-bus.ts` (plan §2.3) — typed `EventEmitter` wrapper; `AppEvents = ActivationEvents` (see contract pre-check note above; widen with `UserEvents` when the contract exports it). Single exported `eventBus` instance.
- [ ] Impl: `src/common/utils/password.utils.ts` (plan §2.4) — `hashPassword`, `comparePassword` over bcrypt.
- [ ] Impl: `src/common/utils/token.utils.ts` (plan §2.5) — `generateToken` (uses `env.JWT_SECRET` + `env.JWT_EXPIRATION`); `verifyToken` (returns raw decoded payload; middleware does schema validation).
- [ ] Data: `test/data/user.factory.ts` (plan §2.T3) — `createUserPayload(overrides)` returning Faker-shaped, contract-shaped data (`username`, `password`).
- [ ] Fixture: `test/fixtures/db.fixture.ts` (plan §2.T1) — `resetDatabase()` that throws unless `process.env.NODE_ENV === 'test'`, then truncates all tables `RESTART IDENTITY CASCADE` against the test DB. (Allowed `process.env` read here: it's a test fixture, not `src/`.)
- [ ] Fixture: `test/fixtures/auth.fixture.ts` (plan §2.T2) — `mintToken({ id, role })` calls the real `generateToken` so integration suites authenticate via the real pipeline.
- [ ] Test: `test/unit/common/http/response.spec.ts` — `sendSuccess(res, { hi: 1 })` calls `res.status(200)` and `res.json({ success: true, data: { hi: 1 } })`.
- [ ] Test: `test/unit/common/events/event-bus.spec.ts` — subscribes to `'activation:status-changed'`, emits a valid payload, asserts the handler receives it. Type-safety is enforced compile-time (covered by CI `tsc --noEmit`).
- [ ] Test: `test/unit/common/utils/password.utils.spec.ts` — hash a string; `compare` returns true for the original, false for a different one.
- [ ] Test: `test/unit/common/utils/token.utils.spec.ts` — generate from `{ id: <uuid>, role: 'ADMIN' }`; verify returns the same payload; an expired token (`expiresIn: '0s'`) throws.
- [ ] Test: `test/unit/test-helpers/db.fixture.spec.ts` — `resetDatabase()` rejects when `NODE_ENV !== 'test'` (does **not** attempt to connect to the DB in this case).

**Validation**
- [ ] `tsc --noEmit` clean.
- [ ] `npm run test:unit` — every new unit spec passes; total spec count grows over Sprint 1.
- [ ] No spec hardcodes a user/payload; all test data comes from `test/data/user.factory.ts`.
- [ ] `logger.ts` reads only from `env`; no `process.env` outside `src/env.ts` (and the test fixture guard).
- [ ] No `console.*` anywhere in `src/`.
- [ ] No import from `src/modules/*` anywhere in `src/common/*`.
- [ ] Committed on green.

---

### Sprint 3: Guards (Middleware) — Status: ⬜ Pending

**Goals**
- The three middlewares (`validate-request`, `requireAuth`, global error handler) and the `Request` augmentation that lets them be typed without `@ts-ignore`. Every middleware ships with a unit test using the factories from Sprint 2.

**Tasks**
- [ ] Impl: `src/@types/express.d.ts` (plan §3.1) — augment `Express.Request` with `user?: JWTPayload` and `validated: { body?, query?, params? }`. `JWTPayload` imported from contract.
- [ ] Impl: `src/common/middlewares/validate-request.middleware.ts` (plan §4.1, `back-end-rules.md` §7.A) — parses each present schema and writes coerced output to `req.validated`. Forwards `ZodError` to `next(err)`.
- [ ] Impl: `src/common/middlewares/auth.middleware.ts` (plan §4.2, `back-end-rules.md` §7.B) — `requireAuth({ roles?, checkDB? })`: extract `Bearer`, `jwt.verify`, `JWTPayloadSchema.parse`, optional DB freshness (`prisma.user.findUnique` selecting `role` + `isEnabled`; **`isEnabled === false` → `AuthError('Account disabled')`** per plan §4 cross-cutting decision #1), optional role gate, set `req.user`. Wrap `jwt.JsonWebTokenError` → `AuthError('Invalid token')`.
- [ ] Impl: `src/common/middlewares/error.middleware.ts` (plan §4.3, `back-end-rules.md` §7.C) — `globalErrorHandler`: `AppError` → envelope with that error's `statusCode`/`code`/`details`; `ZodError` → 400 + `VALIDATION_ERROR` + `err.issues`; everything else → `logger.error(...)` + 500 + `INTERNAL_SERVER_ERROR`. Uses Pino, not `console`.
- [ ] Test: `test/unit/middleware/validate-request.middleware.spec.ts` — (a) valid body → `req.validated.body` populated; (b) `z.coerce.number()` in query → typed number in `req.validated.query` from a string `req.query` (sidesteps Express 5 read-only `req.query`); (c) invalid input → `ZodError` forwarded to `next`.
- [ ] Test: `test/unit/middleware/auth.middleware.spec.ts` — five cases per plan §4 test detail: missing header, malformed token, valid token w/o `checkDB`, `checkDB: true` w/ `isEnabled: false`, `roles: ['ADMIN']` against `role: 'ACTIVATOR'`. Prisma mocked with `vi.mock`; tokens minted with the real `token.utils`.
- [ ] Test: `test/unit/middleware/error.middleware.spec.ts` — three cases: `AppError`, `ZodError`, generic `Error` (asserts `logger.error` is called via a spy).

**Validation**
- [ ] `tsc --noEmit` clean — including that nothing uses `@ts-ignore`/`as any` around `req.user`/`req.validated`.
- [ ] `npm run test:unit` — middleware specs pass; existing specs from Sprints 1–2 still green.
- [ ] No DB call appears in any middleware **except** the explicit `requireAuth({ checkDB: true })` branch (`back-end-rules.md` §13.2).
- [ ] No `res.status(...).json(...)` inside middleware (each middleware throws an `AppError`/Zod or forwards to `next`).
- [ ] No `console.*`; error handler logs via Pino.
- [ ] No import from `src/modules/*`.
- [ ] Committed on green.

---

### Sprint 4: Boot (HTTP) — Status: ⬜ Pending

**Goals**
- The Express app is assembled (pipeline only — no listener here) and `GET /health` returns the envelope. A minimal `server.ts` lets `npm run dev` smoke-test, but the **realtime + graceful-shutdown final form lands in Sprint 5** (plan §5 explicitly defers it). One integration test asserts the `/health` envelope through Supertest.

**Tasks**
- [ ] Impl: `src/app.ts` (plan §5.1, `back-end-rules.md` §11) — pipeline order: `pino-http` (built from `logger`) → `helmet()` → `cors({ origin: env.CORS_ORIGIN })` → `express.json()` → `GET /health` (returns `sendSuccess(res, { status: 'ok' })`) → router mounted at `env.API_PREFIX` (empty no-op `Router()` in this substage) → `globalErrorHandler` last.
- [ ] Impl: `src/server.ts` (minimal first cut — superseded in Sprint 5): `await prisma.$connect()` → `app.listen(env.PORT, …)` → SIGTERM/SIGINT handlers that close the HTTP server then `prisma.$disconnect()`. **No `http.createServer` / no Socket.IO yet** — Sprint 5 replaces this body. Documented inline as a Sprint-5-supersession.
- [ ] Test: `test/integration/health.spec.ts` (plan §5 test detail) — Supertest against the imported `app`: `GET /health` → status 200, body `{ success: true, data: { status: 'ok' } }`. Does **not** need the DB or `server.listen`.

**Validation**
- [ ] `tsc --noEmit` clean.
- [ ] `npm run test:unit` — all unit specs from Sprints 1–3 still green.
- [ ] `npm run test:int` — `health.spec.ts` passes. (The integration suite is hermetic for this sprint — no DB needed by `/health` — so the test DB doesn't strictly need to be up, but the runner must execute the file.)
- [ ] `npm run dev` then `curl http://localhost:$PORT/health` returns the envelope; the process responds cleanly to `SIGINT` (smoke check).
- [ ] No `logger.createLogger(...)` or pino config in `app.ts` — only `import { logger } from '@common/config/logger'`.
- [ ] No raw `res.json(rawDto)` anywhere — only `sendSuccess` (`back-end-rules.md` §13.7).
- [ ] No import from `src/modules/*`.
- [ ] Committed on green.

---

### Sprint 5: Realtime Gateway — Status: ⬜ Pending

> Mandated by `realtime-rules.md` §12; depends on the event bus (Sprint 2), the global error handler (Sprint 3), and `app.ts` (Sprint 4).

**Goals**
- Socket.IO attached to the HTTP server, three namespaces (`/client` public, `/activators` JWT+role, `/admin` JWT+role), and the bus→socket bridge. `server.ts` reaches its final form (`http.createServer` + IO attach + namespace auth + `initRealtimeGateway` + close-IO-first shutdown).

**Tasks**
- [ ] Deps: confirm `socket.io` (prod) and `socket.io-client` (dev) are already in `package.json` from Sprint 1; install lockfile if not.
- [ ] Env: confirm `WS_PATH` is already in `env.ts`/`.env.example` from Sprint 1 (it is, per plan §1.1 / §0.3). When the contract exports `UserEvents`, widen `AppEvents` in `event-bus.ts` from `ActivationEvents` to `UserEvents & ActivationEvents` (one-line change; no callers break).
- [ ] Impl: `src/common/realtime/socket.types.ts` (plan §6.1) — `ServerToClientEvents`, `ClientToServerEvents` (`subscribe`/`unsubscribe`), `InterServerEvents = {}`, `SocketData = { user?: JWTPayload }`. All payloads reused from contract DTOs/payload schemas.
- [ ] Impl: `src/common/realtime/socket.ts` (plan §6.2) — `createSocketServer(httpServer)` returning the typed `IOServer` with `path: env.WS_PATH`, `cors: { origin: env.CORS_ORIGIN }`, `pingInterval: 25_000`, `pingTimeout: 20_000`. Module-scoped `io` + `getIO()` that throws if uninitialized.
- [ ] Impl: `src/common/realtime/rooms.ts` (plan §6.3) — `NS = { CLIENT, ACTIVATORS, ADMIN }`, `rooms.activation(id)`, `rooms.activator(id)`, `rooms.ADMIN_BELL`. No magic strings elsewhere.
- [ ] Impl: `src/common/realtime/socket-auth.ts` (plan §6.4) — `authNamespace(roles)` handshake middleware: token from `socket.handshake.auth.token`; `jwt.verify` → `JWTPayloadSchema.parse` → role gate → `socket.data.user = payload`. Failures surface as `next(new Error('UNAUTHORIZED' | 'FORBIDDEN'))`.
- [ ] Impl: `src/common/realtime/realtime-gateway.ts` (plan §6.5, `realtime-rules.md` §3.E + §6 routing table) — `initRealtimeGateway(io)`: namespace `connection` handlers join correct rooms (validated `subscribe`/`unsubscribe` with `z.uuid()` on `/client`); `eventBus.on(...)` for each `ActivationEvents` key wrapped in `safe()` (try/catch + `logger.error`).
- [ ] Modify: `src/server.ts` (plan §7.1, replaces Sprint 4 body) — `http.createServer(app)` → `createSocketServer(httpServer)` → `io.of(NS.ACTIVATORS).use(authNamespace([UserRole.ACTIVATOR]))`, same for `NS.ADMIN` with `UserRole.ADMIN` (NS.CLIENT public) → `initRealtimeGateway(io)` → `await prisma.$connect()` → `httpServer.listen(env.PORT)`. Shutdown: `io.close()` first → `httpServer.close(cb)` → `prisma.$disconnect()` → `process.exit(0)`.
- [ ] Test: `test/integration/realtime/gateway.spec.ts` (plan §6 test detail) — boots `http.createServer(app)` on an ephemeral port and attaches IO. Three cases:
  - (a) `/client` subscribed to `activation:{uuid}` receives `activation:status-changed` for that id; **does not** receive a different id's emission.
  - (b) `/activators` connection with no/bad token fails with `connect_error` message `UNAUTHORIZED`; a token for the wrong role fails with `FORBIDDEN`.
  - (c) `/admin` client (in `ADMIN_BELL`) receives `activation:frozen` after `eventBus.emit(...)`.
  - Uses `test/data/user.factory.ts` for ids and `test/fixtures/auth.fixture.ts` for tokens — no hardcoded values.

**Validation**
- [ ] `tsc --noEmit` clean.
- [ ] `npm run test:unit` — all prior unit specs still green.
- [ ] `npm run test:int` — `health.spec.ts` + `realtime/gateway.spec.ts` pass.
- [ ] `madge --circular Apps/api/src` clean. No file under `src/common/realtime/` imports from `src/modules/*` or calls `prisma`. No file outside `src/common/realtime/` and `src/server.ts` imports `getIO()`.
- [ ] No `console.*`; no `process.env` outside `env.ts`. Both rules apply to `common/realtime/` too (`realtime-rules.md` §7.10).
- [ ] Every bridge handler is wrapped in `safe()` (no raw `eventBus.on(...)` that could crash on a bad emit).
- [ ] `npm run dev` then a quick smoke: `GET /health` still 200; a `socket.io-client` connects to `/client` and the process responds to SIGINT (IO closes before HTTP).
- [ ] Committed on green.

---

### Sprint 6: Contract Conformance Scaffold — Status: ⬜ Pending

**Goals**
- Stand up the contract-conformance harness (skeleton only). No routes are mounted yet (modules are empty), so route-coverage assertions are deferred to Sub-02; what we need now is the file in the right folder, importing every route-constant module, so each Sub-02 sprint can append a single line per route without scaffolding.

**Tasks**
- [ ] Impl: `test/contract/routes.conformance.spec.ts` (plan §8.1, `test-rules.md` §7) — imports every route-constant export from the contract (`AUTH_ROUTES`, `USER_ROUTES`, `ADMIN_ROUTES`, `ACTIVATOR_ROUTES`, `ACTIVATION_ROUTES`, `CARD_ROUTES`, `LOT_ROUTES`, `SET_ROUTES`, `ORDER_ROUTES`, `PAYMENT_ROUTES`, `LOG_ROUTES`, `GEOGRAPHY_ROUTES`, `DELIVERY_COMPANY_ROUTES`, `DISTRIBUTOR_ROUTES`, `SUBSCRIPTION_PLAN_ROUTES`, `STATISTICS_ROUTES` — final names confirmed by `grep -r '_ROUTES = {' Apps/contract/src` during implementation). Asserts each `is typeof === 'object'` and `BASE` is defined. Route-vs-app coverage assertion is left as a TODO referencing Sub-02. (No new contract types declared — pure import.)

**Validation**
- [ ] `tsc --noEmit` clean.
- [ ] `npm run test:unit` — the new spec runs as part of `test/contract` (per `test-rules.md` §3 scripts) and passes.
- [ ] No `console.*`; spec uses Vitest's `expect`, not console asserts.
- [ ] Spec contains a TODO comment naming Sub-02 as the owner of the real route-coverage assertion (so future sprints know where to extend).
- [ ] Committed on green.

---

## Closing gates (must pass before Sub-01 is "done")

- [ ] `tsc --noEmit` clean across `Apps/api/`.
- [ ] `npm run test:unit` green (Sprints 1–3, 6 specs).
- [ ] `npm run test:int` green against `TEST_DATABASE_URL` with Docker test DB up + migrated (Sprints 4–5 specs).
- [ ] `madge --circular Apps/api/src` clean — `common/` does **not** import from `modules/`; no file outside `common/realtime/`+`server.ts` imports `getIO()`; nothing imports from `server.ts`.
- [ ] No `console.*` in `src/**`. No `process.env` read outside `src/env.ts` (test fixtures excepted by `test-rules.md` §5).
- [ ] No business-logic file under `src/modules/` — only `.gitkeep`.
- [ ] `GET /health` works via `npm run dev`; SIGINT closes IO then HTTP then disconnects Prisma.
