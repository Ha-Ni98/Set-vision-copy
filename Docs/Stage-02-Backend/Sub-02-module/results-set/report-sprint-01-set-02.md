# Sprint 01 Report — Set Foundation (mapper + interface + generators)

**Module set:** Set · Lot · Order · Card · Activation (Set 02)
**Sprint:** 1 — Set Foundation
**Status:** ✅ Green

---

## Deliverables

### Source files created
- `apps/api/src/modules/set/set.mapper.ts` — `SetMapper.toDTO(set, plan)` with `composeSubscriptionLabel`; ends with `SetResponseSchema.parse`.
- `apps/api/src/modules/set/set.interface.ts` — `ISetService` { getAll, create, transition, delete }.
- `apps/api/src/modules/set/set.util.ts` — pure `generateSetNumber()` + `generateCardKey()` (uniqueness enforced by DB `@unique`).

### Test factories created
- `test/data/subscription-plan.factory.ts` — `subscriptionPlanEntity` + `seedPlan` (uses `upsert` on composite unique key).
- `test/data/set.factory.ts` — `setEntity` + `seedSet`.
- `test/data/card.factory.ts` — `cardEntity` + `seedCard` (for any `cardStat`); reusable by Lot/Order/Card/Activation.

### Test file created
- `test/unit/modules/set/set.mapper.spec.ts` — 9 tests covering: schema parse, label resolution for all 8 durations, `printedAt` null/ISO, `createdAt` ISO, all `SetStat` values, no entity spread.

---

## Validation

| Check | Result |
|---|---|
| `tsc --noEmit` | ✅ Clean |
| `npm run test:unit` (all 21 files, 215 tests) | ✅ Green |
| Interface returns DTOs | ✅ |
| Mapper parses `SetResponseSchema` | ✅ |
| Generators are pure (no DB) | ✅ |

---

## Notes

- `composeSubscriptionLabel` exported from mapper for direct use in tests and downstream mappers (Lot, Order, Card, Activation).
- `seedPlan` uses `upsert` to avoid duplicate-plan errors on repeated test runs (only one `SNAPCHAT_PLUS + ONE_MONTH` row allowed per DB unique constraint).
- `seedCard` wraps `seedSet` so downstream tests can seed ready-made `PRINTED` cards without coupling to Set internals.
