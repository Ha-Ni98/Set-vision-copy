# Sprint 06 Report — Lot API (controller + wiring)

**Module set:** Set · Lot · Order · Card · Activation (Set 02)
**Sprint:** 6 — Lot API
**Status:** ✅ Green

---

## Deliverables

### Source files created/modified
- `apps/api/src/modules/lot/lot.controller.ts` — 4 thin handlers (`getAll`, `getAvailableForOrder`, `create`, `delete`); `201`/`200`/`204`; `try/catch → next`.
- `apps/api/src/modules/lot/lot.routes.ts` — composition root; `GET_AVAILABLE_FOR_ORDER` registered **before** `DELETE` (`/:id`); manual DI; `adminOnly` on all; `LOT_ROUTES` constants.
- `apps/api/src/modules/index.ts` — mounted `lotRouter` at `LOT_ROUTES.BASE` (`/lots`).

### Test files created/modified
- `test/integration/lot.integration.spec.ts` — 8 integration tests: create (201 + cards IN_LOT, 400 non-PRINTED card, 409 already-assigned, 403 non-admin), available-for-order (200 PENDING/RETURNED only), delete (204 + revert + log, 409 non-PENDING, 404 unknown).
- `test/contract/routes.conformance.spec.ts` — extended: 4 `LOT_ROUTES` registration tests + `LotResponseSchema` parse test.

---

## Validation

| Check | Result |
|---|---|
| `tsc --noEmit` | ✅ Clean |
| `npm run test:unit` (24 files, 260 tests) | ✅ Green (incl. conformance) |
| `npm run test:int` (7 files, 73 tests) | ✅ Green |
| `available-for-order` registered before `/:id` | ✅ |
| All routes admin-gated; `LOT_ROUTES` constants only | ✅ |
