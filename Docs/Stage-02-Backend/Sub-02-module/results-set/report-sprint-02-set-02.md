# Sprint 02 Report — Set Logic (service)

**Module set:** Set · Lot · Order · Card · Activation (Set 02)
**Sprint:** 2 — Set Logic
**Status:** ✅ Green

---

## Deliverables

### Source file created
- `apps/api/src/modules/set/set.service.ts` — `SetService implements ISetService`:
  - **getAll** — joins `SubscriptionPlan`; filters by `search`/`subscriptionPlanId`/`state`; paginated via `toSkipTake` + `buildPaginationMeta`.
  - **create** — validates plan exists and `isActive` (→ `VALIDATION_ERROR`); generates unique `setNumber`; pre-generates all card keys; `$transaction` { create `Set(NOT_PRINTED)` → `card.createMany(IN_SET, isActive=false)` }.
  - **transition** — `NOT_PRINTED→PENDING_PRINTING` (simple update); `PENDING_PRINTING→PRINTED` inside `$transaction` { `printedAt=now` + `card.updateMany(IN_SET→PRINTED)` }; else → `RESOURCE_CONFLICT`.
  - **delete** — guard `{NOT_PRINTED, PENDING_PRINTING}` else `RESOURCE_CONFLICT`; `$transaction` { `card.deleteMany` → `set.delete` }; `Log REMOVE_SET` written **after** transaction.

### Test file created
- `test/unit/modules/set/set.service.spec.ts` — 15 tests covering all guard paths and transaction verification.

---

## Validation

| Check | Result |
|---|---|
| `tsc --noEmit` | ✅ Clean |
| `npm run test:unit` (all 22 files, 230 tests) | ✅ Green |
| Card generation inside `$transaction` | ✅ |
| `→PRINTED` cascade runs inside `$transaction` | ✅ |
| Delete inside `$transaction`, log written after | ✅ |
| Only `REMOVE_SET` logged (create/transition write none) | ✅ |

---

## Notes

- Card keys are generated with `uniqueCardKey()` before entering the `$transaction` callback to avoid calling `this.prisma` from inside the interactive transaction closure.
- The `ALLOWED_TRANSITIONS` map encodes the only two valid moves; any other target → `RESOURCE_CONFLICT`.
