---
sprint: 4
title: Boot (HTTP)
status: ✅ Done
commit: tbd
---

# Sprint 4 Report — Boot (HTTP)

## Work done

### L5 — App pipeline
| File | Notes |
|---|---|
| `src/app.ts` | Express app assembled (no listener). Pipeline order: `pino-http({ logger })` → `helmet()` → `cors({ origin: env.CORS_ORIGIN })` → `express.json()` → `GET /health` (returns `sendSuccess(res, { status: 'ok' })`) → empty `express.Router()` mounted at `env.API_PREFIX` → `globalErrorHandler` last. No pino config here — imports `logger` from `@common/config/logger`. |

### L7 (minimal) — Server entry point
| File | Notes |
|---|---|
| `src/server.ts` | Minimal first cut (Sprint 5 supersedes this body). Calls `app.listen(env.PORT)` and `prisma.$connect()` on start; SIGTERM/SIGINT handlers close the HTTP server then `prisma.$disconnect()`. No `http.createServer` / no Socket.IO — those land in Sprint 5. |

### Tests
| File | Cases |
|---|---|
| `test/integration/health.spec.ts` | `GET /health` → status 200, body `{ success: true, data: { status: 'ok' } }`. Uses Supertest against the imported `app` — no `server.listen`, no DB needed. |

## Validation results
- `tsc --noEmit` ✅ clean (0 errors)
- `npm run test:unit` ✅ 34/34 tests pass (10 files — all Sprints 1–3 specs still green)
- `npm run test:int` ✅ 1/1 integration test passes (hermetic, no DB required by `/health`)

## Decisions & deviations
- **`server.ts` boot order**: `app.listen` is called before `prisma.$connect()` (in `main()`). This is safe because no route in this sprint touches the DB. Sprint 5 restructures this to `prisma.$connect()` → `httpServer.listen` inside `main()`.
- **Empty router at `API_PREFIX`**: `express.Router()` with no routes is a no-op; it exists so the mount point is declared and later sprints (Sub-02) can slot in module routers without touching `app.ts`.
- **Integration test runs without a real DB**: `/health` is stateless, so `test:int` passes even without `docker-compose.test.yml` running. The test-DB requirement kicks in starting Sprint 5 (realtime gateway test does not touch DB either, but future integration tests will).
