# Sprint 4 Report — Auth: API (controller + wiring)

**Status:** ✅ Done  
**Date:** 2026-06-30

## What was done

- `Apps/contract/src/common/errors.ts` — added `RATE_LIMITED = 'RATE_LIMITED'` to `ErrorCode` enum.
- `src/common/middlewares/rate-limit.middleware.ts` (FC-7) — `loginRateLimiter`: 5-attempt / 5-min window; `skipSuccessfulRequests: true` (only failed logins count); key = `ipKeyGenerator(req.ip):username`; error body matches `ApiResponse` error shape with `ErrorCode.RATE_LIMITED`; applies only on `LOGIN`.
- `src/modules/auth/auth.controller.ts` — 4 thin handlers (`login`/`refresh` → `sendSuccess 200`, `logout` → `204 send()`, `me` reads `req.user`); all `try/catch → next`.
- `src/modules/auth/auth.routes.ts` — composition root: manual DI (`new AuthService(prisma)` → `new AuthController(service)`); routes:
  - `POST LOGIN`: `loginRateLimiter`, `validateRequest({ body: LoginSchema })`, `controller.login`
  - `POST REFRESH`: `validateRequest({ body: RefreshTokenSchema })`, `controller.refresh`
  - `POST LOGOUT`: `requireAuth()`, `validateRequest({ body: RefreshTokenSchema })`, `controller.logout`
  - `GET ME`: `requireAuth()`, `controller.me`
- `src/modules/index.ts` — mounted `authRouter` at `AUTH_ROUTES.BASE` (`/auth`).
- `test/setup.ts` — updated default `DATABASE_URL` fallback to point at `setvision_test` on localhost:5432 (test DB provisioned).
- `test/integration/auth.integration.spec.ts` — 13 integration tests: login 200 (tokens + lastLoginAt); 401 for wrong password, disabled, and unknown user (all identical body); refresh rotates + old token → 401; refresh unknown → 401; logout 204 + idempotent; logout missing auth → 401; `/me` 401 missing/invalid JWT; `/me` 200 admin; `/me` 200 activator; 429 after 5 failed attempts.
- `test/contract/routes.conformance.spec.ts` — 6 new assertions: all 4 `AUTH_ROUTES` registered (not 404); `AuthTokensResponseSchema` and `SessionUserResponseSchema` parse valid shapes.
- `package.json` — added `express-rate-limit ^8.5.2`.

## Validation

- `tsc --noEmit`: clean
- `npm run test:unit`: **105/105 passed** (+6 conformance tests)
- `npm run test:int`: **17/17 passed** (+13 auth integration tests)
- Rate limiter only on `LOGIN`; `skipSuccessfulRequests: true`; IPv6-safe via `ipKeyGenerator`.
- Routes use `AUTH_ROUTES` constants; controller reads `req.validated.body`; `req.user` from `requireAuth`.
