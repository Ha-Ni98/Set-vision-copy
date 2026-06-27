# Module Specification: Statistics

## 1. Context [CONTRACT]
- Prisma Entity: none of its own — read-only aggregation across `Activation`, `Card`, `Set`, `Lot`, `Order`, `Distributor`, `Activator`, `Payment`, `Wilaya`
- Depends on: `common` (`ApiResponse`, `ErrorCode`); the entities above (read-only)
- Consumed by: the admin Dashboard, the Statistics page, and every list page's stat-card row (the single home for all aggregation, so domain list endpoints stay plain paginated lists)

## 2. API Interface [CONTRACT]
`STATISTICS_ROUTES` (`BASE: '/statistics'`). All routes Admin-only, read-only. All series/cards are **pre-aggregated** server-side so the frontend only renders.

- Route Constant: `STATISTICS_ROUTES.DASHBOARD` (GET `/statistics/dashboard`)
  - Access: Admin
  - Output: `DashboardStatsDTO` — the 4 dashboard cards (total activations + this-month + trend; activators enabled/disabled/online; distributors enabled/with-stock; active cards + distributor count)

- Route Constant: `STATISTICS_ROUTES.ACTIVATORS_SUMMARY` (GET `/statistics/activators`)
  - Access: Admin
  - Output: `ActivatorsSummaryDTO` { totalActivators, onlineNow, totalSuccessful, totalCreditsOwed }

- Route Constant: `STATISTICS_ROUTES.DISTRIBUTORS_SUMMARY` (GET `/statistics/distributors`)
  - Access: Admin
  - Output: `DistributorsSummaryDTO` { totalDistributors, activeWithStock, totalCardsInStock, activationsThisMonth }

- Route Constant: `STATISTICS_ROUTES.INVENTORY_SUMMARY` (GET `/statistics/inventory`)
  - Access: Admin
  - Output: `InventorySummaryDTO` — sets by state, lots by state, cards by state, cards awaiting delivery, active cards, flagged (disabled/revoked) counts (serves the Sets & Lots and Cards pages)

- Route Constant: `STATISTICS_ROUTES.ORDERS_SUMMARY` (GET `/statistics/orders`)
  - Access: Admin
  - Output: `OrdersSummaryDTO` { totalOrders (all/month/week), pendingDelivery, inDelivery, totalRevenue }

- Route Constant: `STATISTICS_ROUTES.ACTIVATIONS_SUMMARY` (GET `/statistics/activations`)
  - Access: Admin
  - Output: `ActivationsSummaryDTO` { total (all/today/week/month), byState[], avgDurationSeconds, totalRevenue }

- Route Constant: `STATISTICS_ROUTES.OVERVIEW` (GET `/statistics/overview`)
  - Access: Admin
  - Input (query/params): `StatisticsOverviewQuery` { period, dateFrom?, dateTo?, subscriptionPlanId?, wilayaId? }
  - Output: `StatisticsOverviewDTO` — the 6 chart series: activationsOverTime, activationsByState, topActivators, topDistributors, avgTimeTrend, revenueOverTime

- Route Constant: `STATISTICS_ROUTES.WILAYA_HEATMAP` (GET `/statistics/wilaya-heatmap`)
  - Access: Admin
  - Input (query/params): `WilayaHeatmapQuery` { period?, subscriptionPlanId? }
  - Output: `WilayaHeatmapDTO[]` — per wilaya { wilayaName, distributorsCount, activationsCount, cancellationsCount, avgActivationTimeSeconds } for all 58

- Route Constant: `STATISTICS_ROUTES.WILAYA_DRILLDOWN` (GET `/statistics/wilaya/:wilayaId`)
  - Access: Admin
  - Input (query/params): `WilayaIdParams` { wilayaId } + `WilayaDrilldownQuery` { period? }
  - Output: `WilayaDrilldownDTO`

## 3. Events [CONTRACT]
(none)

## 4. Business Logic (Service) [BACKEND]
- **dashboard:** count completed activations (all + this-month + month-over-month trend %), activators (enabled/disabled + online from live socket presence), distributors (enabled + with `nbOfActiveCards>0`), active cards (`AT_DISTRIBUTOR` + `isActive`) and their distinct distributor count.
- **activatorsSummary:** count activators, online now, sum `nbOfSuccessfulActivation`, sum `credits`.
- **distributorsSummary:** count distributors, those with stock, sum `nbOfActiveCards`, activations originated this month.
- **inventorySummary:** group `Set`/`Lot`/`Card` by their stat enums; count cards awaiting delivery (`IN_LOT` on an `IN_DELIVERY` order), active cards, and disabled/revoked.
- **ordersSummary:** count orders (all/month/week), by `PENDING_DELIVERY`/`IN_DELIVERY`, sum `orderPrice`.
- **activationsSummary:** count activations (all/today/week/month), group by `ActivationStat`, average `takenAt→completedAt` over completed, sum `activationPrice`.
- **overview:** apply the period + plan + wilaya filters; build six pre-aggregated series, choosing daily vs weekly buckets from the period span.
- **wilayaHeatmap:** per wilaya, aggregate distributors, activations, cancellations, and avg time over the period; return all 58 (zeroed where empty).
- **wilayaDrilldown:** validate the wilaya (`RESOURCE_NOT_FOUND`) → detailed per-wilaya breakdown for the period.

## 5. Data Mapping [BACKEND]
- **toDTO:** counts as `Int`; money sums `Decimal` → number (2 dp); durations as seconds; time-series as `{ label|date, value }[]`; resolve `wilayaName` for the heatmap/drilldown. All timestamps/date buckets ISO. No sensitive fields surface in any aggregate.
- **toPersistence:** n/a (read-only module).

## 6. Technical Constraints [BACKEND]
- Read-only; every figure is computed server-side so the frontend never aggregates. "Today / this week / this month" boundaries use the Algiers timezone. Revenue = sum of completed-activation `activationPrice` (overview/activations) or `Order.orderPrice` (orders summary). The overview's bucket granularity is derived from the period. Heatmap always returns all 58 wilayas. All dates ISO 8601.

## 7. Test Scenarios [BACKEND]
- 200 — each summary/overview endpoint returns its DTO shape; 403 for a non-admin principal.
- 200 — `overview` honors `period`/`subscriptionPlanId`/`wilayaId`; an empty period returns zeroed series rather than an error.
- 200 — `wilaya-heatmap` returns all 58 wilayas (zeroed where no activity).
- 200 — `wilaya/:wilayaId` drilldown; 404 `RESOURCE_NOT_FOUND` for an unknown wilaya.
- Boundary — "this month/week/today" counts respect the Algiers timezone cutoffs.
