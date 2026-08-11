# Set 11 — Admin revenue dashboard & charts — Execution Report

**Implemented exactly per** `Docs/Stage-04-fix/plan/set-11-plan.md`. Order: contract → backend → frontend.
**Date:** 2026-08-10 · **Branch:** `version-02-01` · **Tree at:** `d95a996` (plan commit).

User decisions on the two open questions from planning:
- **Q1 (migration approval):** approved — the index-only migration was created and applied.
- **Q2 (seed data):** skipped — "the data is only test data so nothing matter for now skip it." `load-mock-data.ts` was **not** touched. `SubscriptionPlanCost` remains empty in the dev DB, so `cashOutSplit.activationCost` reads `0` everywhere until an admin configures a plan cost by hand.

---

## Files created

**`Apps/contract`**
- `src/modules/statistics/statistics.enums.ts` — `RevenueGranularity`, `RevenueDimension`, `RevenueSort`, `REVENUE_UNATTRIBUTED_KEY`

**`Apps/api`**
- `src/modules/statistics/statistics.revenue.sql.ts` — the raw SQL: `Prisma.sql` fragment builders (`cashInAllocFragment`, `cashOutFragment`) plus `buildRevenueTotalsSql`, `buildRevenueSeriesSql`, `buildRevenueBreakdownSql`, and their raw row types
- `prisma/migrations/20260810170414_add_revenue_aggregation_indexes/migration.sql`

**`Apps/web`**
- `src/pages/admin/statistics/components/OverviewTab.tsx` — the pre-tabs page body, lifted verbatim
- `src/pages/admin/statistics/components/RevenueTab.tsx`
- `src/pages/admin/statistics/components/RevenueKpiRow.tsx`
- `src/pages/admin/statistics/components/RevenueTrendChart.tsx`
- `src/pages/admin/statistics/components/CashOutSplitBar.tsx`
- `src/pages/admin/statistics/components/RevenueBreakdownChart.tsx`

## Files modified

**`Apps/contract`**
- `src/modules/statistics/index.ts` — barrel += enums
- `src/modules/statistics/statistics.routes.ts` — += `REVENUE_SUMMARY`, `REVENUE_SERIES`, `REVENUE_BREAKDOWN` (registered before `WILAYA_DRILLDOWN`)
- `src/modules/statistics/statistics.query.ts` — += `RevenueSummaryQuerySchema`, `RevenueSeriesQuerySchema`, `RevenueBreakdownQuerySchema`
- `src/modules/statistics/statistics.dtos.ts` — += `RevenueTotalsSchema`, `RevenueSummaryResponseSchema`, `RevenueSeriesResponseSchema`, `RevenueBreakdownRowSchema`, `RevenueBreakdownResponseSchema`; R6 comments added above `DashboardStatsDTO.totalRevenue`, `OrdersSummaryDTO.totalRevenue`, `ActivationsSummaryDTO.totalRevenue`, `StatisticsOverviewDTO.revenueOverTime` — **no field renamed or redefined**

**`Apps/api`**
- `prisma/schema.prisma` — `@@index([orderStat, completedAt])` on `Order`, `@@index([activationStat, completedAt])` on `Activation`
- `src/modules/statistics/statistics.time.ts` — += `REPORTING_TZ` export
- `src/modules/statistics/statistics.interface.ts` — += 3 method signatures
- `src/modules/statistics/statistics.service.ts` — += `revenueSummary`, `revenueSeries`, `revenueBreakdown`, `estimateBucketCount`, `toRevenueFilters`, `MAX_REVENUE_BUCKETS`
- `src/modules/statistics/statistics.mapper.ts` — += `Raw*` types and `toRevenueTotalsDTO`/`toRevenueSummaryDTO`/`toRevenueSeriesDTO`/`toRevenueBreakdownDTO`
- `src/modules/statistics/statistics.controller.ts` — += 3 handlers
- `src/modules/statistics/statistics.routes.ts` — += 3 `GET`s, `adminOnly`, registered before `WILAYA_DRILLDOWN`

