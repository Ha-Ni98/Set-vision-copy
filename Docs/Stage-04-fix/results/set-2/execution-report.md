# Set 2 — Execution Report

**Plan:** [Docs/Stage-04-fix/plan/set-2-plan.md](../../plan/set-2-plan.md)
**Branch:** `version-02-01` · **Migration:** none (schema comments only)

## Files changed, by package

### `Apps/contract`
- `src/modules/activation/activation.dtos.ts` — added `CardChainSchema`, `ActivationTimingSchema`; extended `ActivationDetailResponseSchema` with `state`, `card`, `timing`, `activationEmail`; added the D3 explanatory comment above it.
- `src/modules/statistics/statistics.dtos.ts` — `avgDurationSeconds`, `avgTimeTrend[].avgSeconds`, `avgActivationTimeSeconds` (heatmap) tightened to `.int()`.
- `src/modules/activator/activator.dtos.ts` — both `avgActivationTimeSeconds` occurrences tightened to `.int()`.

### `Apps/api`
- `prisma/schema.prisma` — comment-only updates on `ActivationInformation.value`, `WrongInformation.value`, `AdditionalInformation.value` (D3 exposure note). **No migration.**
- `src/modules/activation/activation.mapper.ts` — removed `SENSITIVE_FIELDS` and `maskValue()`; three call sites now pass raw values; added `ActivationCardChainJoin` type; extended `toActivationDetailDTO()` to build `state`, `card`, `timing`, `activationEmail`.
- `src/modules/activation/activation.service.ts` — `getById()`'s include narrowed `set`/`lot` to explicit `select`s (still one query, no N+1) and the mapper call site passes the new card/timing data.
- `src/modules/statistics/statistics.service.ts` — `avgSeconds()`, the `avgTimeTrend` bucket average, and the wilaya heatmap average all round with `Math.round` at emission.
- `src/modules/activator/activator.service.ts` — `computeAvgSeconds()` rounds with `Math.round`.

### `Apps/web`
- `src/lib/duration.ts` **(new)** — `formatDuration()` + `DURATION_EMPTY`, the sole duration formatter.
- `src/lib/utils.ts` — `formatTime` removed.
- `src/components/shared/LiveTimer.tsx` — now calls `formatDuration` instead of its own inline `mm:ss`.
- `src/pages/admin/activations/components/CardChainBlock.tsx` **(new)**, `TimingBlock.tsx` **(new)**.
- `src/pages/admin/activations/ActivationDetailPage.tsx` — 6-tile skeleton, status badge next to the title, wires the two new blocks, `canSetPrice` now reads `detail.state` instead of deriving it from the timeline.
- `src/pages/admin/activations/components/SubmittedInformationList.tsx` — raw, `font-mono`, `select-all` values; local `EMPTY_VALUE` em dash for blanks.
- 7 call sites migrated from `formatTime` to `formatDuration`: `DashboardPage.tsx`, `StatsRevenueGrid.tsx`, `ActivatorsTable.tsx`, `HistoryPage.tsx` (×2), `ActivationsTable.tsx`, `AvgTimeTrendChart.tsx` (×2, plus `YAxis width={96}` for wide `dd:hh:mm:ss` ticks), `ActivationsPage.tsx`.
- `src/config/translations.json` — 13 new keys under `admin.activationDetail.card.*`, `admin.activationDetail.timing.*`, `admin.activationDetail.state`.

**Not changed:** `StatsRow.tsx`'s hardcoded `"3:24"` on the public landing page — left as-is (Q1 in the plan; you didn't ask me to touch it and it's genuinely out of this set's scope).

## Verification

- `tsc --noEmit`: clean in `contract`, `api`, `web`. The only errors anywhere are 9 pre-existing arg-count mismatches in the **frozen** `test/unit/modules/activation/activation.mapper.spec.ts`, expected per CLAUDE.md.
- `eslint`: `Apps/api` has no eslint installed/configured at all — pre-existing gap, not something this set touches. `Apps/web`: 115 problems (109 errors / 6 warnings), **identical count before and after** these changes (confirmed via `git stash`) — all pre-existing formatting issues in files this set never touched (`StatsRow.tsx`, `WhoWeAre.tsx`, `Logo.tsx`, `wilaya-geometry.ts`, etc.). Zero new lint issues introduced.
- `madge --circular src`: clean in `Apps/contract` and `Apps/api`.
- `npx prisma validate`: schema valid.
- `git status`: no test file created, modified, deleted, or run.

## Open questions carried forward

- **Q2 (French wording, "Set"/"Lot")** — resolved by you: kept literal, `card.set` = "Set"/"Set", `card.lot` = "Lot"/"Lot" in both languages.
- Q1 (`StatsRow.tsx` hardcoded value), Q3 (FIELD_LABEL is English-only), Q4 (days-field column width) — not acted on, left as documented in the plan; none blocked this set.

## Manual test checklist

1. **`< 1 h`** — open an activation whose duration is under an hour → Timing block shows `mm:ss` (e.g. `07:32`).
2. **`~3 h`** — an activation taken ~3 h before completion → `03:0x:xx`.
3. **`> 24 h`** — an activation spanning more than a day → `dd:hh:mm:ss`.
4. **Hour boundary** — exactly 3600 s renders `01:00:00`, not `60:00`.
5. **Day boundary** — exactly 86400 s renders `01:00:00:00`, not `24:00:00`.
6. **In-progress / null** — a `PENDING`/`PROCESSING` activation shows `—` for duration, no crash, no `NaN`.
7. **Password visible** — Submitted Information shows the real password in monospace, selectable, not `****`.
8. **OTP visible** — same for a completed OTP request.
9. **403 for activator** — an activator hitting `/admin/activations/<id>` is bounced by `AdminGuard`; the API route 403s with an activator token.
10. **Timeline order** — entries match `ActivationStep.createdAt` descending.
11. **Card chain** — key, set number, lot number (or `—`), and subscription label are all correct.
12. **Card history unaffected** — the card-history timeline (IN_SET → PRINTED → IN_LOT → AT_DISTRIBUTOR → ...) still renders — this is what the `set`/`lot` `select` narrowing could have silently broken.
13. **Activator portal parity** — activator History duration column and Dashboard avg-time card match the admin format exactly.
14. **Live timers** — pending-pool and active-request timers tick correctly across the hour boundary.
15. **Colour thresholds intact** — green/amber/red still work; only the text format changed.
16. **Statistics integers** — admin Statistics avg-time chart and Activations page avg-duration stat show clean values, no fractions.
17. **Set price still works** — the modal opens for completed activations and hides for live ones.
18. **Layout survives** — throttle the network: the 6 skeleton tiles hold layout; a bad id renders `NotFoundState` inside the content area.
