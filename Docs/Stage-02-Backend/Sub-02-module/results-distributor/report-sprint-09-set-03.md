# Report — Sprint 09 · Distributor — API (controller + wiring) · Set 03

**Date:** 2026-07-01
**Status:** ✅ Green & Committed

---

## What was built

Controller (6 handlers), routes (manual DI), wiring, integration + conformance.

### Files created

| File | Description |
|------|-------------|
| `Apps/api/src/modules/distributor/distributor.controller.ts` | 6 handlers; `req.user!.id` as `actorId` on create/update/toggle/delete; `201` create, `204` delete, `200` rest |
| `Apps/api/src/modules/distributor/distributor.routes.ts` | Manual DI; admin-only on all 6 routes; `validateRequest` per segment |
| `Apps/api/test/integration/distributor.integration.spec.ts` | 14 integration tests |

### Files modified

| File | Change |
|------|--------|
| `Apps/api/src/modules/index.ts` | Mounted `distributorRouter` at `DISTRIBUTOR_ROUTES.BASE` |
| `Apps/api/test/contract/routes.conformance.spec.ts` | Added `DistributorDetailResponseSchema` import + DISTRIBUTOR_ROUTES registration block (6 tests) + schema parse test |

---

## Validation

- `tsc --noEmit` — clean
- `npm run test:unit` — 591/591 passed (includes conformance)
- `npm run test:int` — 14/14 distributor tests passed (1 pre-existing admin failure unrelated)

---

## Constraints respected

- `actorId = req.user!.id` passed to service for all audited mutations
- `201` on create, `204` on delete (no body), `200` on all other endpoints
- Admin-gated on all 6 routes; contract route constants only
- Audit rows (`ADD_DISTRIBUTOR`, `CHANGE_DISTRIBUTOR_INFORMATION`, `CHANGE_DISTRIBUTOR_STAT`) verified via DB lookup in integration tests
- Commune mismatch → 400 verified in integration tests (create + update)
- Soft-delete leaves `deletedAt` set; second delete returns 404
