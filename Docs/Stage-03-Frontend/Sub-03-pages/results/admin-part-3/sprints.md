# Admin Panel · Part 3 — Page Assembly Sprint Plan (SV-PAGE-014 → 018)

> **Stage 03 · Sub-03 · Phase 02 (Sprint Planning).** No code yet — a build playbook.
> **Source plan:** [results/admin-part-3/plan.md](./plan.md) · **Phase file:** [stage-03-sub-03-phase-02-sprints.md](../../stage-03-sub-03-phase-02-sprints.md) · **Rules:** [front-end-rules.md](../../../front-end-rules.md), [front-end-test-rules.md](../../../front-end-test-rules.md) · **Contract:** `@my-app/contract`
> **Governance:** rules = HOW · phase = WHAT/WHEN · contract = WHICH. HOW conflicts resolved toward the rules/explicit instruction and noted.

---

## Ordering & program shape

Required global order: **Foundation → Primitives & States → Assembly & Wiring → Polish → Tests** (UI before wiring; wiring never precedes primitives). This part is **5 pages, no new shell**, but carries the two heaviest artifacts of the whole sub-stage — the **Algeria Wilaya Heatmap** (vendored + rebuilt) and the **4-tab Settings** page (write-heavy). So Assembly splits three ways; Primitives stays one sprint (mechanical — the shared library exists). **Seven sprints, five phases** (same count as Part 1):

| Phase | Sprints | Scope |
|-------|---------|-------|
| 1 · Foundation | **S1** | 7 schemas · i18n (5 namespaces + enums) · 5 lazy routes + stubs |
| 2 · Primitives & States | **S2** all five pages | dumb components, skeletons, empty/error, chart wrappers, **heatmap geometry vendoring**, Settings tab shells |
| 3 · Assembly & Wiring | **S3** Activations + Detail + Logs · **S4** Statistics + Heatmap · **S5** Settings (4 tabs) | page components, `useQuery`/`useMutation`, RHF, action-gating |
| 4 · Polish | **S6** | responsive (desktop-first), a11y, `useMemo` per plan §B8, dark-mode heatmap gradient |
| 5 · Tests | **S7** | all five pages, `/tests/unit/**` with `vi.mock` on hooks |

