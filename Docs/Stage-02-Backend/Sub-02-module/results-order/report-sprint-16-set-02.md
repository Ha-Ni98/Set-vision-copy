# Sprint 16 — Activation API + Realtime (controller + wiring)

## Objective
Wire the activation service into HTTP by implementing the controller, registering two routers (public `keyRouter` + authed `activationRouter`), mounting them in the module index, and covering them with conformance, integration, and realtime tests.

## Files Created / Modified

### New files
- `Apps/api/src/modules/activation/activation.controller.ts` — 21 handlers (5 client, 11 activator, 5 admin)
- `Apps/api/src/modules/activation/activation.routes.ts` — `keyRouter` (public) + `activationRouter` (authed); static GET routes registered before `/:id` to prevent param-shadow
- `Apps/api/test/integration/activation.integration.spec.ts` — 26 integration tests

### Modified files
- `Apps/api/src/modules/index.ts` — mounted `keyRouter` on `/keys`, `activationRouter` on `/activations`
- `Apps/api/test/contract/routes.conformance.spec.ts` — added KEY_ROUTES registration (5 tests), ACTIVATION_ROUTES registration (16 tests), and ACTIVATION response schema parse tests (4 tests)
- `Apps/api/test/integration/realtime/gateway.spec.ts` — added 2 activation-specific realtime tests: `activation:taken` broadcast to activators, `activation:resolved` routed to specific activator room

## Key Design Decisions

### Two routers
`keyRouter` is public (no auth) and mounted on `/keys`. `activationRouter` requires auth and is mounted on `/activations`. This keeps the client-facing key flow unauthenticated while securing all activator/admin routes.

### Static-before-param routing
`GET_PENDING`, `GET_ACTIVE`, `GET_MY_HISTORY`, `GET_RECENT`, `GET_ALL` are all registered before `GET_BY_ID` (`/:id`) in `activationRouter`. Without this order, Express would match e.g. `/activations/pending` against `/:id` and call `getById('pending')` instead.

### `take` uses optimistic update (ConflictError for unknown IDs)
The service does `updateMany({ where: { id, activationStat: PENDING } })` — if 0 rows updated (either not found or not PENDING), it throws `ConflictError` (409). The integration test documents this behavior explicitly.

### Realtime gateway routing
- `activation:taken` → broadcast to entire `/activators` namespace (strips `activatorId` from payload)
- `activation:resolved` → routed to `rooms.activator(activatorId)` on `/activators` namespace (specific room)
- `activation:frozen` → broadcast to `rooms.ADMIN_BELL` on `/admin` namespace (existing test)

## Test Results

### Unit + Conformance (`npm run test:unit`)
**498 / 498 passed** — 91 conformance tests (including 25 new activation route/schema tests) + 407 unit tests.

### Integration (`npm run test:int`)
**130 / 131 passed** — 26 new activation integration tests all pass. 1 pre-existing failure: `DELETE /admins/:id > 409 — last enabled admin returns RESOURCE_CONFLICT` (admin.integration.spec.ts, present since before Sprint 16, unrelated to this sprint).

### TypeScript
`npx tsc --noEmit` — clean, no errors.
