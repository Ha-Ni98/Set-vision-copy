---
sprint: 2
title: Primitives & States — Orders, Sets & Lots, Cards
status: ✅ Done
commit: d6b492d
---

# Sprint 2 Report — Primitives & States

## Work done

All components are static/presentational — props-driven, no data-fetching hooks, no `useForm`/`zodResolver`. Local `useState` is used only for genuine local UI behavior (dialog-open row selection, a dependent select, a checkbox list's live count), mirroring the Part-1 precedent (`CreateDistributorModal`'s Sprint-3 wilaya→commune dependency, `DistributorsTable`'s Sprint-3 toggle/delete dialog state).

### Orders (`pages/admin/distributors/components/`, new unless noted)
| File | Notes |
|---|---|
| `OrdersFilters.tsx` | Search + wilaya/delivery-company/state selects + date-from/to, mirrors `DistributorsFilters`. |
| `OrdersTable.tsx` | `DataTable` columns incl. `OrderStatusBadge` + translated delivery-type label; owns its own row-scoped `AlertDialog`s (mark-in-delivery, mark-returned, delete) and a `MarkDeliveredModal` instance, same self-contained-dialogs pattern as `DistributorsTable`. |
| `OrderActionsMenu.tsx` | Dumb dropdown, gates items off `order.orderStat` (Delete/Mark-In-Delivery only `PENDING_DELIVERY`; Mark-Delivered/Returned only `IN_DELIVERY`; View always). |
| `OrderDetailDrawer.tsx` | `Sheet`-based (net-new use of the existing `ui/sheet.tsx`, unused until now) — per-lot breakdown table, receiver/delivery fields, `<Link>` to the distributor. |
| `MarkDeliveredModal.tsx` | Static shell — bare number input, `maxCount` prop sets both the display ceiling and default value; RHF wired in Sprint 3. |
| `StepSelectDistributor.tsx`, `StepSelectLots.tsx`, `StepReceiverInfo.tsx`, `StepDeliveryConfig.tsx`, `StepConfirmSummary.tsx` | The 5 wizard step panels. Fields with a downstream dependent (wilaya→commune, plan→lots) are parent-owned props; everything else is a bare, register()-ready `<Input>`/local-`useState` `<Select>`. `StepConfirmSummary` is pure display, no inputs. |
| `CreateOrderModal.tsx` | **Net-new beyond the sprint task's explicit list** (see Decisions) — the stepper host: `Dialog` + local `step` index + Next/Back, renders the active step panel. No `useForm`/`trigger()` yet — real per-step validation gating is Sprint 3. |

### Sets & Lots (`pages/admin/activations/components/`, all new)
`SetsFilters.tsx`, `LotsFilters.tsx` (search + plan/state selects), `SetsTable.tsx`/`LotsTable.tsx` (`SetStatusBadge`/`LotStatusBadge`, own row-scoped confirm dialogs), `SetActionsMenu.tsx` (Send-to-Print only `NOT_PRINTED`; Mark-Printed only `PENDING_PRINTING`; Delete only `NOT_PRINTED`|`PENDING_PRINTING`; View-Cards always via `<Link ?set=>`), `LotActionsMenu.tsx` (Delete only `PENDING`; View-Cards always via `<Link ?lot=>`), `CreateSetModal.tsx` (static shell), `CreateLotModal.tsx` (static shell + a **real** candidate checkbox list with Select-All/Deselect-All/live-count — genuine local UI behavior, not deferred).

### Cards (`pages/admin/activations/components/`, all new)
`CardFlagChips.tsx` (renders nothing when neither flag set, per plan §B9), `CardsFilters.tsx`, `CardsTable.tsx` (`CardStatusBadge` + `CardFlagChips` + monospace key + `CopyButton` + conditional distributor cell; own row-scoped disable/enable/revoke/delete confirm dialogs), `CardActionsMenu.tsx` (Delete only `IN_SET`|`PRINTED`; Disable only `IN_LOT`|`AT_DISTRIBUTOR` and not already disabled; Enable only when disabled; Revoke only `ACTIVATION_FAILED` and not disabled), `CardDetailModal.tsx` (renders whatever `distributionTimeline` rows the DTO already filtered, `<Link>` to activation history).

### Stub-page composition (all 3 pages rewritten from `<></>`)
`OrdersPage.tsx`, `SetsLotsPage.tsx`, `CardsPage.tsx` now statically assemble every primitive above with local `useState` driving filters/modals and hardcoded `isLoading: true` stat/table props — same "static composition, no data hooks yet" pattern as Part-1's `DistributorsPage.tsx` as of its own Sprint 3.

## Validation results
- `npm run check` (both `tsconfig.json` and `tsconfig.test.json`) ✅ clean
- `npx eslint` on every Sprint 2 file: first pass surfaced 36 pure-Prettier formatting findings (line-wrapping only, zero logic issues) across 16 files — fixed via `eslint --fix`, re-verified 0 errors/warnings after
- `npx vitest run` ✅ 45/45 files, 334/334 tests green (unchanged baseline — Sprint 2 adds no test files, per the tests-last convention)
- No test files added under `/src`; no inline strings (grepped for stray JSX text — none found beyond what's already covered by Sprint 1's i18n keys); no `useEffect` fetching anywhere in the new files

## Decisions & deviations
- **Reused the shared `StatsRow` for all three pages' stat rows instead of building `OrdersStatsRow`/`SetsLotsStatsRow`/`CardsStatsRow`** — same reuse-first call Part-1 made for Activators/Distributors (`StatsRow` already takes a generic `DashboardStatCardData[]`). Named in the sprint task list but a legitimate simplification, noted in `sprints.md`.
- **Built `CreateOrderModal.tsx` (the stepper host) in this sprint, not just the 5 step panels.** `sprints.md`'s S2 task bullet names only the panels; the host's `useForm`/`trigger()` wiring is explicitly Sprint 3's job. But Part-1's real precedent (verified via `git show` on `CreateActivatorModal.tsx` as of its Sprint 3 commit) is that the *modal shell itself* — Dialog markup, buttons, local UI state — is built in the Primitives sprint, with only the RHF layer deferred. Building the stepper shell now (step-index state, Next/Back, panel switch) follows that same precedent and gives Sprint 3 a real skeleton to add `useForm` to, rather than inventing one from scratch there.
- **Cards' set/lot filters are clearable chips, not `Select` dropdowns**, despite the S2 task bullet's "state/set/lot/distributor/plan/flag selects" wording. There's no hook that lists every set/lot number (`GetCardsQuery.setNumber`/`lotNumber` are free strings, and D3's hook-mapping table only lists `useSubscriptionPlans`/`useDistributors` for filters) — plan §D3.6 itself says these are "seeded... once → clearable filter chips," which only makes sense as a chip, not an open-ended dropdown. Resolved toward the plan's own optimization note over the task bullet's shorthand.
- **`CardsPage`'s stub stat row has 3 cards (Total, At-Distributor, Flagged), not a literal 4th "Cards by State."** "Cards by State" in plan §D3.1 is a breakdown array, not a single scalar a `StatCard` can render — Sprint 4 (Assembly) will decide its final on-page shape once `useInventorySummary` is actually wired; the 3 scalar cards match the i18n keys Sprint 1 already added.
- **`OrderDetailDrawer` is the first *page-content* use of `ui/sheet.tsx`** — previously only consumed by the mobile nav drawers (`AdminHeader`/`ActivatorHeader`/`PublicHeader`); confirmed via grep before reusing it here rather than reaching for a new dependency.
- No architecture shift — `plan.md` untouched.
