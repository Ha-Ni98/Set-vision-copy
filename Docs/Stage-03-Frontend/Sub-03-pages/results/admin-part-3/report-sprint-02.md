---
sprint: 2
title: Primitives & States — all five pages (+ heatmap vendoring)
status: ✅ Done
commit: TBD
---

# Sprint 2 Report — Primitives & States

## Work done

### Activations (`pages/admin/activations/components/`)
`ActivationsFilters`, `ByStateDonut`, `ActivationsTable` (owns `ResolveFreezeDialog` + `SetActivatorPriceModal` instances), `ActivationActionsMenu` (Resolve-Freeze gating: two menu items — Activate/Cancel — shown only when `state===FREEZE`, since `ResolveFreezeDialog` needs an explicit action choice, not a single generic "Resolve"; Set Price shown only when completed+unpriced), `SetActivatorPriceModal` (static shell). Extended the shared `pages/admin/components/ResolveFreezeDialog.tsx` with an optional `reason?: string | null` prop (backward-compatible — Dashboard's existing usage unaffected) to surface the freeze reason in this page's resolve flow.

### Activation Detail (same dir)
`ClientBlock`, `DistributorBlock` (plain text, no `<Link>` — DTO has no distributor id, §E-2), `ActivatorBlock` (`<Link>` if present else `EmptyState`), `SubmittedInformationList`, `ActivationTimeline` (WRONG_INFORMATION/ADDITIONAL_INFORMATION/FREEZE row variants), `CardHistoryTimeline`, `FinancialBlock`.

### Logs (`pages/admin/logs/components/`)
`LogsFilters`, `LogsTable`. Added `LogActionBadge` to the shared `components/shared/StatusBadge.tsx` (13-entry `LOG_ACTION_TONE` map, one per `LogActionType` member). Added `formatRelativeTime(iso, language)` to `lib/utils.ts` using `Intl.RelativeTimeFormat` with a year→second unit cascade — a static "2 hours ago" display, deliberately distinct from `LiveTimer`'s ticking elapsed-time (logs are immutable past events; re-rendering every second would be pointless).

### Statistics (`pages/admin/statistics/components/`)
`StatisticsFilterBar` (exports a `STATISTICS_PERIODS` const array + `StatisticsPeriodValue` type, since `StatisticsPeriod` is a `z.enum` of string literals, not a runtime TS enum, so it can't be `Object.values()`'d like the other enums), `ActivationsOverTimeChart`, `AvgTimeTrendChart`, `RevenueOverTimeChart` (Line), `ActivationsByStateDonut` (Pie), `TopActivatorsBar`/`TopDistributorsBar` (horizontal Bar) — each with its own `ChartSkeleton`/empty/error branch.

### Heatmap vendoring (`pages/admin/statistics/components/`)
- `wilaya-geometry.ts` — the 58 `<g><polygon|path/></g>` shapes + viewBox, extracted from `react-algeria-map`'s legacy `Map.jsx` via a Node script (see Errors & fixes — regenerated once after fixing a regex bug).
- `wilaya-name-map.ts` — `resolveLibWilayaName()`, NFD-normalizing + diacritic-stripping + apostrophe-folding join between the vendored geometry's names and the DTO's `wilayaName`, instead of a hardcoded pairing table (the dev DB's Wilaya table has 0 rows, so exact-spelling verification against real data isn't possible yet).
- `heatmap-color-scale.ts` — `purpleShade()` + `HeatmapColorMode` type, split out of `WilayaHeatmap.tsx` to satisfy `react-refresh/only-export-components` (same fix pattern as Part-1's `lib/duration-tone.ts`).
- `WilayaHeatmap.tsx` — renders `<svg viewBox={HEATMAP_VIEWBOX} role="img">`, one `<g>` per wilaya with a dynamic `polygon`/`path` tag, hover-driven tooltip panel (4 metrics), click → `onWilayaSelect`. Exports `WilayaHeatmapEntry = WilayaHeatmapDTO[number]` (the contract's `WilayaHeatmapDTO` is itself the array type).
- `HeatmapLegend.tsx`, `HeatmapColorModeSelect.tsx`, `WilayaDrilldownPanel.tsx` (Sheet-based side panel, static).

### Settings (`pages/admin/settings/components/`)
Tab host with **4** `ui/tabs` triggers (Admin Accounts / Commission / Subscription Plans / Delivery Companies) — added the `@radix-ui/react-tabs` dependency after confirming with the user there was no existing tabs primitive in this codebase. `AdminActionsMenu` (takes a caller-computed `deleteDisabled: boolean`), `AddAdminModal` (reuses `GeneratedPasswordPanel` from the Activators page), `EditAdminModal`, `AdminAccountsTab`, `CommissionCell` (inline click-to-edit), `CommissionMatrixTab`, `AddPlanModal` (enum-driven dropdowns), `SubscriptionPlansTab`, `CompanyModal` (shared create/edit), `DeliveryCompaniesTab`.

### Pages composed statically
All five pages (`ActivationsPage`, `ActivationDetailPage`, `StatisticsPage`, `SettingsPage`, `LogsPage`) rewritten from Sprint 1's `<></>` stubs into static compositions of the above primitives, each region hardcoded to its `isLoading` state (no hooks yet — wired in Sprint 3/4/5 per plan §D3). `SettingsPage` renders exactly 4 tabs, confirming §E-1.

## Validation results
- `npm run check` (both `tsconfig.json` and `tsconfig.test.json`) ✅ clean.
- `npx vitest run` ✅ 48/48 files, 356/356 tests green (unchanged baseline — this sprint adds no test files, per the tests-last plan).
- `npx eslint src --fix`: fixed ~29 pure-Prettier findings in Sprint 2's own files plus the `react-refresh/only-export-components` warning on `WilayaHeatmap.tsx` (fixed via the `heatmap-color-scale.ts` extraction above). **The same command also reformatted ~20 unrelated pre-existing files elsewhere in `src` (Prettier reflow only, verified via diff — no logic changes)** because it was run across the whole tree instead of scoped to this sprint's files; those files were reverted with `git checkout --` before committing, so they don't appear in this sprint's diff.
- Browser verification (Playwright, headless Chromium, `sv_test_admin`/seeded credentials against the live local API): all 5 pages screenshot cleanly with correct skeletons/layouts; Settings tab switching confirmed working (Admin Accounts → Delivery Companies → Subscription Plans); Add Plan modal opens with both enum dropdowns rendering; heatmap renders a correctly-shaped, recognizable Algeria with all 58 wilaya boundaries visible and the correct neutral loading fill (no tooltip during the static loading state, expected — `byLibName` is empty with no `data`).

## Decisions & deviations

- **Two real bugs found only via browser screenshot** (neither `tsc`, `eslint`, nor `vitest` catches SVG-attribute corruption or invalid CSS paint values):
  1. **SVG path corruption** — ~39 of 58 wilayas (all `<path>`-tag ones) threw `Error: <path> attribute d: Expected moveto path command` in the console and rendered as broken/missing shapes. Root cause: the Node extraction script's `d="([\s\S]*?)"\s*\/>$"` regex had no word boundary, so it matched the `"d="` substring **inside** `id="_x30_2_Chlef"` (since `"id"` ends in `"d"`), capturing garbage JSX text from there through to the tag's real closing quote. Fixed by rewriting the regex with `\b` word boundaries on both the `id=` and coordinate attributes, plus added a sanity check (path coords must start with `M`/`m`, polygon coords must start with a digit/minus) that throws immediately if any of the 58 entries look suspicious. Re-ran extraction, all 58 passed, regenerated `wilaya-geometry.ts`.
  2. **Solid-black heatmap** — after fixing (1), the map rendered as an entirely solid black silhouette. Root cause: this codebase's CSS custom properties are **raw oklch component triples** (e.g. `--muted: 0.96 0.01 295`), not complete color values, but `WilayaHeatmap.tsx` used the literal string `"var(--muted)"` for the loading fill and `"var(--primary)"`/`"var(--border)"` for stroke — unwrapped, these resolve to invalid SVG paint, which browsers fall back to rendering as black. Fixed by wrapping all three as `oklch(var(--...))`, matching the existing correct pattern already used elsewhere (e.g. `PerformanceChart.tsx`'s `stroke="oklch(var(--primary))"`). Grepped the rest of Sprint 2's new files for the same mistake — found none elsewhere.
- **`@radix-ui/react-tabs` added as a new dependency** — this codebase had no existing tabs primitive; the user was asked rather than having one unilaterally picked, and approved adding Radix (consistent with every other `components/ui/*` wrapper already being Radix-based).
- **`eslint --fix` scope discipline** — running it unscoped (`eslint src --fix`) reformatted unrelated pre-existing files across the repo; those changes were identified via `git status`/`git diff` and reverted before staging, so this sprint's commit contains only Sprint 2's actual work. Future sprints should scope `--fix` to the sprint's touched paths to avoid this.
- No architecture shift — `plan.md` untouched.
