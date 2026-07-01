# Report — Sprint 15 · Statistics — Logic B (overview / heatmap / drilldown) · Set 03

**Date:** 2026-07-01
**Status:** ✅ Green & Committed

---

## What was built

`StatisticsService` (part 2) — the 3 period-filtered series and geographic aggregates, replacing the Sprint 14 stubs.

### Files modified

| File | Change |
|------|--------|
| `Apps/api/src/modules/statistics/statistics.time.ts` | Added `bucketDate(date, bucket)` — floors a UTC Date to day/week start in Algiers tz |
| `Apps/api/src/modules/statistics/statistics.service.ts` | Replaced 3 stubs with real `overview`, `wilayaHeatmap`, `wilayaDrilldown` implementations |

### Files created

| File | Description |
|------|-------------|
| `Apps/api/test/unit/modules/statistics/statistics.overview.spec.ts` | 17 unit tests covering all 3 methods |

---

## Validation

- `tsc --noEmit` — clean
- `npm run test:unit` — 698/698 passed (includes conformance)

---

## Constraints respected

- `overview`: `activationsByState` filtered by `requestedAt`; all 5 other series derived from completed activations filtered by `completedAt`; `subscriptionPlanId`/`wilayaId` passed as `card.*` filters; empty period → empty series (no error); top-10 cap on `topActivators`/`topDistributors`
- `wilayaHeatmap`: all 58 wilayas returned (zeroed where no data); completed activations filtered by `completedAt`; cancelled by `requestedAt`; `avgActivationTimeSeconds` computed in JS from `takenAt→completedAt`; `distributorsCount` from `distributor.groupBy`
- `wilayaDrilldown`: `NotFoundError` on unknown `wilayaId`; optional period filter; `subscriptionLabel` composed by mapper via `composeSubscriptionLabel`; `topDistributors` sorted desc, capped at 10; `activationsOverTime` bucketed by day
- `bucketDate` respects Algiers UTC+1 offset (same approach as `todayStart`/`weekStart`)
- No writes, no events, no realtime imports
