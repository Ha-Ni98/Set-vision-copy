---
sprint: 1
title: Foundation — Schemas, i18n, Routes & Shared Badges
status: ✅ Done
commit: TBD
---

# Sprint 1 Report — Foundation

## Work done

### Zod schemas (new)
| File | Notes |
|---|---|
| `pages/admin/distributors/components/create-order.schema.ts` | One schema for the whole 4-step wizard (plan §A5) — `distributorId`/`lotIds`/`wilayaId`/`communeId`/`deliveryCompanyId` as non-empty strings (select-driven, same rationale as Part-1's `wilayaId`/`communeId`), `receivedName` 3–100, `receivedPhone` Algerian regex, `deliveryType` `z.enum(DeliveryType, ...)`, `orderPrice`/`deliverPrice` coerced `.multipleOf(0.01)`. Exports both `FormValues` (`z.infer`) and `FormInput` (`z.input`) for the coerced-number split. |
| `pages/admin/distributors/components/mark-delivered.schema.ts` | Only field is `deliveredCount` (coerced int, `0…maxCount`); `to: DELIVERED` is injected by the caller, mirroring `record-payment.schema.ts`'s `activatorId` injection — the assignability check verifies `FormValues & { to: OrderStat.DELIVERED }` against the command. `maxCount` (the order's `cardsCount`) is a schema-factory parameter, not hardcoded. |
| `pages/admin/activations/components/create-set.schema.ts` | `subscriptionPlanId` non-empty string, `numberOfKeys` coerced positive int. |
| `pages/admin/activations/components/create-lot.schema.ts` | `subscriptionPlanId` non-empty string, `cardIds` non-empty array (checkbox multi-select). No coerced numbers, so a single `FormValues` type suffices (no `FormInput`). |

Every file exports its inferred `FormValues` type plus a compile-time-only `AssertAssignable<FormValues extends Command ? true : false>` guard (zero runtime footprint), following the Part-1 pattern exactly.

### i18n (`src/config/translations.json`)
Went from 370 → 523 keys (153 new). Added:
- `common.actions.*` (10 new: `back`, `sendToPrint`, `markPrinted`, `markInDelivery`, `markDelivered`, `markReturned`, `revoke`, `viewCards`, `selectAll`, `deselectAll`) — `next`/`enable`/`disable`/`confirm` already existed from Part 1 and are reused as-is.
- `common.validation.*` (2 new, not named explicitly in the sprint task list but required by the schemas above): `selectAtLeastOne` (nonempty-array message for `lotIds`/`cardIds`) and `maxValue` (upper-bound message for `deliveredCount`).
- `admin.orders.*`, `admin.setsLots.*`, `admin.cards.*` (~110 keys) — stat titles, filter placeholders, table columns, empty/error states, wizard step labels + field labels, detail drawer/modal copy, and confirm-dialog titles/bodies for every action named in plan §D1–D3. EN/FR authored verbatim where the plan gives exact wording; `ar: ""` throughout.
- `enums.setStat.*` (3), `enums.lotStat.*` (4), `enums.deliveryType.*` (3), `enums.cardFlag.*` (2) — enum label sets for the new badges/chips (`enums.orderStat.*`/`enums.cardStat.*` already existed from Part 1, reused).

All new entries validated: parses as JSON (`node -e "JSON.parse(...)"`), every value has non-empty `en`/`fr` and a present (empty-string) `ar`.

### Route scaffolding
| File | Notes |
|---|---|
| `pages/admin/distributors/OrdersPage.tsx`, `pages/admin/activations/{SetsLotsPage,CardsPage}.tsx` (new) | Stub components rendering `<></>`, matching the `withSuspense` helper's `LazyExoticComponent<() => JSX.Element>` typing (same reasoning as Part-1 Sprint 1). |
| `src/App.tsx` (edited) | 3 new `lazy()` imports; 3 new routes inside the existing `AdminGuard → AdminLayout` branch. `/admin/distributors/orders` is declared as a sibling **ahead of** `/admin/distributors/:id` in the array, with a comment noting React Router's static-over-dynamic ranking (plan §C) — confirmed no collision. |

### Shared badges (`src/components/shared/StatusBadge.tsx`, edited)
Added `SetStatusBadge`/`LotStatusBadge` through the existing `StatusPill` engine — same pattern as `OrderStatusBadge`/`CardStatusBadge`. Tones exactly per plan §B9: Set `NOT_PRINTED`=neutral/`PENDING_PRINTING`=warning/`PRINTED`=success; Lot `PENDING`/`IN_DELIVERY`=warning, `DELIVERED`=success, `RETURNED`=destructive. No `nav-links.ts` edit needed — the 3 nav links already point at these routes.

## Validation results
- `npm run check` (both `tsconfig.json` and `tsconfig.test.json`) ✅ clean
- `npx eslint` on every Sprint 1 file ✅ 0 errors/warnings
- `npx vitest run` ✅ 45/45 files, 334/334 tests green (no new test files — Foundation adds none; existing suite is the regression gate, baseline unchanged from Part 1)
- `node -e "JSON.parse(...)"` on `translations.json` ✅ valid

## Decisions & deviations
- **Two `common.validation.*` keys added beyond the sprint task's explicit list**: `selectAtLeastOne` (nonempty-array selections) and `maxValue` (generic numeric upper bound for `deliveredCount`). Both are reusable, common-scoped, not page-local — same spirit as Part-1's `selectRequired`, just not called out by name in the sprints doc.
- **`deliveredCount`'s `max` is a schema-factory parameter (`markDeliveredSchema(t, maxCount)`), not hardcoded**: the plan requires the ceiling to be `order.cardsCount`, which is only known at render time (per order), so the Zod bound is computed per-invocation rather than baked into a static schema — resolved this way instead of validating the ceiling only at the mutation call site, so the form itself surfaces the error inline.
- **`deliveryType` uses `z.enum(DeliveryType, t(...))`, the first enum-typed select field in any schema in this codebase** (Part 1's selects were all uuid-shaped ids, not enums). Verified the Zod 4 `_enum` overload accepts a plain string as the second `params` argument for the invalid-value message.
- No architecture shift — `plan.md` untouched.
