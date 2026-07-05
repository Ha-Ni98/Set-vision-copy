---
sprint: 4
title: Assembly & Wiring — Sets & Lots + Cards
status: ✅ Done
commit: 1db151d
---

# Sprint 4 Report — Assembly & Wiring — Sets & Lots + Cards

## Work done

### `lib/utils.ts` (new export)
Added `countOf<T extends string>(arr, stat)` — a small shared helper (missing stat ⇒ 0, per the `InventorySummaryDTO` contract comment) since both `SetsLotsPage` and `CardsPage` need the identical reduction (plan §B3/Risk note: "keep the two stat mappings straight"). Extracted rather than duplicated in each page.

### `SetsLotsPage.tsx` (rewritten from Sprint 2's static composition)
Fully live: `useInventorySummary()` drives 4 stat cards (Total Sets/Lots summed across all stats, Cards in Sets via `countOf(cards, IN_SET)`, Cards Awaiting Delivery via `countOf(cards, IN_LOT)` — F-1 honest label, unchanged from Sprint 1's i18n copy); independent `useSets`/`useLots` queries each with their own debounced search + plan/state filters + `SimplePagination`; `useSubscriptionPlans({active:true})` feeds both filter rows. Set actions wired to `useTransitionSet` (Send to Print → `PENDING_PRINTING`, Mark Printed → `PRINTED`) and `useDeleteSet`; Lot actions wired to `useDeleteLot`. "View Cards" links were already correct from Sprint 2 (no change needed).

### `CardsPage.tsx` (rewritten from Sprint 2's static composition)
Fully live: `useInventorySummary()` → 3 stat cards (Total, At-Distributor/F-2, Flagged — confirmed the Sprint 2 decision to not force a 4th "Cards by State" scalar card); `useCards({...})` with debounced key search, single-select state/plan/distributor/flag, and pagination; `?set=`/`?lot=`/`?distributor=`/`?key=` seeded once via lazy `useState` initializers reading `useSearchParams()` (mirrors Sprint 3's `?distributor=` pattern on Orders) — `key` maps to the `search` field since the contract has no dedicated key param. `CardDetailModal` wired to `useCard(id)`; `CardActionsMenu`'s four actions wired to `useDeleteCard`/`useDisableCard`/`useEnableCard`/`useRevokeCard`.

### `CreateSetModal.tsx` / `CreateLotModal.tsx` (rewritten from Sprint 2's static shells)
Both now call their own hooks directly (`useSubscriptionPlans`; `CreateLotModal` also calls `useAvailableCardsForLot(watched planId)`) and own a real `useForm` (create-set / create-lot schema + `zodResolver`) — same self-contained-hooks architecture Sprint 3 established for `CreateOrderModal`, so `SetsLotsPage` passes only `open`/`onOpenChange`/`onSubmit`/`isPending` to each. `CreateLotModal`'s candidate checkbox list (Select All/Deselect All/live count), already functional in Sprint 2 as local state, now drives the real `cardIds` form field via `setValue`.

## Validation results
- `npm run check` (both `tsconfig.json` and `tsconfig.test.json`) ✅ clean
- `npx eslint` on every touched file: 7 pure-Prettier findings, fixed via `--fix`, re-verified 0 errors/warnings
- `npx vitest run` ✅ 45/45 files, 334/334 tests green (unchanged baseline — no test files added, tests-last convention)
- **Browser-verified end-to-end** against the live local API + seeded admin: `/admin/activations/sets-lots` renders real `0`-valued stats (empty seeded DB), both tables' correct empty states with working Create CTAs, and independent plan/state filters on each table; `/admin/activations/cards` renders its 3 real stats and correct empty state with a working "Create a Set" `<Link>`. **Caught and fixed a real UX bug this way**: `CreateSetModal`/`CreateLotModal` initially reused the filter row's "All Plans" placeholder text for the plan `<Select>`, which is correct in a filter (means "no filter applied") but wrong in a required create-form field (implies "no selection needed"). Added two new placeholder keys (`admin.setsLots.{sets,lots}.create.planPlaceholder` = "Select a plan") and re-verified the fix in the running app.

## Decisions & deviations
- **`CreateSetModal`/`CreateLotModal` call their own hooks directly**, extending Sprint 3's `CreateOrderModal` precedent to the simpler single-step forms too — `SetsLotsPage` no longer threads plan/candidate-card lists as props into either modal.
- **New i18n keys not anticipated in Sprint 1**: `admin.setsLots.sets.create.planPlaceholder` and `admin.setsLots.lots.create.planPlaceholder` (2 new), found necessary only once the modals were wired against real (empty) data in the browser — the filter-row placeholder they'd been reusing statically in Sprint 2 never surfaced as wrong until it rendered with real Select semantics.
- **Sets/Lots stat cards show summed totals only, no per-stat breakdown subtext** — plan §D2.1 says "Total Sets (+breakdown)"/"Total Lots (+breakdown)" but Sprint 1 didn't build breakdown-text i18n keys (only `.title` keys), and adding a breakdown format now would require new copy invented on the spot. Logged as a minor fidelity gap, not a functional one — the scalar total is accurate.
- **Cards page keeps 3 stat cards, not 4** — reconfirms the Sprint 2 call now that real data is wired: `InventorySummaryDTO.cards` is a breakdown array, not a single number, so a literal "Cards by State" `StatCard` was never buildable without inventing a reduction the plan doesn't specify.
- No architecture shift — `plan.md` untouched.
