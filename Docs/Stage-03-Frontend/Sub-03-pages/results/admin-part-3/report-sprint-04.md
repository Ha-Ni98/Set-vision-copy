---
sprint: 4
title: Assembly & Wiring — Statistics + Heatmap
status: ✅ Done
commit: TBD
---

# Sprint 4 Report — Assembly & Wiring (Statistics + Heatmap)

## Work done

### StatisticsPage
Fully live off one `useStatisticsOverview({period,dateFrom?,dateTo?,subscriptionPlanId?,wilayaId?})` call feeding all 6 chart wrappers (`ActivationsOverTimeChart`/`ActivationsByStateDonut`/`TopActivatorsBar`/`TopDistributorsBar`/`AvgTimeTrendChart`/`RevenueOverTimeChart`) — a single query change re-renders all 6, each still showing its own `ChartSkeleton`/empty/error state (built in Sprint 2, unchanged). `useSubscriptionPlans({active:true})`/`useWilayas()` drive the filter dropdowns. `dateFrom`/`dateTo` are only sent to the overview query when `period==="custom"` — the other 6 enum members are calendar-computed server-side and don't need them.

### Heatmap wiring
`useWilayaHeatmap({period,subscriptionPlanId})` passed directly into `WilayaHeatmap` — the name-join (`wilaya-name-map.ts`), purple color scale, and hover tooltip were all already built in Sprint 2 and needed no changes to consume real data. `WilayaHeatmapQuery` (contract) only has `period`/`subscriptionPlanId` fields — no `wilayaId`/`dateFrom`/`dateTo` — so the heatmap intentionally doesn't react to the wilaya filter or a custom date range the way the 6 charts do; this is a real contract constraint, not an oversight.

### Drilldown wiring
`WilayaHeatmap`'s `onWilayaSelect` callback already resolves to a full `WilayaHeatmapEntry` (carrying the real `wilayaId`) via its own internal name-join — so no separate name→id resolution step was needed at the page level, simpler than the plan's task wording implied. `useWilayaDrilldown(selectedWilaya?.wilayaId ?? "", {period})` is `enabled`-gated on a non-empty id; clicking a wilaya opens `WilayaDrilldownPanel` with its own loading/error/data states (built Sprint 2, unchanged).

## Decisions & deviations

- **Found and fixed a real gap in Sprint 2's `StatisticsFilterBar`**: the period `<Select>` rendered a selectable "Custom Range" option, but no date inputs existed anywhere to actually supply a custom range — selecting it would have silently sent `period:"custom"` with no `dateFrom`/`dateTo`, an unusable state. Added conditional date inputs (`Input type="date"`, shown only when `period==="custom"`) mirroring the existing `dateFrom`/`dateTo` pattern from `ActivationsFilters`/`OrdersFilters`, plus 2 new i18n keys (`admin.statistics.filters.dateFrom`/`dateTo`, reusing the existing "From"/"To" wording). This was necessary to make the sprint's own wiring task ("`dateFrom?`/`dateTo?`" in `useStatisticsOverview`) actually reachable through the UI, not scope creep.
- **No separate wilaya name→id resolution step needed at the page level** — `WilayaHeatmap`'s existing internal name-join (from Sprint 2) already emits the resolved `WilayaHeatmapEntry` to `onWilayaSelect`, so the drilldown wiring is a plain `enabled`-gated query off `wilaya.wilayaId`, not a second lookup.
- **All-58-wilaya name-join safety-net test deferred to Sprint 7**, per the plan's own dependency spine (§ risk note: "the §E-5 table is the single point of failure; unit-tested in S7") — no change to that plan.
- **No browser verification this sprint** — user instruction from Sprint 3 to conserve Playwright/Chromium time/tokens carries forward; confidence rests on `tsc`/`eslint`/existing-suite-green plus this sprint's wiring being structurally identical to Sprint 3's already-established (and Part-2-precedented) query-wiring pattern.
- No architecture shift — `plan.md` untouched.

## Validation results
- `npm run check` (both `tsconfig.json` and `tsconfig.test.json`) ✅ clean — one edit (`StatisticsFilterBar`'s new date-input props) plumbed through with no type errors.
- `npx vitest run` ✅ 48/48 files, 356/356 tests green (unchanged baseline).
- `npx eslint` scoped to this sprint's 3 touched files — 1 pure-Prettier line-wrap finding on the `StatisticsPage` import statement, fixed directly (not via `--fix`, to keep the diff exact); re-verified 0 errors after.