**Dependency spine:** S1 → S2 → {S3, S4, S5} → S6 → S7. Assembly needs primitives (S2 builds all of them up-front). Assembly split by write-surface/risk — the **read-centric trio** (Activations 3 mutations · Detail 1 · Logs 0) share **S3**; **Statistics + Heatmap** get **S4** (the heatmap's color-scale, name-matching join, tooltip and drilldown are the concentrated risk); **Settings** gets **S5** alone (4 tabs, ~11 mutations, one-time secrets, self/last-admin guards).

> Levers if a different shape is wanted: merge S3 into S4/S5 for ~6 (read pages are light), or split S2 primitives (heatmap vs the rest) for ~8. Kept at 7 to match Part 1's proven cadence for a comparably-sized part.

### Execution protocol (applies to every sprint)
- **Per-sprint gates (non-negotiable, in each Validation block):** ① no inline JSX strings — all copy via `useTranslation` (plan §B6); ② `tsc --noEmit` clean (both `tsconfig.json` + `tsconfig.test.json`); ③ no `useEffect` for fetching (rules §2); ④ layout survives `isError`/`isLoading` with a **localized** fallback, never full-page — Statistics is **per-chart**, never a page-wide swap (rules §4); ⑤ existing Vitest suite stays green; ⑥ no test files under `/src`.
- **Tests-last reconciliation:** page `.test.tsx` files are authored in **S7**; S2–S6 keep the existing suite green plus gates ①–④. Every S2–S5 component is built test-ready (props-driven, hooks isolable) so nothing blocks S7.
- **Commit convention (project memory):** on green, `git add` **the touched paths only** then commit `Sprint N: <Title>` — no co-author trailer; update docs (this file's Status + the sprint report) before committing. **Never `git add .`** — the stray untracked `Docs/Stage-00-Conception/react-algeria-map` is the heatmap *source*; we copy geometry **out** of it into `Apps/web/src`, and must not stage the source repo.
- **Guardrails from the plan (the §F deviations are intentional — do NOT "fix" them):**
  - **Settings Tabs 5 & 6 are omitted** (no `settings` contract module) — do not fabricate a timeout/active-hours endpoint or hook. The `SettingsPage` ships **4 tabs** (§E-1, user decision).
  - **Activation Detail** distributor block + card key stay **plain text** (DTO has no distributor id / card key) — only the activator `<Link>` resolves (§E-2). Don't invent ids.
  - **Statistics period** maps spec labels to the nearest `StatisticsPeriod` enum member (§E-3) — don't add rolling members locally.
  - **Heatmap:** vendor the 58-wilaya **geometry only**; do **not** npm-install `react-algeria-map`, copy its `Map.css` global-CSS-var approach, or its Storybook/build config (§D3.5). The lib-name↔`wilayaName` normalization table **must** be unit-tested for all 58 (§E-5).
  - Missing contract data is an upstream fix (plan §E), never a local patch (rules §2).
- **Naming reconciliations locked (plan §B1/§B2):** `useAdminActivations` / `useActivationDetail` / `useSetActivationPrice` (not the spec's `useActivations`/`useActivationDetail`/`useSetActivatorPrice`); Add-Plan pickers are **enum-driven**; camelCase `{items,meta}`/`limit`; test files are `.test.tsx`.
- **Status legend:** ⬜ Pending · 🟨 In progress · ✅ Done.

---

## PHASE 1 — FOUNDATION

### Sprint 1: Foundation — Schemas, i18n & Routes   — Status: ✅ Done

**Goals**
- All 7 co-located Zod schemas exist and their output is assignable to the matching contract Command.
- All Part-3 translation keys present (EN/FR real copy, `ar:""`).
- The 5 routes mount as `React.lazy()` stubs under the existing `AdminGuard`; `tsc` + existing suite pass with zero page UI built.

**Tasks**
- [x] Co-located schemas (#schema), each with a compile-time `AssertAssignable` to its Command: `set-activator-price` (→ `SetActivatorPriceCommand`, `amount` ≥0 `.multipleOf(0.01)`); `create-admin` (`fullName` 3–100, `username` 3–30 `^[A-Za-z0-9_]+$`, `phone` `^(?:\+213|0)(5|6|7)\d{8}$`) + `update-admin` (all optional); `create-subscription-plan` (`subscriptionType`/`subscriptionDuration` `z.enum`); `create-delivery-company` + `update-delivery-company` (`name`, `registeredName`); `commission-cell` (→ `UpdateCommissionCommand`: `subscriptionPlanId`, `commissionDurationId`, `commission` ≥0 `.01`). Coerced-number fields use the Part-1 `z.input`/`z.infer` split.
- [x] i18n keys (#i18n): `admin.activations.*`, `admin.activationDetail.*`, `admin.statistics.*` (incl. `admin.statistics.period.*`, `admin.statistics.colorMode.*`), `admin.settings.*`, `admin.logs.*`; enum labels `enums.subscriptionType.*`, `enums.subscriptionDuration.*`, `enums.logActionType.*` (13 values). Reuse `enums.activationStat.*`/`enums.cardStat.*` (Parts 1–2). Flat key → `{ en, fr, ar:"" }`. 169 new keys.
- [x] Route scaffolding (#routing): register `/admin/activations`, `/admin/activations/:id`, `/admin/statistics`, `/admin/settings`, `/admin/logs` with `React.lazy()` stubs (`<></>`), inside `<Suspense fallback={<PageLoader/>}>`, under the existing `AdminGuard`/`AdminLayout`. `/admin/activations/:id` declared **after** Part-2's static `/admin/activations/sets-lots` + `/cards` siblings (static-over-dynamic ranking, same pattern as Part-2's `/orders` vs `/distributors/:id`).

**Validation**
- [x] No inline strings. / [x] `tsc --noEmit` clean (both configs). / [x] Each schema assignable to its Command (assertion compiles).
- [x] Lazy routes resolve to stubs; `:id` doesn't shadow the Part-2 static activation routes; existing Vitest green; no `/src` tests. / [x] Committed on green (scoped `git add`).

**Risks**
- `/admin/activations/:id` vs Part-2 static siblings — confirm ranking.
- `z.coerce.number()` input/output typing (Part-1 pattern mitigates).

---

## PHASE 2 — PRIMITIVES & STATES

### Sprint 2: Primitives & States — all five pages (+ heatmap vendoring)   — Status: ✅ Done

**Goals**
- Every "dumb" component for all five pages renders from props with a `Skeleton` loader and localized empty/error fallback — no hooks, no data, no validation. Chart wrappers, the vendored heatmap geometry, and the Settings tab shells all exist and render statically. Existing suite + `tsc` green.

**Tasks** *(all #ui; test-ready, no hook calls)*
- [x] **Activations** (`pages/admin/activations/components/`): `ActivationsStatsRow` (+ `ByStateDonut` shell), `ActivationsFilters`, `ActivationsTable` (`DataTable` cols + `StatusBadge` + `LiveTimer` durations), `ResolveFreezePanel` (static, reused shared `ResolveFreezeDialog` extended with optional `reason`), `SetActivatorPriceModal` (static), `ActivationActionsMenu`.
- [x] **Activation Detail** (same dir): `ClientBlock`, `DistributorBlock` (text, no link — §E-2), `ActivatorBlock` (link slot), `SubmittedInformationList`, `ActivationTimeline` (WRONG/ADDITIONAL/FREEZE row variants), `CardHistoryTimeline`, `FinancialBlock`.
- [x] **Logs** (`pages/admin/logs/components/`): `LogsFilters`, `LogsTable`, **`LogActionBadge`** (icon+tone per the 13 `LogActionType`s, shared, §B9), relative-time cell (`formatRelativeTime` added to `lib/utils.ts`).
- [x] **Statistics** (`pages/admin/statistics/components/`): thin `recharts` wrappers `ActivationsOverTimeChart`/`AvgTimeTrendChart`/`RevenueOverTimeChart` (Line), `ActivationsByStateDonut` (Pie), `TopActivatorsBar`/`TopDistributorsBar` (horizontal Bar) — each with an empty-state branch; `StatisticsFilterBar`.
- [x] **Heatmap vendoring** (#ui, the risk-bearing primitive): `WilayaHeatmap.tsx` — copied the 58 `<g><polygon|path/></g>` **geometry + viewBox** from `react-algeria-map`'s legacy `Map.jsx` into `wilaya-geometry.ts` via a Node extraction script; **dropped** the global CSS-var `useEffect`; props typed for `data`/`colorMode`/`onWilayaSelect`. `wilaya-name-map.ts` (NFD-normalization + diacritic/apostrophe folding, all 58). `HeatmapLegend`, `HeatmapColorModeSelect`, `WilayaDrilldownPanel` (static), hover-tooltip shell. `heatmap-color-scale.ts` split out to satisfy `react-refresh/only-export-components`.
- [x] **Settings** (`pages/admin/settings/components/`): `SettingsPage` tab host with **4** `ui/tabs` (new `@radix-ui/react-tabs` dependency, user-approved); static `AdminAccountsTab`/`CommissionMatrixTab` (+ `CommissionCell`)/`SubscriptionPlansTab`/`DeliveryCompaniesTab`; static `AddAdminModal`/`EditAdminModal`/`AddPlanModal`/`CompanyModal`; reuse `GeneratedPasswordPanel`.
- [x] Wire each region's three states: `isLoading`→Skeleton/`ChartSkeleton`/neutral-outline map; empty→`EmptyState`; `isError`→`NotFoundState`+Retry slot.

**Validation**
- [x] Every primitive renders from props; loading/empty/error branches present + localized. / [x] Heatmap renders all 58 wilayas from static data; name-map covers all 58. / [x] No inline strings; no `useEffect` fetching. / [x] `tsc` clean (both configs); existing Vitest green (356/356); no `/src` tests. / [x] Committed on green (scoped add — **not** the `react-algeria-map` source, and not the unrelated pre-existing files collaterally touched by a repo-wide `eslint --fix`, which were reverted before committing).

**Risks**
- Heatmap SVG is large — keep geometry in its own module; verify the viewBox renders undistorted in our container.
- `DataTable` renders desktop+mobile together in JSDOM (S7 disambiguation).

---

## PHASE 3 — ASSEMBLY & WIRING

### Sprint 3: Assembly & Wiring — Activations + Detail + Logs   — Status: ✅ Done

**Goals**
- The three read-centric pages fully live: Activations (stats + donut + filterable/paginated table + resolve-freeze + set-price), Activation Detail (sectioned read-only + set-price), Logs (filterable/paginated audit trail). Layout survives every region's loading/error. `tsc` + existing suite green.

**Tasks**
- [x] `ActivationsPage` (#wiring): `useActivationsSummary()` (4 cards + `ByStateDonut`); `useAdminActivations({...})` with `useDebouncedValue` key search + filters (`useSubscriptionPlans`/`useActivators`/`useDistributors`/`useWilayas`/`useCommunes`) + `SimplePagination`; seed `?activator/?distributor/?state` once from `useSearchParams`.
- [x] Activations actions (#wiring): `ActivationActionsMenu` gated — Resolve only if `state===FREEZE` (→ `ResolveFreezeDialog` → `useActivateByAdmin`/`useCancelByAdmin` confirmed, already correctly gated since Sprint 2); Set Activator Price only if completed **and** `activationPrice==null` (`set-activator-price` schema → `useSetActivationPrice.mutate({id,command})`). `SetActivatorPriceModal` upgraded from its Sprint-2 static shell to real RHF+Zod (mirrors `RecordPaymentModal`'s pattern).
- [x] `ActivationDetailPage` (#wiring): `useActivationDetail(id)` (`enabled`); render all present sections; **activator `<Link>`** (id present), distributor/card as text (§E-2); invalid-id/error → `NotFoundState`+back; reuse `SetActivatorPriceModal`.
- [x] `LogsPage` (#wiring): `useLogs({...})` debounced description search + `userId` (`useAdmins`) + `actionType` (enum) + date range + `SimplePagination`; `LogActionBadge` per row; relative time.
- [x] `useMemo` column defs (already in place from Sprint 2's table components); rely on in-hook invalidation + global toast (`query-client.ts`'s `MutationCache.onError`).

**Validation**
- [x] No `useEffect` fetching; failed writes → global toast, panel/modal preserved. / [x] Action gating correct (Resolve/Set-Price). / [x] Invalid activation id handled locally. / [x] Layout survives loading/error. / [x] `tsc` clean (both configs); existing Vitest green (356/356). / [x] Committed on green.

**Risks**
- Set-Price gating (completed **and** unpriced) — two-condition check.
- Activation-detail reduced links — render text, don't fabricate ids.

---

### Sprint 4: Assembly & Wiring — Statistics + Heatmap   — Status: ✅ Done

**Goals**
- `StatisticsPage` fully live: 6 pre-aggregated charts, the interactive 58-wilaya heatmap (color-mode gradient + rich tooltip + click-drilldown), all re-fetching on the filter bar. Per-chart loading/empty/error; map neutral-outline/lowest-shade/outline+retry. `tsc` + existing suite green.

**Tasks**
- [x] Filter bar (#wiring): period, `useSubscriptionPlans`, `useWilayas` → drive one `useStatisticsOverview({period,dateFrom?,dateTo?,subscriptionPlanId?,wilayaId?})` call feeding all 6 charts. **Found and fixed a real gap**: Sprint 2's `StatisticsFilterBar` rendered a selectable "Custom Range" period option with no date-range inputs to back it — added conditional `dateFrom`/`dateTo` date inputs (shown only when `period==="custom"`, 2 new i18n keys) so selecting Custom is actually functional, matching the `dateFrom`/`dateTo` conditionally-sent-only-for-custom pattern in the page.
- [x] Charts (#wiring): bound all 6 series to their wrappers off the single `overviewQuery`; each already had its own `ChartSkeleton`/empty/error branch from Sprint 2.
- [x] Heatmap data (#wiring): `useWilayaHeatmap({period,subscriptionPlanId?})` passed straight to `WilayaHeatmap`, which already does the name-join + purple scale + tooltip internally (built Sprint 2); `WilayaHeatmapQuery` has no `wilayaId`/`dateFrom`/`dateTo` fields in the contract, so the heatmap only reacts to period+plan, unlike the 6 charts.
- [x] Drilldown (#wiring): `WilayaHeatmap`'s `onWilayaSelect` callback already resolves to a full `WilayaHeatmapEntry` (with real `wilayaId`) internally via its own name-join — no separate name→id resolution needed at the page level; `useWilayaDrilldown(selectedWilaya?.wilayaId ?? "", {period})` (`enabled` off empty id) → `WilayaDrilldownPanel`.
- [x] States (#wiring): all three (loading/empty/error) already built per-region in Sprint 2's primitives; no changes needed.

**Validation**
- [x] One overview query per filter change (6 charts share it). / [x] Heatmap/drilldown wired to real hooks; name-join logic unchanged from Sprint 2 (dedicated all-58 test deferred to S7 per plan). / [x] No `useEffect` fetching; per-chart (not page) fallbacks. / [x] `tsc` clean (both configs); existing Vitest green (356/356). / [x] Committed on green.

**Risks**
- **Name-matching** lib↔DTO (accents/spelling) — the §E-5 table is the single point of failure; unit-tested in S7.
- Color-scale edge cases (all-equal values, nulls for avgTime) — clamp/neutral.

---

### Sprint 5: Assembly & Wiring — Settings (4 tabs)   — Status: ✅ Done

**Goals**
- `SettingsPage`'s four supported tabs fully live with confirmed, guarded mutations and one-time secrets; each tab lazy-loads on first visit. Tabs 5/6 remain omitted (§E-1). `tsc` + existing suite green.

**Tasks**
- [x] Tab host (#wiring): `ui/tabs` with 4 triggers; **architecture call**: each tab component is self-contained (calls its own hooks directly, mirroring the CreateOrderModal/heatmap convention) rather than the page fanning out props — combined with Radix `TabsContent` unmounting inactive panels by default, this is what actually gives "query enabled on first activation, no upfront fan-out," with zero manual `enabled` flags needed. `SettingsPage` itself is now just the 4 `<TabsContent>` mounts.
- [x] **Admin Accounts** (#wiring #forms): `useAdmins({page:1,limit:100,search})`; `AddAdminModal` (`create-admin` → `useCreateAdmin` → one-time `GeneratedPasswordPanel`); `EditAdminModal` (`update-admin` → `useUpdateAdmin`); `useToggleAdmin`; `useResetAdminPassword` (one-time reveal, built as a second reveal-step inside the same confirm `AlertDialog`); `useDeleteAdmin` — **Delete disabled for self (`useSession` id) and when list length===1** (§B5), now with a `title` tooltip explaining which guard is active.
- [x] **Commission** (#wiring #forms): `useCommissions()` matrix — **`useCommissionDurations()` turned out unnecessary**: `CommissionMatrixDTO.tiers` already embeds the tier headers, so no second call was needed. Inline `CommissionCell` (`commission-cell` schema → `useUpdateCommission`); save-fail → cell exits back to the read-only view showing the last known-good value in red (reverts naturally since a failed mutation never invalidates the query cache); in-tab "future activations only" note (unchanged from Sprint 2).
- [x] **Subscription Plans** (#wiring #forms): `useSubscriptionPlans({})` (no `active` filter — admins must see and re-enable disabled plans too); `AddPlanModal` (enum-driven `subscriptionType`/`subscriptionDuration` via RHF `Controller`, since shadcn's `Select` isn't register()-able → `useCreateSubscriptionPlan`); `useToggleSubscriptionPlan`.
- [x] **Delivery Companies** (#wiring #forms): `useDeliveryCompanies({})`; `CompanyModal` (`create`/`update-delivery-company` → `useCreateDeliveryCompany`/`useUpdateDeliveryCompany`); `useToggleDeliveryCompany`.

**Validation**
- [x] Tab bar shows exactly 4 tabs. / [x] One-time passwords revealed once (create + reset). / [x] Self/last-admin Delete disabled; tooltip explains why. / [x] Commission cell revert-on-error (verified via mutate onError path). / [x] No `useEffect` fetching (the two `useEffect`s that exist are reset-on-open form hygiene, not fetching). / [x] `tsc` clean (both configs); existing Vitest green (356/356). / [x] Committed on green.

**Risks**
- Commission matrix cell state (optimistic edit vs revert) — keep edit local until save resolves.
- Self/last-admin gating races — UI disables, backend enforces, toast covers the rest.

---

## PHASE 4 — POLISH

### Sprint 6: Polish — responsive, a11y, memoization, dark-mode heatmap   — Status: ✅ Done

**Goals**
- Desktop-first responsive pass, a11y on icon-only controls + the SVG map, memoization per plan §B8, semantic tokens incl. a **dark-mode heatmap gradient**, honest deviation copy. No behavior change. `tsc` + existing suite green.

**Tasks**
- [x] a11y (#a11y): audited every icon-only button/menu-trigger across all 5 pages — all already had `aria-label`s from S2-S5 (Activations/Settings action menus, filter clears via visible text, color-mode select). **Real gap found and fixed**: the heatmap SVG had `role="img"` on the outer `<svg>`, which makes *all descendants opaque to assistive tech* (role="img" is an atomic-leaf role) — wrong for a composite of 58 individually-clickable wilayas. Changed the outer svg to `role="group"`, and each wilaya's `<g>` now gets `role="button"`, `aria-label` (the resolved `wilayaName` when data exists), `tabIndex={0}` (only for wilayas with data — "keyboard-focusable where feasible"), and an `onKeyDown` handler (Enter/Space) plus `onFocus`/`onBlur` mirroring the existing hover-tooltip behavior so keyboard users get the same tooltip keyboard-equivalently. Charts already had accessible `<h3>` titles (matches Part-1's `PerformanceChart` precedent — no extra ARIA needed beyond a preceding heading).
- [x] Heatmap dark mode (#theming): **real gap found and fixed** — `purpleShade()`'s light-end (`L=0.95`, near-white) was a fixed absolute value that didn't adapt to the dark theme's `--card`/`--muted` (`L≈0.2-0.25`, `.dark` block in `index.css`), so in dark mode the "low value" wilayas would render a jarring bright near-white patch against dark surfaces. `purpleShade` now takes an `isDark` param and picks between two L/C bound sets (light: 0.95→0.35, dark: 0.28→0.78) so the "low blends into the surface, high pops" relationship holds in both themes instead of just light. `WilayaHeatmap`/`HeatmapLegend` read `next-themes`' `useTheme().resolvedTheme` (same hook already used by `ThemeToggle.tsx`) and pass `isDark` through.
- [x] Memoization audit (#perf): confirmed every `ColumnDef[]` across all 5 pages is already `useMemo`'d (grepped all `ColumnDef` usages, zero missing); heatmap's `byLibName`/`{min,max}` already memoized on `[data]`/`[data,colorMode]` since Sprint 2. No changes needed — already correct.
- [x] Responsive (#responsive): `DataTable`'s `overflow-x-auto` wrapper (fixed in Part-1 S6) already covers all wide tables. **Real gap found and fixed**: `ui/tabs.tsx`'s `TabsList` was `inline-flex h-10` (fixed height, no wrap) — 4 tab triggers with longer French labels ("Sociétés de livraison") could overflow/clip at narrower desktop widths. Changed to `h-auto min-h-10 flex-wrap` with a `gap-1` so the triggers wrap onto a second row instead of clipping.
- [x] Honest copy (#i18n): confirmed no strings anywhere imply Timeout/Active-Hours tabs exist (only a code comment, not user-facing copy); period labels already correctly reflect the §E-3 calendar mapping since Sprint 1 (no changes needed).

**Validation**
- [x] No inline strings introduced. / [x] `tsc` clean (both configs); existing Vitest green (356/356). / [x] No behavior change to any wired query/mutation flow — every fix this sprint is presentational/accessibility/theming; pre-existing out-of-scope issues (e.g. `LoginPage.tsx`'s role-redirect, long-flagged) left untouched. / [x] Committed on green.

**Risks**
- Scope creep — flag, don't fix, adjacent pre-existing issues.

---

## PHASE 5 — TESTS

### Sprint 7: Unit Tests — all five pages (+ heatmap name-map)   — Status: ⬜ Pending

**Goals**
- One `.test.tsx` per page under `/tests/unit/pages/{activations,activation-detail,statistics,settings,logs}/` + a dedicated `wilaya-name-map` test, hooks + `useTranslation` mocked (no MSW). All green; both tsconfigs clean.

**Tasks**
- [ ] `activations/ActivationsPage.test.tsx` (#testing): stats/donut skeletons; empty vs no-match; retry⇒`refetch`; gating (Resolve only FREEZE; Set-Price only completed+unpriced) ⇒ correct `mutate`; URL pre-filter seeding.
- [ ] `activation-detail/ActivationDetailPage.test.tsx` (#testing): invalid-id⇒`NotFoundState`+back; timeline WRONG/ADDITIONAL/FREEZE variants; activator-null empty; activator `<Link>` present, distributor rendered as text (documents §E-2); set-price⇒`mutate`.
- [ ] `statistics/StatisticsPage.test.tsx` (#testing): filter change re-issues overview with mapped `period`; per-chart empty/error+retry; color-mode switch changes the metric→shade mapping; wilaya click⇒`useWilayaDrilldown` enabled + panel; assert empty-state branch, not recharts/SVG internals.
- [ ] `settings/SettingsPage.test.tsx` (#testing): tab bar has exactly 4 tabs; admin add⇒one-time password; self/last-admin Delete disabled; commission cell edit⇒`useUpdateCommission` + revert-on-error; Add-Plan enum dropdowns⇒`useCreateSubscriptionPlan`; company add/toggle.
- [ ] `logs/LogsPage.test.tsx` (#testing): skeleton; empty vs no-match+Clear; retry⇒`refetch`; user + action-type filters mutate query; `LogActionBadge` per type; relative time.
- [ ] `lib/wilaya-name-map.test.ts` (#testing): **all 58** lib wilaya names resolve to a `wilayaName`/id (no drops) — the §E-5 safety net.
- [ ] Reuse Part-1 shared infra (`mockTranslation`/`renderWithRouter`/`setup.ts` polyfills+cleanup); Radix `Select` via `getByRole('option',{name})`; scope ambiguous keys with `within()`.

**Validation**
- [ ] `vitest run` green (success/loading/error). / [ ] No `/src` tests; files `.test.tsx`. / [ ] Both tsconfigs clean. / [ ] Committed on green.

**Risks**
- Charts/heatmap under JSDOM — assert data/empty branches, mock the chart container (Part-1 precedent); the name-map test is pure data (no DOM).

---

## Net-new artifact recap (from plan §G, sprint-mapped)

| Sprint | Artifacts |
|--------|-----------|
| S1 | 7 `.schema.ts` (set-activator-price, create/update-admin, create-subscription-plan, create/update-delivery-company, commission-cell); i18n (5 ns + enums); 5 lazy routes + stubs |
| S2 | all `components/` primitives for the 5 pages; `LogActionBadge`; recharts chart wrappers; **`WilayaHeatmap.tsx` (vendored geometry)** + `wilaya-name-map.ts` + `HeatmapLegend`/`HeatmapColorModeSelect`/`WilayaDrilldownPanel` shells; Settings 4-tab shells + modals |
| S3 | live `pages/admin/activations/{ActivationsPage,ActivationDetailPage}.tsx`, `pages/admin/logs/LogsPage.tsx` |
| S4 | live `pages/admin/statistics/StatisticsPage.tsx` (6 charts + heatmap color/tooltip/drilldown wired) |
| S5 | live `pages/admin/settings/SettingsPage.tsx` (4 tabs + ~11 mutations wired) |
| S6 | a11y/responsive/memo/dark-mode-heatmap polish across all five |
| S7 | `/tests/unit/pages/{activations,activation-detail,statistics,settings,logs}/*.test.tsx` + `lib/wilaya-name-map.test.ts` |

**Reused (build nothing):** every hook in plan §B1/§D, the whole §B7 shared set, the Part-1 shell, `useDebouncedValue`, `recharts`, `StatusBadge`/`CardStatusBadge`, `GeneratedPasswordPanel`, `lib/query-keys.ts`, and the `tests/fixtures/wrappers` infra.
**Not vendored:** `react-algeria-map`'s `Map.css`, Storybook, build config — geometry only (§D3.5); the source repo stays untracked and unstaged.
