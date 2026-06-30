# Sprint 05 Report — Lot Logic (service)

**Module set:** Set · Lot · Order · Card · Activation (Set 02)
**Sprint:** 5 — Lot Logic
**Status:** ✅ Green

---

## Deliverables

### Source file created
- `apps/api/src/modules/lot/lot.service.ts` — `LotService implements ILotService`:
  - **getAll** — joins plan; filters by `search`/`subscriptionPlanId`/`state`; paginated; derives `deliveredCardsCount` = count of this lot's cards in `AT_DISTRIBUTOR`.
  - **getAvailableForOrder** — filters `lotStat ∈ {PENDING, RETURNED}` + optional plan; derives count.
  - **create** — validates plan active; guards each card: `lotId != null` → `RESOURCE_CONFLICT` (checked first), `cardStat != PRINTED` → `VALIDATION_ERROR`, wrong plan → `VALIDATION_ERROR`; `$transaction` { create `Lot(PENDING)` → `card.updateMany(IN_LOT, lotId)` }.
  - **delete** — guard `lotStat = PENDING` else `RESOURCE_CONFLICT`; `$transaction` { `card.updateMany(PRINTED, lotId=null)` → `lot.delete` }; `Log REMOVE_LOT` after tx.

### Test file created
- `test/unit/modules/lot/lot.service.spec.ts` — 11 tests covering all guard paths and transaction verification.

---

## Validation

| Check | Result |
|---|---|
| `tsc --noEmit` | ✅ Clean |
| `npm run test:unit` (24 files, 255 tests) | ✅ Green |
| Create/delete inside `$transaction` | ✅ |
| `lotId != null` guard → 409 (checked before cardStat) | ✅ |
| Only `REMOVE_LOT` logged; create writes no log | ✅ |
| Service never transitions `lotStat` (Order owns that) | ✅ |

---

## Notes

- Guard order in `create`: `lotId != null` → RESOURCE_CONFLICT first, then `cardStat != PRINTED` → VALIDATION_ERROR. This ensures an already-assigned card (which is also non-PRINTED) correctly yields 409, not 400.
