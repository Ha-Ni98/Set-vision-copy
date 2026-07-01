# Report — Sprint 08 · Distributor — Logic (service) · Set 03

**Date:** 2026-07-01
**Status:** ✅ Green & Committed

---

## What was built

`DistributorService` with 6 methods (getAll/create/getById/update/toggle/delete) plus 18 service unit tests.

### Files created

| File | Description |
|------|-------------|
| `Apps/api/src/modules/distributor/distributor.service.ts` | Full service; geography validation; inline audit per mutation; soft-delete; derived counter reads |
| `Apps/api/test/unit/modules/distributor/distributor.service.spec.ts` | 18 unit tests covering all branches |

---

## Key design decisions

- **Geography validation** — `validateCommuneBelongsToWilaya` runs on create and on update only when `wilayaId` or `communeId` is provided; skipped if neither changes.
- **Inline audit** — `ADD_DISTRIBUTOR`, `CHANGE_DISTRIBUTOR_INFORMATION`, `CHANGE_DISTRIBUTOR_STAT` each written inside `$transaction`; `delete` writes no log.
- **Derived counters** — `deliveredOrdersCount` derived via `order.groupBy` in `getAll`; `soldKeys` (cards `ACTIVATED`) and `ordersCount` derived via `card.count`/`order.count` in `getById`. Stored counters (`nbOfActiveCards`, `nbOfActivation`) are never written by this service.
- **Optional page/limit** — `GetDistributorsQuerySchema` has `.optional()` on both fields; defaults `?? 1` / `?? 10` applied before `toSkipTake`/`buildPaginationMeta`.
- **Soft-delete** — sets `deletedAt: new Date()`; excluded from all reads via `{ deletedAt: null }` in `where`.

---

## Validation

- `tsc --noEmit` — clean
- `npm run test:unit` — 584/584 passed (includes conformance + 18 new distributor service tests)

---

## Constraints respected

- Only `create`/`update`/`toggle` write audit logs (with the correct `LogActionType`); `delete` does not
- `nbOfActiveCards` and `nbOfActivation` are read-only in this module (denormalized counters owned by Order/Card transactions)
- Geography mismatch → `BadRequestError` (400 `VALIDATION_ERROR`)
- Unknown/deleted resource → `NotFoundError` (404 `RESOURCE_NOT_FOUND`)
