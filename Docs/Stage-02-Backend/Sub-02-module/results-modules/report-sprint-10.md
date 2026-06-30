# Sprint 10 Report — Activator: API (controller + wiring)

**Status:** ✅ Done  
**Date:** 2026-06-30

## What was done

- `src/modules/activator/activator.controller.ts` — 9 thin handlers: `getAll` (200), `create` (201), `getById` (200), `update` (200), `toggle` (200), `resetPassword` (200), `delete` (204), `performance` (200), `myStats` (200); `req.user!.id` as `actorId` for mutations and as `principalUserId` for `myStats`; `try/catch → next`.
- `src/modules/activator/activator.routes.ts` — composition root: manual DI; `activatorOnly = requireAuth({ roles: [ACTIVATOR] })` on `MY_STATS`; `adminOnly = requireAuth({ roles: [ADMIN] })` on all other 8 routes; `MY_STATS` registered **before** `/:id` routes to prevent Express matching `me` as a UUID param; `validateRequest` per route segment.
- `src/modules/index.ts` — mounted `activatorRouter` at `ACTIVATOR_ROUTES.BASE` (`/activators`).
- `test/integration/activator.integration.spec.ts` — 19 integration tests:
  - GET list: 200 admin / 403 activator.
  - POST create: 201 + one-time pw + no password field / 409 dup username.
  - GET by id: 200 with ActivatorDetailDTO (successRate, totalPaid, creditsOwed) / 404 unknown.
  - PATCH update: 200 + mutated field / 409 username collision / 404 unknown.
  - POST toggle: 200 + flipped `isEnabled` / 404 unknown.
  - POST reset-password: 200 + new pw / 404 unknown.
  - GET /me/stats: 200 activator (7-slot weekly array) / 403 admin.
  - GET /:id/performance: 200 with `series` array / 404 unknown.
  - DELETE: 204 soft-delete (row hidden on subsequent get) / 404 unknown.
- `test/contract/routes.conformance.spec.ts` — 11 new assertions: all 9 `ACTIVATOR_ROUTES` registered (401 not 404); `ActivatorDetailResponseSchema` and `ActivatorDashboardResponseSchema` parse valid shapes.
- `vitest.integration.config.ts` — new config with `fileParallelism: false`; integration test files now run sequentially to prevent cross-file DB state races. `package.json` `test:int` script updated to use it.

## Validation

- `tsc --noEmit`: clean
- `npm run test:unit`: **206/206 passed** (+11 conformance assertions)
- `npm run test:int`: **53/53 passed** (+19 activator integration tests; sequential file execution fixed pre-existing admin last-admin-guard race)
- `/me/stats` resolves before `/:id`; role gates correct (activator for myStats, admin for all others); conformance covers Auth + Admin + Activator route sets.
