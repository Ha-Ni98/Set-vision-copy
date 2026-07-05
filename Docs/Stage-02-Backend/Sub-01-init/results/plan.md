---
stage: 02
sub: 01
phase: 01
title: Backend Initialization — Detailed File Plan
status: ready-for-sprints
---

# Stage 02 · Sub-01 · Phase 01 — Detailed File Plan

The exhaustive blueprint for the `Apps/api/` (package `@my-app/api`) skeleton: every file the substage will produce, its dependencies (so build order is unambiguous), and the test that proves it works. **Planning only — no code is produced in this phase.**

> Workspace path note: the repo uses `Apps/` (capital A) at the root. The rules files call it `apps/api/` and that is the canonical reference; the only difference is the on-disk casing. All paths below are relative to that workspace root.

---

## 0. Sources Locked In

| Input | Resolved location | What we take from it |
|---|---|---|
| Contract | `Apps/contract/src/**` exporting from `index.ts` | `ApiResponse<T>`, `ErrorCode`, `JWTPayloadSchema` + `JWTPayload`, `UserRole`, route constants, all DTO schemas, `ActivationEvents`, `ClientActivationStatus`, `PendingActivationDTO` |
| DB schema | `Docs/Stage-00-Conception/schema.prisma` (copied to `Apps/api/prisma/schema.prisma`) | Enums (`UserRole`, `ActivationStat`, …) and tables. Auth guard reads `User.role` + `User.isEnabled` (note: the schema uses `isEnabled: Boolean`, not a `status` enum — the rules' example `status === 'BANNED'` becomes `isEnabled === false` here). |
| Rules | `back-end-rules.md`, `test-rules.md`, `realtime-rules.md` | Folder layout, env schema, envelope shape, middleware contract, test harness, realtime gateway |

**No `src/modules/` content** is produced — the folder is created empty and committed with a `.gitkeep`.

---

## 1. Layered Build Order (the dependency DAG)

The order below is the build order. Anything in a layer may depend only on **earlier** layers — never the same layer, never later. This is what makes `common/` independent of `modules/` and what guarantees no circular imports.

```
L0  Workspace config           ──►  L1  Foundation (zero-dep code)
                                       ├─ env.ts
                                       ├─ common/errors/*
                                       └─ common/db/prisma.ts
                                              │
                                              ▼
                              L2  Framework layer
                                  ├─ common/config/logger.ts        (uses env)
                                  ├─ common/http/response.ts        (uses contract)
                                  ├─ common/events/event-bus.ts     (uses contract)
                                  └─ common/utils/{password,token}  (uses env)
                                              │
                                              ▼
                              L3  Type augmentation
                                  └─ @types/express.d.ts            (uses contract)
                                              │
                                              ▼
                              L4  Middleware
                                  ├─ validate-request.middleware.ts (uses zod)
                                  ├─ auth.middleware.ts             (uses env, prisma, errors, contract)
                                  └─ error.middleware.ts            (uses errors, logger, contract)
                                              │
                                              ▼
                              L5  HTTP bootloader
                                  └─ app.ts                         (pipeline only)
                                              │
                                              ▼
                              L6  Realtime (framework, not module)
                                  ├─ realtime/socket.types.ts
                                  ├─ realtime/socket.ts             (uses env)
                                  ├─ realtime/rooms.ts
                                  ├─ realtime/socket-auth.ts        (uses env, contract)
                                  └─ realtime/realtime-gateway.ts   (uses event-bus, logger, rooms, socket types)
                                              │
                                              ▼
                              L7  Process entry
                                  └─ server.ts                      (uses app, env, prisma, logger, realtime)
```

Tests live in `Apps/api/test/` and depend only on the layer they target plus the factory/fixture helpers in `test/data` and `test/fixtures`.

---

## 2. Files — full inventory

The "Test" column names the spec file that covers it. Sprint assignment matches `back-end-rules.md` and the realtime rules' Sprint 5; the actual sprint breakdown is finalized in Phase 02.

### L0 — Workspace config (no logic, must exist before anything else)

| # | File | Purpose | Depends on | Test |
|---|---|---|---|---|
| 0.1 | `Apps/api/package.json` | Declare `@my-app/api`, deps from `back-end-rules.md` §1 + realtime add-on §4: `express`, `prisma`, `@prisma/client`, `zod`, `pino`, `pino-pretty`, `pino-http`, `helmet`, `cors`, `jsonwebtoken`, `bcrypt`, `socket.io`. Dev: `typescript`, `vitest`, `supertest`, `socket.io-client`, `@faker-js/faker`, `tsx`, `@types/*`. Workspace dep: `@my-app/contract` (`"workspace:*"` or relative). Scripts: `dev`, `build`, `start`, `test`, `test:unit`, `test:int`, `prisma:*`. | — | n/a (validated by every other test passing) |
| 0.2 | `Apps/api/tsconfig.json` | `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, ESM module resolution, path aliases `@common/*`, `@modules/*`, `@my-app/contract`. | — | implicit: `tsc --noEmit` in CI |
| 0.3 | `Apps/api/.env.example` | Template, **no secrets**: `NODE_ENV`, `PORT`, `API_PREFIX`, `DATABASE_URL`, `TEST_DATABASE_URL`, `CORS_ORIGIN`, `JWT_SECRET` (placeholder long enough), `JWT_EXPIRATION`, `LOG_LEVEL`, `WS_PATH`. `REDIS_URL` left commented per `realtime-rules.md` §9. | — | n/a |
| 0.4 | `Apps/api/prisma/schema.prisma` | Copy of `Docs/Stage-00-Conception/schema.prisma`. Source of truth for the DB. | — | implicit: Prisma client generation succeeds; integration tests run migrations. |
| 0.5 | `Apps/api/vitest.config.ts` | Vitest config: `globals: false`, `environment: 'node'`, resolve aliases mirroring `tsconfig`, separate `include` patterns picked via the `test:unit`/`test:int` scripts. | — | implicit: tests run |
| 0.6 | `Apps/api/docker-compose.test.yml` | Local Postgres for `test:int` per `test-rules.md` §1. | — | implicit: `test:int` brings it up |
| 0.7 | `Apps/api/src/modules/.gitkeep` | Keep the empty modules folder committed. | — | n/a |

### L1 — Foundation (zero-dep app code)

| # | File | Purpose | Depends on | Test |
|---|---|---|---|---|
| 1.1 | `src/env.ts` | Zod env schema from `back-end-rules.md` §2 + `WS_PATH` from `realtime-rules.md` §4. Crashes on invalid (`process.exit(1)` via `z.treeifyError`). Exports the typed `env` object — **the only file allowed to read `process.env`**. | zod | `test/unit/env.spec.ts` |
| 1.2 | `src/common/errors/app-error.ts` | `class AppError extends Error` carrying `statusCode: number`, `code: ErrorCode`, optional `details: unknown`. | `@my-app/contract` (`ErrorCode`) | covered by 1.3's barrel + middleware tests |
| 1.3 | `src/common/errors/index.ts` | Subclasses + barrel: `AuthError` (401, `AUTH_UNAUTHORIZED`), `ForbiddenError` (403, `AUTH_FORBIDDEN`), `NotFoundError` (404, `RESOURCE_NOT_FOUND`), `ConflictError` (409, `RESOURCE_CONFLICT`), `BadRequestError` (400, `VALIDATION_ERROR`). Re-exports `AppError`. | 1.2, contract `ErrorCode` | `test/unit/common/errors.spec.ts` (instanceOf + status/code mapping) |
| 1.4 | `src/common/db/prisma.ts` | `export const prisma = new PrismaClient()` singleton. Nothing else. | `@prisma/client` | not unit-tested directly; exercised by integration + auth guard test |

**Test for L1**

- `test/unit/env.spec.ts` — Two cases: (a) a valid env stub parses cleanly and exposes typed values; (b) a missing `JWT_SECRET` (or one shorter than 32 chars) causes the module load to exit with non-zero. Uses `vi.spyOn(process, 'exit')` to intercept rather than killing the runner; re-imports `env.ts` per case with `vi.resetModules()`.
- `test/unit/common/errors.spec.ts` — Each subclass: `instanceof AppError`, correct `statusCode`, correct `ErrorCode` value from the contract.

### L2 — Framework layer

| # | File | Purpose | Depends on | Test |
|---|---|---|---|---|
| 2.1 | `src/common/config/logger.ts` | Pino instance with `level: env.LOG_LEVEL`, `pino-pretty` transport only in `development`, redact `req.headers.authorization` + `req.body.password`. | 1.1, pino | smoke-tested via middleware tests; no dedicated spec (logger is config, not logic) |
| 2.2 | `src/common/http/response.ts` | `sendSuccess<T>(res, data, status=200)` that writes `{ success: true, data }` typed as `ApiResponse<T>`. | contract (`ApiResponse`) | `test/unit/common/http/response.spec.ts` |
| 2.3 | `src/common/events/event-bus.ts` | Typed wrapper over `EventEmitter`, with `AppEvents = UserEvents & ActivationEvents` per `realtime-rules.md` §4. `emit` / `on` methods are generic over `keyof AppEvents`. Exports a single `eventBus` instance. | contract (event types), `node:events` | `test/unit/common/events/event-bus.spec.ts` |
| 2.4 | `src/common/utils/password.utils.ts` | Pure: `hashPassword(plain): Promise<string>` and `comparePassword(plain, hash): Promise<boolean>` wrapping bcrypt. | bcrypt | `test/unit/common/utils/password.utils.spec.ts` |
| 2.5 | `src/common/utils/token.utils.ts` | Pure: `generateToken(payload)` using `env.JWT_SECRET` + `env.JWT_EXPIRATION`; `verifyToken(token)` returning the raw decoded payload (the middleware does schema validation). | 1.1, jsonwebtoken | `test/unit/common/utils/token.utils.spec.ts` |

**Test foundations (must land here so L4+ can use them)**

| # | File | Purpose | Depends on | Test |
|---|---|---|---|---|
| 2.T1 | `test/fixtures/db.fixture.ts` | `resetDatabase()` that **refuses to run** unless `NODE_ENV === 'test'`, then truncates every table `RESTART IDENTITY CASCADE`. Per `test-rules.md` §5. | 1.4 (prisma singleton) | `test/unit/test-helpers/db.fixture.spec.ts` (asserts the guard throws when `NODE_ENV !== 'test'`) |
| 2.T2 | `test/fixtures/auth.fixture.ts` | `mintToken({ id, role })` calling the real `generateToken` so integration suites can authenticate. | 2.5 | implicit: integration suites |
| 2.T3 | `test/data/user.factory.ts` | `createUserPayload(overrides)`: returns Faker-shaped data matching the contract's user shape (username + password). | `@faker-js/faker`, contract | implicit: used by middleware unit tests |

**Test for L2**

- `test/unit/common/http/response.spec.ts` — Builds a fake `Response` with `vi.fn()` spies for `status` and `json`; asserts `sendSuccess(res, { hi: 1 })` calls `res.status(200)` and `res.json({ success: true, data: { hi: 1 } })`. Type test: assigns the payload to `ApiResponse<{ hi: number }>`.
- `test/unit/common/events/event-bus.spec.ts` — Subscribes to `'activation:status-changed'`, emits with a valid payload, awaits the handler, asserts the payload matches. Compile-time guarantee: an emit with a wrong-shape payload would fail `tsc --noEmit` (covered in CI).
- `test/unit/common/utils/password.utils.spec.ts` — Hash a string; `compare` returns true with the original and false with a different string.
- `test/unit/common/utils/token.utils.spec.ts` — Generate token from `{ id: <uuid>, role: 'ADMIN' }`; verify decodes back to the same payload; expired token (`expiresIn: '0s'`) throws.

### L3 — Type augmentation

| # | File | Purpose | Depends on | Test |
|---|---|---|---|---|
| 3.1 | `src/@types/express.d.ts` | Declares `Express.Request.user?: JWTPayload` and `Request.validated: { body?, query?, params? }`. Includes `export {};` to keep it a module. | contract (`JWTPayload`) | implicit: middleware unit tests cease to typecheck if it's missing |

### L4 — Middleware

| # | File | Purpose | Depends on | Test |
|---|---|---|---|---|
| 4.1 | `src/common/middlewares/validate-request.middleware.ts` | `validateRequest({ body?, query?, params? })` parses each segment with the given Zod schema and writes the coerced output to `req.validated`. Forwards `ZodError` to `next(err)` (handled by 4.3). Per `back-end-rules.md` §7.A. | 3.1, zod | `test/unit/middleware/validate-request.middleware.spec.ts` |
| 4.2 | `src/common/middlewares/auth.middleware.ts` | `requireAuth({ roles?, checkDB? })`. JWT verify → `JWTPayloadSchema.parse` → optional DB freshness (`prisma.user.findUnique` selecting `role` + `isEnabled`; if `isEnabled === false` throw `AuthError`; refresh `payload.role` from DB) → optional role gate → set `req.user`. Wraps `jwt.JsonWebTokenError` into `AuthError`. | 1.1, 1.3, 1.4, 3.1, contract (`JWTPayloadSchema`, `UserRole`) | `test/unit/middleware/auth.middleware.spec.ts` |
| 4.3 | `src/common/middlewares/error.middleware.ts` | `globalErrorHandler`: `AppError` → `{ success:false, error:{ code, message, details } }` with `err.statusCode`; `ZodError` → 400 `VALIDATION_ERROR` with `err.issues`; anything else → `logger.error(...)` then 500 `INTERNAL_SERVER_ERROR`. Last middleware in the chain. | 1.3, 2.1, contract (`ErrorCode`) | `test/unit/middleware/error.middleware.spec.ts` |

**Test for L4**

- `test/unit/middleware/validate-request.middleware.spec.ts` — (a) Valid body parses and writes to `req.validated.body`; (b) `z.coerce.number()` in a query schema produces a typed number in `req.validated.query` from a string `req.query`; (c) invalid input forwards a `ZodError` to `next`.
- `test/unit/middleware/auth.middleware.spec.ts` — Five cases: (a) missing header → `AuthError('Missing token')`; (b) malformed token → `AuthError('Invalid token')` (the `JsonWebTokenError` wrap); (c) valid token without `checkDB` → `req.user` populated; (d) `checkDB: true` with `isEnabled: false` → `AuthError('Account disabled')`; (e) `roles: ['ADMIN']` against `role: 'ACTIVATOR'` → `ForbiddenError`. Prisma is mocked via `vi.mock`; tokens are minted with the real `token.utils` so we exercise the actual sign/verify pipeline.
- `test/unit/middleware/error.middleware.spec.ts` — (a) `AppError` → matches envelope shape with that error's `statusCode` and `code`; (b) `ZodError` → 400 + `VALIDATION_ERROR` + `details: err.issues`; (c) `new Error('boom')` → 500 + `INTERNAL_SERVER_ERROR` and `logger.error` is spied/called.

### L5 — HTTP bootloader

| # | File | Purpose | Depends on | Test |
|---|---|---|---|---|
| 5.1 | `src/app.ts` | Express app pipeline only (no listening): `pino-http` (built from `logger`) → `helmet()` → `cors({ origin: env.CORS_ORIGIN })` → `express.json()` → `GET /health` (returns `sendSuccess(res, { status: 'ok' })`) → routes mounted at `env.API_PREFIX` (empty in this substage — left as a TODO/no-op router) → `globalErrorHandler` last. **No logger creation here** — imports from `config/logger`. | 2.1, 2.2, 4.3 | `test/integration/health.spec.ts` |

**Test for L5**

- `test/integration/health.spec.ts` — Supertest hits `GET /health` against the imported `app`, asserts `res.status === 200` and `res.body` matches the `ApiResponse` envelope: `{ success: true, data: { status: 'ok' } }`.

### L6 — Realtime (framework, not module — per `realtime-rules.md`)

| # | File | Purpose | Depends on | Test |
|---|---|---|---|---|
| 6.1 | `src/common/realtime/socket.types.ts` | Typed `ServerToClientEvents`, `ClientToServerEvents` (`subscribe`/`unsubscribe`), `InterServerEvents = {}`, `SocketData = { user?: JWTPayload }`. Payloads reused from contract DTOs (`PendingActivationDTO`, the activation payload schemas, `ClientActivationStatus`). | contract | implicit: typecheck + 6.5 tests |
| 6.2 | `src/common/realtime/socket.ts` | `createSocketServer(httpServer)` returning the typed `IOServer` with `path: env.WS_PATH`, `cors: { origin: env.CORS_ORIGIN }`, `pingInterval: 25_000`, `pingTimeout: 20_000`. Module-scoped `io` + `getIO()` (throws if uninitialized). | 1.1, 6.1, socket.io | not unit-tested directly; covered by the integration spec 6.5T |
| 6.3 | `src/common/realtime/rooms.ts` | `NS = { CLIENT: '/client', ACTIVATORS: '/activators', ADMIN: '/admin' }`, `rooms.activation(id)`, `rooms.activator(id)`, `rooms.ADMIN_BELL = 'admin'`. No magic strings anywhere else. | — | implicit |
| 6.4 | `src/common/realtime/socket-auth.ts` | `authNamespace(roles: UserRole[])` handshake middleware: extracts `socket.handshake.auth.token`, verifies with `jwt`, validates with `JWTPayloadSchema`, gates on roles, sets `socket.data.user`. Auth failure → `next(new Error('UNAUTHORIZED'))` (becomes `connect_error` on the client). | 1.1, contract, jsonwebtoken | covered by 6.5T case (b) |
| 6.5 | `src/common/realtime/realtime-gateway.ts` | `initRealtimeGateway(io)`: namespace-`connection` handlers that join the right rooms (`/activators` → personal bell, `/admin` → `ADMIN_BELL`, `/client` → validated `subscribe`/`unsubscribe` with `z.uuid()`). Then `eventBus.on(...)` for each `ActivationEvents` key, each emit wrapped in `safe()` (try/catch + `logger.error`). The routing table is exactly the one in `realtime-rules.md` §6. | 2.3, 2.1, 6.1, 6.3 | `test/integration/realtime/gateway.spec.ts` |

**Test for L6**

- `test/integration/realtime/gateway.spec.ts` — boots `http.createServer(app)` on an ephemeral port, attaches IO, applies namespace auth, calls `initRealtimeGateway(io)`. Cases:
  - **(a)** A `socket.io-client` connected to `/client` and subscribed to `activation:{uuid}` receives `activation:status-changed` for that id and **does not** receive an emission for a different id.
  - **(b)** A client connecting to `/activators` with no token or a bad token fails with `connect_error` whose message is `UNAUTHORIZED`; a token for `role: USER` fails with `FORBIDDEN`.
  - **(c)** An admin-namespace client receives `activation:frozen` (in `ADMIN_BELL`) after `eventBus.emit('activation:frozen', { activationId, timestamp })`.
  - Uses `test/data/user.factory.ts` for ids and `test/fixtures/auth.fixture.ts` for tokens — no hardcoded values.

### L7 — Process entry

| # | File | Purpose | Depends on | Test |
|---|---|---|---|---|
| 7.1 | `src/server.ts` | `http.createServer(app)` → `createSocketServer(httpServer)` → apply `authNamespace([UserRole.ACTIVATOR])` to `NS.ACTIVATORS` and `[UserRole.ADMIN]` to `NS.ADMIN` (NS.CLIENT is public) → `initRealtimeGateway(io)` → `await prisma.$connect()` → `httpServer.listen(env.PORT)`. `SIGTERM`/`SIGINT`: close `io` first, then `httpServer.close(cb)`, then `prisma.$disconnect()`, then `process.exit(0)`. | every layer above | smoke check: `npm run dev` then `curl /health` returns 200 (validation step, not a spec) |

### L8 — Contract conformance

| # | File | Purpose | Depends on | Test |
|---|---|---|---|---|
| 8.1 | `test/contract/routes.conformance.spec.ts` | Skeleton spec that imports every route-constant object from the contract (`AUTH_ROUTES`, `USER_ROUTES`, …) and asserts the file loads. Real route-coverage assertions are deferred to Sub-02 when routes are actually mounted, but the harness must exist now so each new sprint can append to it without scaffolding. | contract | itself |

---

## 3. Test harness summary (collected from L1–L7)

```text
Apps/api/test/
├── data/
│   └── user.factory.ts                            # 2.T3
├── fixtures/
│   ├── db.fixture.ts                              # 2.T1
│   └── auth.fixture.ts                            # 2.T2
├── unit/
│   ├── env.spec.ts                                # covers 1.1
│   ├── common/
│   │   ├── errors.spec.ts                         # covers 1.2 + 1.3
│   │   ├── http/response.spec.ts                  # covers 2.2
│   │   ├── events/event-bus.spec.ts               # covers 2.3
│   │   └── utils/
│   │       ├── password.utils.spec.ts             # covers 2.4
│   │       └── token.utils.spec.ts                # covers 2.5
│   ├── middleware/
│   │   ├── validate-request.middleware.spec.ts    # covers 4.1
│   │   ├── auth.middleware.spec.ts                # covers 4.2
│   │   └── error.middleware.spec.ts               # covers 4.3
│   └── test-helpers/
│       └── db.fixture.spec.ts                     # covers 2.T1 guard
├── integration/
│   ├── health.spec.ts                             # covers 5.1
│   └── realtime/gateway.spec.ts                   # covers 6.2/6.4/6.5
└── contract/
    └── routes.conformance.spec.ts                 # 8.1 (skeleton)
```

`test:unit` runs `test/unit` + `test/contract` (fast, no DB). `test:int` runs `test/integration` with `NODE_ENV=test` after `docker-compose.test.yml` is up + `prisma migrate deploy` against `TEST_DATABASE_URL`.

---

## 4. Cross-cutting decisions captured here so sprints don't re-litigate them

1. **`isEnabled` vs `status`.** The Prisma schema uses `User.isEnabled: Boolean`; the rules' example referenced a `status` enum. The auth guard's `checkDB` branch reads `isEnabled` and treats `false` as "account disabled" (throws `AuthError`). A `status` column is **not** introduced in this substage.
2. **Event bus payload widening.** From day one, `AppEvents = UserEvents & ActivationEvents`. `UserEvents` is exported by the contract (or will be — see step 0.1 if it's not yet, in which case we widen to `ActivationEvents` only and revisit when user events land). This avoids touching `event-bus.ts` again in Sprint 5.
3. **Public CORS for the realtime layer.** Token rides in `socket.handshake.auth.token`, so cookies/credentials are not needed; `CORS_ORIGIN` stays the existing env value.
4. **Redis is not added.** `REDIS_URL` is reserved in `.env.example` (commented) per `realtime-rules.md` §9 — single-instance design only.
5. **`/health` is part of the bootloader, not a module.** It lives in `app.ts` so it works before any module exists and remains independent of `env.API_PREFIX` (mounted at the root, not under the prefix).
6. **`modules/` stays empty.** A `.gitkeep` keeps the directory under version control; no route files, no service files. Sub-02 will populate it.
7. **No `console.*`. No `process.env` outside `src/env.ts`.** Including in `realtime/`.

---

## 5. Per-step output checklist (mirrors the Phase-01 plan's Steps 1–4 + realtime)

### Step 1 — Foundation
- [ ] 0.1 `package.json` (deps from §1)
- [ ] 0.2 `tsconfig.json` (strict + aliases)
- [ ] 0.3 `.env.example`
- [ ] 0.4 `prisma/schema.prisma` (copied)
- [ ] 0.5 `vitest.config.ts`
- [ ] 0.6 `docker-compose.test.yml`
- [ ] 0.7 `src/modules/.gitkeep`
- [ ] 1.1 `src/env.ts` + `test/unit/env.spec.ts`
- [ ] 1.2 + 1.3 `src/common/errors/{app-error.ts,index.ts}` + `test/unit/common/errors.spec.ts`
- [ ] 1.4 `src/common/db/prisma.ts`

### Step 2 — Framework
- [ ] 2.1 `src/common/config/logger.ts`
- [ ] 2.2 `src/common/http/response.ts` + spec
- [ ] 2.3 `src/common/events/event-bus.ts` + spec
- [ ] 2.4 + 2.5 utils + specs
- [ ] 2.T1–2.T3 test foundations (factories + fixtures) + db.fixture guard spec

### Step 3 — Guard layer (middleware)
- [ ] 3.1 `src/@types/express.d.ts`
- [ ] 4.1 `validate-request.middleware.ts` + spec
- [ ] 4.2 `auth.middleware.ts` + spec
- [ ] 4.3 `error.middleware.ts` + spec
- [ ] pino-http hookup confirmed inside `app.ts` (Step 4)

### Step 4 — Bootloader
- [ ] 5.1 `src/app.ts` (pipeline) + `test/integration/health.spec.ts`
- [ ] 7.1 `src/server.ts` (listener + graceful shutdown — completed in Step 5 below since realtime attaches at this layer)
- [ ] Smoke: `GET /health` returns 200 envelope.

### Step 5 — Realtime (added per `realtime-rules.md` §12)
- [ ] 6.1–6.5 realtime files
- [ ] 7.1 final `server.ts` (http.createServer + IO attach + namespace auth + gateway init + close-io-first shutdown)
- [ ] `test/integration/realtime/gateway.spec.ts` (3 cases above)

### Step 6 — Contract conformance scaffold
- [ ] 8.1 `test/contract/routes.conformance.spec.ts` (skeleton)

---

## 6. Validation gates (must pass before this sub-stage closes)

- [ ] `tsc --noEmit` clean across `Apps/api/`.
- [ ] `npm run test:unit` green.
- [ ] `npm run test:int` green against `TEST_DATABASE_URL` (Docker test DB up + migrated).
- [ ] `madge --circular` (or equivalent) clean inside `Apps/api/src` — `common/` does **not** import from `modules/`; nothing imports from `server.ts`.
- [ ] No `console.*` in `src/**`. No `process.env` read outside `src/env.ts`.
- [ ] `GET /health` works via `npm run dev`.
- [ ] No business-logic file under `src/modules/` (only `.gitkeep`).
