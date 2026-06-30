---
sprint: 3
title: Guards (Middleware)
status: ✅ Done
commit: ca1284c
---

# Sprint 3 Report — Guards (Middleware)

## Work done

### L3 — Request augmentation
| File | Notes |
|---|---|
| `src/@types/express.d.ts` | Augments `Express.Request` with `user?: JWTPayload` (from contract) and `validated: { body?, query?, params? }` — non-optional root, optional segments. No `@ts-ignore` anywhere. |

### L4 — Middlewares
| File | Notes |
|---|---|
| `src/common/middlewares/validate-request.middleware.ts` | `validateRequest(schemas)` — parses each present segment via Zod, writes coerced result to `req.validated`; forwards any thrown error (including `ZodError`) to `next(err)` |
| `src/common/middlewares/auth.middleware.ts` | `requireAuth({ roles?, checkDB? })` — extracts Bearer token, `jwt.verify` + `JWTPayloadSchema.parse`; optional `checkDB` path queries `prisma.user.findUnique` selecting `role` + `isEnabled` (`!isEnabled → AuthError('Account disabled')`); optional role gate; wraps `jwt.JsonWebTokenError` → `AuthError('Invalid token')` |
| `src/common/middlewares/error.middleware.ts` | `globalErrorHandler` — `AppError` → envelope with that error's statusCode/code; `ZodError` → 400 + `VALIDATION_ERROR` + `err.issues`; generic `Error` → `logger.error(...)` + 500 + `INTERNAL_SERVER_ERROR`. Pino only, no `console.*`. |

### Tests
| File | Cases |
|---|---|
| `test/unit/middleware/validate-request.middleware.spec.ts` | (a) valid body → `req.validated.body`; (b) `z.coerce.number()` in query string → typed number in `req.validated.query`; (c) invalid input → `ZodError` forwarded to `next` |
| `test/unit/middleware/auth.middleware.spec.ts` | (1) missing header → `AuthError`; (2) malformed token → `AuthError('Invalid token')`; (3) valid token, no checkDB → `req.user` set; (4) checkDB + `isEnabled: false` → `AuthError('Account disabled')`; (5) `roles: [ADMIN]` vs ACTIVATOR → `ForbiddenError`. Prisma mocked with `vi.mock`; tokens minted with real `token.utils` |
| `test/unit/middleware/error.middleware.spec.ts` | (1) `AppError` → correct statusCode + envelope; (2) `ZodError` → 400 `VALIDATION_ERROR`; (3) generic `Error` → `logger.error` called + 500 `INTERNAL_SERVER_ERROR`. Logger mocked with `vi.mock`. |

## Validation results
- `tsc --noEmit` ✅ clean (0 errors) — no `@ts-ignore`, no `as any` around `req.user`/`req.validated`
- `npm run test:unit` ✅ 34/34 tests pass (10 files: 3 new + 7 from Sprints 1–2)

## Decisions & deviations
- **`auth.middleware.ts` `checkDB` path**: uses `{ ...payload, role: fresh.role as UserRole }` spread instead of mutating `payload.role`, keeping `req.user` assignment a single clear statement.
- **`isEnabled` check**: the sprint spec and actual schema (`isEnabled Boolean`) win over the `back-end-rules.md` §7.B example which incorrectly references a `status` field — the schema is the source of truth.
- **`vi.mock('@common/db/prisma', ...)` in auth test**: top-level static mock so Vitest can hoist it; followed by top-level `await import(...)` to get the mocked instance. All 5 required cases pass.
- **`vi.mock('@common/config/logger', ...)` in error test**: replaces the Pino instance with a plain object of `vi.fn()` stubs to assert `logger.error` is called without bootstrapping the real Pino logger in tests.
