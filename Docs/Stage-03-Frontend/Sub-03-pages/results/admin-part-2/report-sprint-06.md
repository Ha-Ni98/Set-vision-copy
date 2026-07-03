---
sprint: 6
title: Unit Tests — Orders, Sets & Lots, Cards
status: ✅ Done
commit: TBD
---

# Sprint 6 Report — Unit Tests (final sprint of Part 2)

## Work done

One `.test.tsx` per page, hooks + `useTranslation` mocked (no MSW), per the tests-last convention carried from Part 1. **22 new tests, 0 failures after fixing 2 real bugs the tests surfaced** (see Decisions).

### `tests/unit/pages/orders/OrdersPage.test.tsx` — 8 tests
4-stat-skeleton loading state; empty→no-match→Clear cycle; `NotFoundState`+retry→`refetch`; action gating asserted by opening each row's dropdown menu (`PENDING_DELIVERY` shows Mark-In-Delivery+Delete, hides Mark-Delivered; `IN_DELIVERY` shows Mark-Delivered+Mark-Returned, hides Delete); `MarkDeliveredModal` defaults its input to the row's `cardsCount` and confirms with `useTransitionOrder.mutate({id, command:{to:DELIVERED, deliveredCount}})`; wizard Step-1 Next is a no-op with no distributor selected; Step-2 renders the Sets-&-Lots `<Link>` on an empty lot list; a full 5-step walkthrough (select distributor → select lot → confirm prefilled receiver info → pick delivery company + type a price → confirm) ends in `useCreateOrder.mutate(command)` with the exact built values.

### `tests/unit/pages/sets-lots/SetsLotsPage.test.tsx` — 7 tests
Stats assert `countOf` reads a missing stat as `0`; both tables' empty/no-match; Set gating (Mark Printed only on `PENDING_PRINTING`, cascade-Delete confirm renders the "deletes the set and all its cards" body then calls `useDeleteSet.mutate(id)`); Lot gating (Delete only on `PENDING`, absent on `DELIVERED`) plus its "View Cards" `<Link>` targets `?lot=`; Create Set submits a real Select-chosen plan + default `numberOfKeys` through `useCreateSet.mutate`; Create Lot's Select All/submit-disabled-when-empty/final `cardIds` selection all assert against `useCreateLot.mutate`.

### `tests/unit/pages/cards/CardsPage.test.tsx` — 7 tests
Stats assert Total = Σ all `cards[].count` entries and Flagged = `cardFlags.disabled + .revoked`; empty→no-match; `?set=SET-9` seeds `useCards`'s `setNumber` argument once and renders a clearable chip that disappears on click; Revoke gating (only `ACTIVATION_FAILED` + not disabled) confirms with `useRevokeCard.mutate(id)`; a disabled `ACTIVATION_FAILED` card hides Revoke and shows Enable instead; flag chips render for disabled/revoked rows; the detail modal renders exactly the `distributionTimeline` rows the (mocked) DTO supplies, nothing invented for missing ones.

## Validation results
- `npm run check` (both `tsconfig.json` and `tsconfig.test.json`) ✅ clean
- `npx eslint` on every new/touched file: 29 pure-Prettier findings across the 3 new spec files (long inline mock objects), fixed via `--fix`, re-verified 0 errors/warnings
- `npx vitest run` ✅ **48/48 files, 356/356 tests** (334 baseline + 22 new) — full suite green
- No test files under `/src`; all 3 files are `.test.tsx`

## Decisions & deviations
- **Found and fixed two real bugs while writing tests** (not test-only workarounds):
  1. `OrdersTable`/`SetsTable`/`LotsTable`'s empty-state "create" CTA button reused the exact same i18n key as their page's persistent header button (`admin.orders.create.title` in both places, etc.) — harmless visually, but the first test that rendered an empty table *and* asserted on that text hit "multiple elements found," which is a real accessible-name collision, not a test artifact. Fixed by changing all three empty-state CTAs to the generic `common.actions.add` (matching Part-1's `DistributorsTable` convention, which already used a *different* key for its inline CTA than its header button).
  2. Writing that same test exposed that the **Lots section had no persistent header button at all** — only the Sets section did (`SetsLotsPage.tsx`'s Sets header row had a `Button`, Lots' did not), so once a Lot exists, `CreateLotModal` becomes unreachable (the empty-state CTA disappears with the empty state). Added a matching header-row "Create Lot" button next to the "Lots" heading, mirroring the Sets section's layout.
- **New shared test-infra addition**: `tests/fixtures/wrappers/setup.ts` gained a `ResizeObserver` stub. `@radix-ui/react-use-size` (used by shadcn's `Checkbox`) calls it unconditionally on mount; JSDOM has no implementation. This is the first test in the whole codebase to render a `Checkbox` (Create Lot's candidate list), so the gap was never hit before — fixed at the shared-infra level per the same reasoning as the existing pointer-capture polyfills ("needed by any test that opens a Select, not just this admin sub-stage").
- **First tests in this codebase to exercise a `DropdownMenu`-based `ActionsMenu`** (Part-1's equivalent tests never opened `DistributorActionsMenu`/`ActivatorActionsMenu` — they asserted gating a different way). Confirmed Radix `DropdownMenu` needs no additional JSDOM polyfills beyond what Select/Checkbox already required; opened via `getByLabelText("common.actions.action")` → `findByRole("menu")` → `within(menu).getByText(...)`.
- **Multiple stat values must differ in test fixtures** — an early draft of `CardsPage.test.tsx` used the same count for two different stat cards ("Total" and "Active") and got a "multiple elements with text 7" failure; fixed by giving the fixture two distinct `cards[]` entries so every asserted number is unique on the page.
- No architecture shift — `plan.md` untouched. **This closes out all 6 sprints of Admin Part 2** (Orders, Sets & Lots, Cards) — Foundation → Primitives → Assembly (Orders) → Assembly (Sets&Lots+Cards) → Polish → Tests, all green.
