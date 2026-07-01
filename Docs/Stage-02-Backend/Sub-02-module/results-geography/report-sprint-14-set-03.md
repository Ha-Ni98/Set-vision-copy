# Report — Sprint 14 · Statistics — Logic A (summaries) · Set 03

**Date:** 2026-07-01
**Status:** ✅ Green & Committed

---

## What was built

`StatisticsService` (part 1) — the 6 fixed-shape summary aggregates.

### Files created

| File | Description |
|------|-------------|
| `Apps/api/src/modules/statistics/statistics.service.ts` | 6 implemented methods (`dashboard`, `activatorsSummary`, `distributorsSummary`, `inventorySummary`, `ordersSummary`, `activationsSummary`) + 3 stubs for Sprint 15 |
| `Apps/api/test/unit/modules/statistics/statistics.summaries.spec.ts` | 19 unit tests — revenue source, enabled-activator semantics, Algiers boundaries, zero-group omission, null avgDuration |

---

## Validation

- `tsc --noEmit` — clean
- `npm run test:unit` — 681/681 passed (includes conformance)

---

## Constraints respected

- `activeActivators` / `onlineNow` = `activator.count({ user: { isEnabled: true, deletedAt: null } })` — enabled-activator count, not live socket presence (plan §1.1)
- `dashboard.totalRevenue` = Σ `activationPrice` on COMPLETED activations; `ordersSummary.totalRevenue` = Σ `orderPrice` — sources are distinct
- Algiers boundaries via `todayStart()` / `weekStart()` / `monthStart()` from `statistics.time.ts`
- `avgDurationSeconds` computed in JS from `findMany({ select: { takenAt, completedAt } })` on completed activations; returns `null` when no valid rows
- Zero-count groups filtered by mapper (`toInventorySummaryDTO`, `toActivationsSummaryDTO`, `toOrdersSummaryDTO`)
- No writes, no events, no `$transaction`
- `overview` / `wilayaHeatmap` / `wilayaDrilldown` left as `throw new Error('not implemented')` stubs — Sprint 15
