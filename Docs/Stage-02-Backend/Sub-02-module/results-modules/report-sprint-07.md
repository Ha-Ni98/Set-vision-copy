# Sprint 7 Report — Admin: API (controller + wiring)

**Status:** ✅ Done  
**Date:** 2026-06-30

## What was done

- `src/modules/admin/admin.controller.ts` — 7 thin handlers: `getAll` (200), `create` (201), `getById` (200), `update` (200), `toggle` (200), `resetPassword` (200), `delete` (204); `req.user!.id` as `actorId` for all mutations; `try/catch → next`.
- `src/modules/admin/admin.routes.ts` — composition root: manual DI; `adminOnly = requireAuth({ roles: [ADMIN] })` applied to all 7 routes; `validateRequest` per route segment (`query`/`body`/`params`).
- `src/modules/index.ts` — mounted `adminRouter` at `ADMIN_ROUTES.BASE` (`/admins`).
- `test/integration/admin.integration.spec.ts` — 17 integration tests:
  - GET list: 200 admin / 403 activator.
  - POST create: 201 + one-time pw + no password field / 409 dup username.
  - GET by id: 200 / 404 unknown.
  - PATCH update: 200 + mutated field / 409 collision / 404 unknown.
  - POST toggle: 200 + flipped `isEnabled` / 404 unknown.
  - POST reset-password: 200 + new pw / 404 unknown.
  - DELETE: 403 self / 409 last-admin / 204 soft-delete (row hidden on subsequent get) / 404 unknown.
- `test/contract/routes.conformance.spec.ts` — 9 new assertions: all 7 `ADMIN_ROUTES` registered (401 not 404); `AdminResponseSchema` and `AdminWithCredentialsResponseSchema` parse valid shapes.

## Validation

- `tsc --noEmit`: clean
- `npm run test:unit`: **144/144 passed** (+9 conformance tests)
- `npm run test:int`: **34/34 passed** (+17 admin integration tests)
- All routes gated by `requireAuth({ roles: [ADMIN] })`; `generatedPassword` never appears in `AdminDTO`; only in `AdminWithCredentialsDTO` (create) and `AdminGeneratedPasswordDTO` (reset).
