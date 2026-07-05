# Stage 02 · Sub-01 · Phase 01 — Backend Initialization Plan

The "big bang" of the backend: create the `apps/api` workspace, the framework layer, coding standards, and the test harness. **No feature modules. No code yet — this phase produces a plan.**

---

## Objective

Plan a production-ready Express/TypeScript skeleton with strict env validation, Pino logging, robust error handling, the `ApiResponse` envelope, a typed event bus, and a complete Vitest test environment.

---

## Context & Inputs

- **Contract:** `@my-app/contract` (built in Stage 01) — source of truth for routes, schemas, DTOs, error codes, event types.
- **Database:** `prisma/schema.prisma`.
- **Rules:** `back-end-rules.md` and `realtime-rules.md` (structure, env, Pino, single auth guard, envelope, conformance and websocket).
- **Test rules:** `test-rules.md` (test-DB isolation, folder structure, factories).
- **Constraint:** core infrastructure only — no `src/modules/` content.

---

## Steps

### Step 1 — Foundation (zero-dependency layer)
- Scaffold `apps/api/src/...` and `package.json` (deps from `back-end-rules.md` §1).
- Scaffold test folders: `test/data`, `test/fixtures`, `test/unit`, `test/integration`, `test/contract`.
- `tsconfig.json` (strict + aliases) and `test:unit` / `test:int` scripts.
- `src/env.ts` (Zod validator — full schema, crashes on invalid) + a unit test proving it exits on missing vars.
- `src/common/errors/` classes.
- `src/common/db/prisma.ts` singleton.

### Step 2 — Framework layer
- `config/logger.ts` (Pino, reads `env.LOG_LEVEL`).
- `http/response.ts` (`sendSuccess` envelope helper).
- `events/event-bus.ts` (typed over contract event types).
- `utils/password.utils.ts`, `utils/token.utils.ts` (uses `env.JWT_EXPIRATION`).
- Test foundations: `fixtures/db.fixture.ts` (guarded reset), `data/user.factory.ts`, unit tests for utils.

### Step 3 — Guard layer (middleware)
- `@types/express.d.ts` (augment `Request` with `user`, `validated`).
- `validate-request.middleware.ts` (per-segment, writes to `req.validated`).
- `auth.middleware.ts` (`requireAuth` — single guard, optional `checkDB`).
- `error.middleware.ts` (envelope errors, logs via Pino).
- `pino-http` logger middleware.
- Unit tests for middleware, using the factories from Step 2.

### Step 4 — Bootloader
- `app.ts` (pipeline: pino-http → helmet/cors → json → `/health` → routes at `env.API_PREFIX` → error handler last).
- `server.ts` (prisma connect, listen, graceful shutdown).
- Smoke check: `GET /health` returns 200.

---

## Expected Outputs

- A detailed plan file: **`/docs/stage-02-backend/sub-01-init/results/plan.md`** listing every file, its dependency order, and its test.