**`Apps/web`**
- `src/lib/utils.ts` — += `formatDZDCompact`
- `src/lib/query-keys.ts` — += `qk.statistics.revenueSummary/revenueSeries/revenueBreakdown`
- `src/services/statistics.service.ts` — += `revenueSummary`/`revenueSeries`/`revenueBreakdown`
- `src/hooks/useStatistics.ts` — += `useRevenueSummary`/`useRevenueSeries`/`useRevenueBreakdown`
- `src/pages/admin/statistics/StatisticsPage.tsx` — restructured into `Tabs` (`overview`/`revenue`), filter bar hoisted above the tabs
- `src/config/translations.json` — 22 new keys under `admin.statistics.tabs.*` / `admin.revenue.*`; `admin.statistics.charts.revenueOverTime.title` value changed (key unchanged) to "Activator Commissions Over Time" / "Commissions des activateurs dans le temps" (U3)

## Migration

**`add_revenue_aggregation_indexes`** (`20260810170414_add_revenue_aggregation_indexes`) — two `CREATE INDEX` statements, no data change, no reseed required. Applied to the local dev DB (`localhost:5432/setvision_test`); confirmed present via `\d "Order"` / `\d "Activation"`.

---

## Deviations from the plan (disclosed)

1. **Cash-in CTE used unconditionally, not only when plan-scoped.** §2.2 said the pro-rata allocation CTE is "used only where a plan is involved." The implementation uses `cashInAllocFragment` for **every** cash-in read, including the plain summary/series with no plan filter. This is mathematically identical (the per-lot shares of every order always sum to exactly `orderPrice`, verified against the live DB — see Manual test 1) and is simpler: one cash-in fragment, reused by all three endpoints, instead of two. No behavior difference; documented here per the "communicate deviations" norm.
2. **`admin.revenue.rangeTooWide` translation key dropped.** The plan (§6.7) specified a bespoke inline message for the bucket-cap `BadRequestError`. Implementing it required either a fragile string-match on the backend's English error text or a new dedicated `ErrorCode`, both disproportionate for one message. The bucket-cap error instead surfaces through each chart's existing generic `isError` → `NotFoundState` + retry path (already required by manual test 5's crash-safety bar) — no crash, inline, recoverable. `admin.revenue.granularity.label` was also dropped (unused — the granularity `Select` has no separate label above it, matching the existing `HeatmapColorModeSelect` convention on the same page).
3. **Others/totals in the breakdown query come from `GROUP BY`-based CTEs joined by `UNION ALL` (`rn <= limit` / `rn > limit` / no filter), not literal `SUM(...) OVER ()` window functions.** Same guarantee the plan asked for — one SQL statement, no possible drift between rows/others/totals — just a different SQL shape than the sketch in §3.3. Verified against the live DB: rows + others == totals on every dimension tested (Manual test 3).

## Chart color decision (flagged, not silently done)

Per CLAUDE.md, the `dataviz` skill was loaded before writing chart code. Running `scripts/validate_palette.py` (the skill's own validator) against this app's existing `--success`/`--destructive`/`--primary` tokens — reused here for cashIn/cashOut/net, and already used by the pre-existing `RevenueOverTimeChart` — showed a CVD-separation **FAIL** (ΔE 3.2–3.4, below the 6–8 floor) for the green/red pair. This is a pre-existing, app-wide color pattern (not introduced by this set) and redesigning the app's semantic palette is out of scope here.

Mitigation applied instead of a silent pass: every multi-series revenue chart carries a `<Legend>` and named `Tooltip`/series `name` props (text identifies each series, never color alone); cashIn/cashOut are additionally distinguished by **position** (grouped bars) and net by **mark shape** (line vs. bar). For the cash-out split bar, `warning`+`primary` were used instead of reusing `destructive` (which already means "cash out" elsewhere on the same tab) — that pair passed the validator cleanly (ΔE 35–44 in both light and dark). Full validator output is in the conversation transcript; flagging the pre-existing green/red CVD gap here as a candidate for a future, separately-scoped design pass.

## Manual verification performed this session

- All three new endpoints (`/statistics/revenue/{summary,series,breakdown}`) were exercised live against the running dev API and the dev DB, not just planned: totals, series zero-fill, plan/wilaya/distributor breakdown, `others`/`totals` reconciliation, the `wilayaId` and `subscriptionPlanId` filters (individually and combined), the bucket-cap rejection, and the 401 guard. All matched hand-computed SQL.
- The full page was screenshotted via Playwright (Chromium, cached browser, Node 20) at 1440px, 900px, and 375px, in both light and dark mode, logged in as `mockadmin`. No console errors. No horizontal overflow at 375px. Both tabs verified visually — including a real negative `net` bar rendering left-of-zero on the breakdown chart.

## Definition of done

- `npx tsc --noEmit` — clean in `Apps/contract`, `Apps/api`, `Apps/web` (pre-existing `Apps/api` errors are confined to `test/` — Set 9/10 fixture drift, not touched)
- eslint — `Apps/contract` clean; `Apps/web` clean after `--fix` scoped to only this set's files (never a broad `--fix`). **`Apps/api` has no eslint installed at all** — pre-existing gap, already flagged in the Set 9 report, not fixed here (would mean installing a new dependency without asking)
- `npx madge --circular --extensions ts src` in `Apps/contract` — clean
- Migration `add_revenue_aggregation_indexes` created and applied
- `git status` confirms no test file (`**/*.test.ts`, `**/*.spec.ts`, `tests/`, `__tests__/`, vitest configs) was created, modified, or deleted
- No magic strings: routes from `STATISTICS_ROUTES`; SQL enum literals bound from the Prisma client enums (`PrismaOrderStat.DELIVERED`, `PrismaActivationStat.ACTIVATED`/`ACTIVATED_BY_ADMIN`); `REPORTING_TZ` from `statistics.time.ts`; `REVENUE_UNATTRIBUTED_KEY` from the contract; all UI copy from `translations.json`
- `$queryRawUnsafe` does not appear anywhere in the diff — every raw query is a `Prisma.sql` tagged template

---

## Open items for you

1. **Plan costs are unconfigured (Q2, by your choice).** `cashOutSplit.activationCost` will read `0` on every chart until at least one row is added at `/admin/settings` → Plan Costs. Not a bug — just worth knowing before eyeballing the dashboard.
2. **Pre-existing green/red CVD gap**, flagged above, not fixed. Candidate for a separate, deliberately-scoped palette pass if you want it addressed.
3. **`Apps/api` has no eslint tooling at all** (pre-existing, also flagged in Set 9's report). Still unresolved; installing one needs your go-ahead per CLAUDE.md's "no new library without asking."
4. **Frozen test impact:** the contract conformance suites (already broken since Set 1) gain more drift from the new DTOs. `tests/unit/pages/statistics` will additionally break **structurally** on the tab restructure, not just on DTO shape — flagged distinctly per the plan's §6.3, since it's a different kind of breakage than the rest of the frozen suite. Neither was touched, per the test freeze.

---

## Manual test checklist

Run against the local dev DB. `mockadmin` / `Password123!`.

1. **Migration applied.** `npx prisma migrate status` shows `add_revenue_aggregation_indexes` applied. `\d "Order"` lists `Order_orderStat_completedAt_idx`; `\d "Activation"` lists `Activation_activationStat_completedAt_idx`.
2. **All-time totals match a manual SQL sum.** Set the period to a range covering all data (e.g. `this_year` or a wide custom range). Compare the three KPI tiles against:
   ```sql
   SELECT sum("orderPrice") FROM "Order" WHERE "orderStat"='DELIVERED';
   SELECT sum(COALESCE("activationCost",0) + COALESCE("activationPrice",0))
     FROM "Activation" WHERE "activationStat" IN ('ACTIVATED','ACTIVATED_BY_ADMIN');
   ```
3. **The three endpoints reconcile.** With the same filters: sum of the trend chart's `Cash in` bars across all buckets equals the Cash In KPI tile; the breakdown chart's bars + "Others" line equals the same KPI, on all three dimensions (Plan / Wilaya / Distributor).
4. **Empty periods are zeros, not gaps.** Pick `last_90d` at Day granularity. Every date between the first and last bucket is present on the X axis; quiet days sit on the zero line, no gaps.
5. **A range with no data → empty state, no crash.** Custom range `2020-01-01` → `2020-01-31`. The Revenue tab's charts show their empty states, KPI tiles read `0 DZD`, header/filter bar/tab strip stay visible, nothing throws.
6. **Granularity toggle changes the buckets.** With `this_year` selected, switch Day → Week → Month on the trend chart. Bucket count drops each time; totals summed across all buckets stay identical; month buckets start on the 1st (Algiers local), week buckets on Mondays.
7. **Two-decimal accuracy, no floating-point artifacts.** Set a plan cost of `0.10` DZD in `/admin/settings` → Plan Costs, complete three activations on that plan, confirm the cash-out figure moved by exactly `0.30 DZD` (not `0.30000000000000004`) in the KPI tile, the tooltip, and the axis.
8. **The anchor is `completedAt`, not `createdAt`.** Create/transition an order to `DELIVERED` in one month, observe its price appears in that delivery month's bucket — not the order's creation month.
9. **Returned orders are excluded.** Transition an order to `RETURNED`. Cash in does not move even though `completedAt` gets stamped. Transition a different order to `DELIVERED` — cash in rises by exactly its `orderPrice`.
10. **`deliverPrice` is excluded.** Note an order's `deliverPrice`. It appears in no figure on the Revenue tab; cash in moves by `orderPrice` alone.
11. **Cancelled activations are excluded.** Cancel an activation (its `completedAt` gets stamped). Cash out does not move.
12. **Null commission does not null the row.** Find/create a completed activation with `activationPrice = NULL`. Its `activationCost` still contributes to cash out; no bucket goes null.
13. **Wilaya breakdown uses the distributor's wilaya, not the delivery wilaya.** Pick an order whose distributor's wilaya differs from `Order.wilayaId` (5 of the 6 seeded orders qualify). Its cash-in lands in the distributor's wilaya row on the breakdown chart.
14. **Plan breakdown allocation.** With single-lot orders (as seeded today), each order's full price lands on its lot's plan and rows sum to the cash-in total.
15. **Unattributed bucket.** A completed activation on a card with `distributorId = NULL` appears in the "Unattributed" row of the Wilaya/Distributor breakdown, not dropped.
16. **Charts render on a narrow viewport without overflow.** DevTools → 375px. All four Revenue visuals fit; page scrolls vertically only; Y-axis shows compact amounts (`19 k DZD`).
17. **Bucket cap.** Custom range `2015-01-01` → `2026-12-31` at Day granularity → the trend chart shows its error state with a working Retry (no crash, no hang). Switching to Month succeeds.
18. **The Overview tab is unchanged** except the relabeled chart title ("Activator Commissions Over Time" / "Commissions des activateurs dans le temps").
19. **Filters apply to both tabs.** Pick a wilaya and a plan on the shared filter bar, switch tabs — both reflect the same selection; switching back doesn't reset the period.
20. **Loading and error states.** Throttle to offline, open the Revenue tab: skeletons, then each chart's own `NotFoundState` + working Retry. Header/filter bar/tab strip stay visible throughout.
21. **Guards.** As an activator (and as a distributor), `GET /api/v1/statistics/revenue/summary`, `/series`, and `/breakdown` all return **403**.
22. **i18n.** Toggle EN/FR: every KPI label, granularity option, dimension option, chart title, the anchor note, "Unattributed" and "Others" translate. No raw key text, no untranslated English in FR.
