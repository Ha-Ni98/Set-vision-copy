# Admin Panel · Part 3 — Page Assembly Plan (SV-PAGE-014 → 018)

> **Stage 03 · Sub-03 · Phase 01 (Planning).** No code — audit + plan only.
> **Pages:** Activations management · Activation detail · Statistics (+ Algeria Wilaya Heatmap) · Settings (6 tabs) · Logs
> **Routes:** `/admin/activations` · `/admin/activations/:id` · `/admin/statistics` · `/admin/settings` · `/admin/logs`
> **Inputs:** [SV-PAGE-014-018_admin_part3_spec.md](../../../../Stage-00-Conception/Pages-Requirements/SV-PAGE-014-018_admin_part3_spec.md) · [front-end-rules.md](../../../front-end-rules.md) · [front-end-test-rules.md](../../../front-end-test-rules.md) · `@my-app/contract` · existing `Apps/web/src/hooks` + `Apps/api` · [react-algeria-map](../../../../Stage-00-Conception/react-algeria-map) (heatmap source)
> **Governance:** rules = HOW · phase file = WHAT/WHEN · contract = WHICH. HOW conflicts resolved toward the rules and noted in §B; genuine WHICH conflicts escalated. Part 1's shell + conventions and Part 2's state machine apply here **unchanged** (spec preamble).

---

## A. Session decisions (applied under standing governance)

The spec preamble defers shell/conventions/state-handling to Parts 1–2, whose decisions still govern. No new question was escalated — the one sizeable gap (Settings timeout/active-hours) is handled by the standing "plan against what exists" decision, but is surfaced loudly (§E-1) for a possible descope call:

| # | Point | Decision | Basis |
|---|-------|----------|-------|
| 1 | Output granularity | **One combined set-level `plan.md`**, folder `admin-part-3`. | Parts 1–2 precedent. |
| 2 | Reduced-fidelity DTOs (Activation detail; stats-period mapping) | **Plan against what exists today**, log every deviation (§F). | Part 1 decision #2, carried by preamble. |
| 3 | Add-Plan type/duration pickers | Populate from the **contract enums** (`SubscriptionType`, `SubscriptionDuration`) with i18n labels — the spec's separate `GET /subscription-types|durations` endpoints don't exist and aren't needed. | Contract = WHICH. |
| 4 | **Settings Tabs 5 (Inactivity Timeout) & 6 (Active Hours)** — no contract/hook/route at all | **Build only the 4 supported tabs; omit Tabs 5 & 6 from the tab bar entirely** until a settings contract module lands (user decision). Documented as the primary upstream gap (§E-1). | Rules §2 (missing = upstream fix, never local patch) + explicit user call (omit-until-contract). |
| 5 | Heatmap | **Vendor the 58-wilaya SVG geometry** from `react-algeria-map` into a typed TSX component; rebuild props/coloring/tooltip/interaction (§D3.5). Not added as an npm dependency. | User instruction ("plan what we copy / change"); it's an untracked local repo. |

**Audit headline:** **4 of 5 pages + 4 of 6 Settings tabs map cleanly onto existing Sub-02 hooks + contract DTOs.** Every read/write for Activations, Activation-detail, Statistics (all 6 charts + heatmap + drilldown), Logs, Admin accounts, Commission, Subscription plans, and Delivery companies exists (verified `Apps/web/src/hooks` + `Apps/api/src/modules`). The **only hard gap is Settings Timeout/Active-Hours** (§E-1) — **omitted from this part per user decision**, to be built when the contract module lands; everything else is a documented reduced-fidelity or notation reconciliation. No new libraries (`recharts` present since Part 1).

---

## B. Cross-cutting resolutions (apply to every page)

### B1. Hook-name reconciliation (spec name → real export) — no new hooks needed for the working scope
| Spec calls it | Real export (file) | Note |
|---|---|---|
| `useActivations` | `useAdminActivations(query)` — `useAdminActivations.ts` | `GetActivationsQuery` carries every spec filter (plan/activator/state/distributor/wilaya/commune/dates/key) |
| `useActivationDetail` | `useActivationDetail(id)` — `useAdminActivations.ts` | `enabled: !!id`; `ActivationDetailDTO` (reduced — §E-2) |
| `useActivateActivationByAdmin` / `useCancelActivationByAdmin` | `useActivateByAdmin()` / `useCancelByAdmin()` | `mutate(id)`; each invalidates activations + activators in-hook |
| `useSetActivatorPrice` | `useSetActivationPrice()` — `useAdminActivations.ts` | `mutate({ id, command })`, `SetActivatorPriceCommand { amount }` |
| `useStatisticsOverview` / `useWilayaHeatmap` / `useWilayaDrilldown` | same names — `useStatistics.ts` | exist verbatim |
| Activations stat cards | `useActivationsSummary()` — `useStatistics.ts` | `ActivationsSummaryDTO { total{all,today,week,month}, byState[], avgDurationSeconds, totalRevenue }` — 1:1 with the 4 spec cards |
| `useSettings` / `useCommissionMatrix` | `useCommissions()` (matrix) + `useCommissionDurations()` (tier headers) — `useSubscriptionPlans.ts` | commission part of "settings" is standalone; timeout/active-hours **absent** (§E-1) |
| `useSubscriptionTypes` / `useSubscriptionDurations` | **none** — use the `SubscriptionType`/`SubscriptionDuration` **enums** | Add-Plan dropdowns are enum-driven (decision #3) |
| all admin/plan/company writes | `useCreateAdmin`/`useUpdateAdmin`/`useToggleAdmin`/`useResetAdminPassword`/`useDeleteAdmin`; `useCreateSubscriptionPlan`/`useToggleSubscriptionPlan`; `useCreateDeliveryCompany`/`useUpdateDeliveryCompany`/`useToggleDeliveryCompany`; `useUpdateCommission` | all exist, all self-invalidate in-hook |
| `useUpdateTimeout` / `useUpdateActiveHours` | **none** (§E-1) | Tabs 5/6 deferred |

### B2. Field & pagination notation (spec → contract) — resolved toward the contract
Same standing reconciliation as Parts 1–2: pagination is `paginated()` → `{ items, meta:{page,limit,total,totalPages} }` (not `records`/`total_pages`), page size is **`limit`** (not `per_page`); fields are **camelCase** (`actionType`, `actionDescription`, `userName`, `activatorFullName`, `distributorStoreName`, `durationSeconds`, `activationPrice`, `commissionTierLabel`). The `/admin` prefix lives in `VITE_API_URL`.

### B3. Header stat sums come from summary hooks, not the list response
- **Activations** header (4 cards + by-state donut) → `useActivationsSummary()`; the table (`useAdminActivations`) returns records only. Each card/donut + the table load/skeleton/error **independently** (Part 1 pattern).
- **Statistics** page reads only pre-aggregated series (`useStatisticsOverview`) + heatmap/drilldown — no list.

### B4. Forms: co-located schemas refine loose contract commands
Each form → a `[name].schema.ts` whose output is assignable to the contract Command (compile-time `AssertAssignable`, Part 1 pattern):
- **`set-activator-price.schema.ts` → `SetActivatorPriceCommand`** (`amount` ≥0 `.multipleOf(0.01)`) — shared by D1 + D2.
- **`create-admin.schema.ts` → `CreateAdminCommand`** (`fullName` 3–100; `username` 3–30 `^[A-Za-z0-9_]+$`; `phone` `^(?:\+213|0)(5|6|7)\d{8}$`) + **`update-admin.schema.ts` → `UpdateAdminCommand`** (all optional).
- **`create-subscription-plan.schema.ts` → `CreateSubscriptionPlanCommand`** (`subscriptionType`/`subscriptionDuration` z.enum).
- **`create-delivery-company.schema.ts` / `update-delivery-company.schema.ts`** → `Create/UpdateDeliveryCompanyCommand` (`name`, `registeredName`).
- **`commission-cell.schema.ts` → `UpdateCommissionCommand`** (`subscriptionPlanId`, `commissionDurationId`, `commission` ≥0 `.01`) — the inline cell editor.
- **Timeout/Active-Hours schemas: not authored** (no contract command — §E-1). Server-only rules (username uniqueness, self/last-admin delete) surface as mutation errors, not client validation.

### B5. Mutations, toasts, dialogs, guards (uniform behavior)
- Global `mutationCache.onError → toast` already wired; **pages add no per-mutation toasts.** Failed write ⇒ auto toast, modal/panel **stays open, values preserved**; a **backend guard rejection** (resolve-a-no-longer-frozen activation; delete self/last admin) surfaces as that toast.
- Destructive/state-changing actions use `AlertDialog`; the two admin activation resolutions (Activate/Cancel) each confirm and spell the card consequence (→ `ACTIVATED` / `ACTIVATION_FAILED`).
- **Admin self/last-admin delete UX:** disable Delete for the row whose id === `useSession()` admin id, and for **all** rows when the list length is 1 (backend still enforces; the toast covers races).
- Invalidation is hook-owned; pages never call `invalidateQueries`.

### B6. i18n, theme, layout preservation
- **No inline JSX strings.** New namespaces: `admin.activations.*`, `admin.activationDetail.*`, `admin.statistics.*`, `admin.settings.*`, `admin.logs.*`; enum labels `enums.subscriptionType.*`, `enums.subscriptionDuration.*`, `enums.logActionType.*`, `enums.deliveryType.*` (reuse `enums.activationStat.*`/`enums.cardStat.*` from Parts 1–2); `admin.statistics.period.*`, `admin.statistics.colorMode.*`. Flat key → `{ en, fr, ar:"" }`, `ar` reserved-empty. Chart axis/label copy also via `t()`.
- Loading/error/empty are **localized inside the content area**; `AdminLayout` never unmounts (rules §4). Statistics: **per-chart** shimmer/retry, never a full-page swap; the map renders a neutral outline while loading.
- Admin is **desktop-first** (Statistics/charts especially); dark/light via `next-themes` — the heatmap purple gradient needs a dark-mode variant (§D3.5).

### B7. Shared-component reuse map (build little)
| Need | Reuse |
|---|---|
| Stat cards + loader | `StatCard` + `StatCardSkeleton` |
| Tables (desktop+mobile) | `DataTable`; loading `TableSkeleton` |
| Empty / error+retry / detail-404 | `EmptyState` · `NotFoundState` |
| Charts + loading | `recharts` (Line/Bar/Pie-donut) + `ChartSkeleton` |
| Status badges | `StatusBadge` (ActivationStat) **exists**; `CardStatusBadge` **exists** (card history) |
| One-time password reveal | `CopyButton` (+ the Part-1 `GeneratedPasswordPanel` pattern) |
| Relative "2 hours ago" + exact on hover | `LiveTimer` / the Part-1 relative-time helper |
| Page title/tabs/pagination | `PageHeader`, `ui/tabs`, `SimplePagination` |
| Debounced search | `useDebouncedValue` |
| Modals/confirms/selects/forms | `ui/dialog`, `ui/alert-dialog`, `ui/select`, `ui/form`, `ui/input`, `ui/switch` |

### B8. Optimization posture (rules §5)
- **`React.lazy()` + `<Suspense fallback={<PageLoader/>}>`** on all 5 route components.
- `useMemo`: react-table `ColumnDef[]`; the heatmap's per-wilaya `metric → color` scale (recomputed only when data/colorMode change); chart-series adapters only if profiling shows cost (recharts takes series directly). **Debounce** each list search.
- Charts are code-split with the page; the vendored map SVG is a static module (no runtime fetch).

### B9. Net-new shared additions
- **`LogActionBadge`** (or an icon+tone map) for the 13 `LogActionType` values (`enums.logActionType.*`), color-coded per the spec.
- **`WilayaHeatmap`** vendored component (`components/shared/` or `pages/admin/statistics/components/`) — see §D3.5.
- **Donut/бar/line chart wrappers** if the existing chart usage (Part-1 `PerformanceChart`) isn't directly reusable — thin `recharts` wrappers taking pre-aggregated series + an empty-state branch.

---

## C. Routing & shell integration (delta only — shell already exists)

Register 5 lazy routes under the existing `AdminGuard` subtree in `App.tsx`:
`/admin/activations` · `/admin/activations/:id` · `/admin/statistics` · `/admin/settings` · `/admin/logs`.
- **Routing precedence:** `/admin/activations/:id` (this part) is a dynamic sibling of `/admin/activations/sets-lots` and `/admin/activations/cards` (Part 2, static) — React-Router ranks static above dynamic, so those resolve correctly ahead of `:id`; declare all so ranking applies. `/admin/activations` (index) is exact.
- Nav `<Link>`s for all 5 already exist in `config/nav-links.ts` (Part-1 full-nav) — no nav edit. No new guard/layout/socket work.

---

## D. Page plans

### D1 — Activations Management · `/admin/activations` (SV-PAGE-014)
Accepts `?activator=`, `?distributor=`, `?key=`, `?state=` pre-filters. **Read-only except two admin interventions** (resolve FREEZE, set/override price).

**1. Hook & Data Mapping**
| Region | Hook | Notes |
|---|---|---|
| 4 stat cards + by-state donut | `useActivationsSummary()` | Total (`total.all/today/week/month`), by-State donut (`byState[]`), Avg Duration (`avgDurationSeconds`, mm:ss), Total Revenue (`totalRevenue`) — **full fidelity** ✓ |
| Table | `useAdminActivations({ page, limit, subscriptionPlanId, activatorId, state, distributorId, wilayaId, communeId, dateFrom, dateTo, key })` | `PaginatedActivations` → `AdminActivationDTO` (every spec column present) |
| Filters | `useSubscriptionPlans({active:true})`, `useActivators({limit:100,search})`, `useDistributors({limit:100,search})`, `useWilayas()`, `useCommunes(wilayaId)` | commune gated on wilaya |
| Writes | `useActivateByAdmin` · `useCancelByAdmin` · `useSetActivationPrice` | `mutate(id)` / `mutate({id,command})`; in-hook invalidation |
| Nav | View / row → `<Link to="/admin/activations/{id}">` | detail page (D2) |

**2. UI Components** — *New* `pages/admin/activations/ActivationsPage.tsx` + `components/`: `ActivationsStatsRow` (+ `ByStateDonut`), `ActivationsFilters`, `ActivationsTable`, `ResolveFreezePanel` (reason + Activate/Cancel confirms — same two ops as Dashboard's `ResolveFreezeDialog`, reuse if factorable), `SetActivatorPriceModal`, `ActivationActionsMenu`. *Shared:* `StatCard(Skeleton)`, `DataTable`, `TableSkeleton`, `EmptyState`, `NotFoundState`, `StatusBadge`, `SimplePagination`, `LiveTimer` (durations), `ui/dialog`/`ui/alert-dialog`.

**3. Granular States** — loading: stats skeleton + donut `ChartSkeleton` + `TableSkeleton`; empty: "No activations yet." / no-match + Clear; error: table `NotFoundState`+Retry; resolve/set-price fail → toast, panel/modal preserved; resolve of a no-longer-`FREEZE` row → guard toast.

**4. Forms & Mutations** — `set-activator-price.schema.ts` → `useSetActivationPrice.mutate({id, {amount}})`; Resolve = two confirmed parameterless mutations. **Action gating:** View always; Resolve only if `state === FREEZE`; Set Activator Price only if completed (`ACTIVATED`/`ACTIVATED_BY_ADMIN`) **and** `activationPrice == null`.

**5. Optimization** — lazy route; memoized `ColumnDef[]`; debounced key search; seed `activator`/`distributor`/`key`/`state` once from URL.

**6. Unit-Test Strategy** — `/tests/unit/pages/activations/ActivationsPage.test.tsx`: mock `useAdminActivations`, `useActivationsSummary`, filter hooks, the 3 write hooks, `useTranslation`. Assert: stats/donut skeletons; empty vs no-match; retry ⇒ `refetch`; **gating** (Resolve only on FREEZE; Set-Price only completed+unpriced); Resolve confirm ⇒ `useActivateByAdmin`/`useCancelByAdmin.mutate(id)`; price submit ⇒ `mutate({id,{amount}})`; URL pre-filter seeding.

**7. Acceptance** — filterable/paginated read-only table + 4 stats + donut; FREEZE resolution and price set/override via confirmed mutations; pre-filters honored; layout preserved; translated.

---

### D2 — Activation Detail · `/admin/activations/:id` (SV-PAGE-015)  *(reduced fidelity — §E-2)*
Read-only + single "Set / Override Activator Price".

**1. Hook & Data Mapping** — `useActivationDetail(id)` → `ActivationDetailDTO { id, client{fullName,phone}, distributor{storeName,wilayaName,communeName}, activator{id,fullName}|null, submittedInformation[], timeline[], cardHistory[], financial{activationPrice,commissionTierLabel} }`. Write → `useSetActivationPrice`.
- Nav: **activator block → `<Link to="/admin/activators/{activator.id}">`** (id present ✓). **Distributor block → plain text** (DTO has no distributor id — §E-2, link deferred). **Card-key link deferred** (no card key/label in DTO — §E-2).

**2. UI Components** — *New* `pages/admin/activations/ActivationDetailPage.tsx` + `components/`: `ClientBlock`, `DistributorBlock`, `ActivatorBlock`, `SubmittedInformationList` (EAV `{fieldLabel,current value}`), `ActivationTimeline` (one row per `TimelineEntry`; `WRONG_INFORMATION` lists `wrongFields`, `ADDITIONAL_INFORMATION` lists `additionalFields`+values, `FREEZE` shows `freezeReason`), `CardHistoryTimeline` (reuse the Part-2 card distribution-timeline pattern), `FinancialBlock` (+ reuse `SetActivatorPriceModal`). *Shared:* `StatusBadge`, `CardStatusBadge`, `NotFoundState`, `CopyButton`.

**3. Granular States** — loading: sectioned skeletons (client/distributor/activator/timeline); empty: activator block "No activator has picked this up yet." when null, timeline always has ≥ the `PENDING` row; error: load fail → full-section `NotFoundState`+Retry; **invalid `:id`** → "Activation not found." + back `<Link>`; set-price fail → toast, modal preserved.

**4. Forms & Mutations** — reuse `set-activator-price.schema.ts` → `useSetActivationPrice.mutate({id,{amount}})`.

**5. Optimization** — lazy route; no memo needed (single object render).

**6. Unit-Test Strategy** — `ActivationDetailPage.test.tsx`: invalid-id ⇒ `NotFoundState`+back; timeline renders wrong/additional/freeze variants; activator-null empty state; activator `<Link>` present, distributor rendered as text (documents §E-2); set-price ⇒ `mutate`.

**7. Acceptance** — all present sections render; EAV submitted-info + step timeline + card history; price set/override; activator link works; invalid id local; translated; **§E-2 link/field reductions logged**.

---

### D3 — Statistics · `/admin/statistics` (SV-PAGE-016)

**1. Hook & Data Mapping**
| Region | Hook | DTO |
|---|---|---|
| Filter bar | `useSubscriptionPlans({active:true})`, `useWilayas()` | period select is enum-driven (B6) |
| 6 charts | `useStatisticsOverview({ period, dateFrom?, dateTo?, subscriptionPlanId?, wilayaId? })` | `StatisticsOverviewDTO` → `activationsOverTime`, `activationsByState`, `topActivators`, `topDistributors`, `avgTimeTrend`, `revenueOverTime` — **1:1 with the 6 spec charts** ✓ |
| Heatmap | `useWilayaHeatmap({ period?, subscriptionPlanId? })` | `WilayaHeatmapDTO[]` `{ wilayaId, wilayaName, distributorsCount, activationsCount, cancellationsCount, avgActivationTimeSeconds }` |
| Drill-down panel | `useWilayaDrilldown(wilayaId, { period? })` | `WilayaDrilldownDTO { topDistributors[], activationsByPlan[], activationsOverTime[] }`; `enabled: !!wilayaId` |

**Period reconciliation (§F):** spec labels are rolling (Today / Last 7 Days / Last 30 Days / Last 3 Months / Last Year / Custom); the contract `StatisticsPeriod` enum is `today | this_week | this_month | last_30d | last_90d | this_year | custom`. Map each spec label to the closest enum member (Last 7 Days→`this_week`, Last 3 Months→`last_90d`, Last Year→`this_year`); `custom` activates `dateFrom/dateTo`. Minor calendar-vs-rolling wording difference, noted.

**2. UI Components** — *New* `pages/admin/statistics/StatisticsPage.tsx` + `components/`: `StatisticsFilterBar`, `ActivationsOverTimeChart` (Line), `ActivationsByStateDonut` (Pie), `TopActivatorsBar`/`TopDistributorsBar` (horizontal Bar), `AvgTimeTrendChart` (Line), `RevenueOverTimeChart` (Line), `WilayaHeatmap` (§D3.5) + `WilayaDrilldownPanel`. *Shared:* `ChartSkeleton`, `EmptyState`, `NotFoundState`, `recharts`.

**3. Granular States** — loading: **each chart its own `ChartSkeleton`**; map = neutral un-shaded outline. Empty: per-chart "No data for this period."; heatmap = all wilayas at lowest shade + "no activity" tooltip. Error: **per-chart** retry; heatmap fail → outline + "Couldn't load wilaya stats. Retry."

**4. Forms & Mutations** — none (read-only).

**5. Optimization** — lazy route; memoized heatmap color scale; all six overview series arrive in one `useStatisticsOverview` call (one query, six charts) so a filter change refetches once.

**6. Unit-Test Strategy** — `StatisticsPage.test.tsx`: filter change re-issues query with the mapped `period`; per-chart empty/error+retry; heatmap color-mode select switches the metric→shade mapping; wilaya click ⇒ `useWilayaDrilldown(id,…)` enabled + panel renders; assert the empty-state branch, not recharts SVG internals (mock the chart container, Part-1 precedent).

**7. Acceptance** — 6 charts + interactive 58-wilaya heatmap with color-mode + hover + click-drilldown; per-region loading/empty/error; filters re-fetch pre-aggregated series; translated.

---

### D3.5 — Algeria Wilaya Heatmap (vendoring `react-algeria-map`)

The library is one `Map.jsx`: an inline SVG (`viewBox="-248.385 -239.386 982.451 955.452"`) with 58 `<g onClick><title/><polygon|path className="state" fill={color}/></g>` groups, props `{ height, width, color, stroke, hoverStroke, HoverColor, data, onWilayaClick }`; `data` is keyed by **wilaya name**; hover recolors via a global `useEffect` that sets CSS vars on `document.documentElement`; one flat `color` for all wilayas; tooltip = native `<title>`. MIT, React 18 peer dep.

**Copy verbatim (the valuable, correct part):**
| Copy | Why |
|---|---|
| The SVG `viewBox` + all 58 `<polygon>`/`<path>` **coordinate geometry** and the `id`/order | Accurate 58-wilaya shapes — the whole reason to reuse it |
| The per-wilaya `<g>` grouping + stable ids (`_x30_1_Adrar`, …) | anchor for keying/click/hover |

**Change / rebuild (align to our stack, rules, and the spec):**
| Change | From → To |
|---|---|
| **File/typing** | `.jsx` (untyped, npm lib) → vendored `WilayaHeatmap.tsx`, typed props; **not** an npm dependency (it's a stray local repo) |
| **Global side-effect** | `useEffect` writing `--react-algeria-map-*` on `document.documentElement` → **removed**; hover via scoped CSS-module / Tailwind classes + our semantic tokens (no global mutation, rules-friendly) |
| **Coloring** | single flat `color` prop → **per-wilaya `fill = scale(metric)`**: a light→dark **purple** gradient (spec) computed from the selected color-mode (`distributors`/`activations`/`cancellations`/`avgTime`); memoized scale; **dark-mode variant** via CSS vars |
| **Data shape** | `data[wilayaName] = value` → takes `WilayaHeatmapDTO[]` + `colorMode`; internal `Record<wilayaName, metrics>` lookup |
| **Name matching (RISK)** | lib keys by Latin wilaya **name**; our DTO has `wilayaId` + `wilayaName` (no code exposed by the SVG). Build a **normalization table** (lib name ↔ our `wilayaName`, accent/spelling-folded, e.g. "Alger", "Aïn Témouchent") so the join can't silently drop wilayas; unit-test that all 58 map |
| **Tooltip** | native `<title>` (one string) → **rich hover tooltip** (distributors/activations/cancellations/avg time) via a positioned Radix/Shadcn tooltip or floating panel |
| **Interaction** | `onWilayaClick(name, value)` → `onWilayaSelect(wilayaId)` (resolve name→id) → opens `WilayaDrilldownPanel` (`useWilayaDrilldown`) |
| **States** | always-colored → neutral outline while loading; lowest-shade + "no activity" on empty; outline + retry on error |
| **Legend** | none → add a light→dark gradient legend with the active metric's min/max |

**New artifacts:** `WilayaHeatmap.tsx` (vendored geometry + typed props + scale), `wilaya-name-map.ts` (normalization table), `WilayaDrilldownPanel.tsx`, `HeatmapLegend.tsx`, `HeatmapColorModeSelect.tsx`. **Do not** copy the lib's `Map.css` global-var approach, its Storybook, or its build config.

---

### D4 — Settings · `/admin/settings` (SV-PAGE-017) — tabbed (`ui/tabs`)

**Four tabs** (the spec's Tabs 5 & 6 are **omitted from the tab bar** — no contract support, user decision #4/§E-1); the active tab loads on first visit (lazy per-tab query).

**Tab 1 — Admin Accounts** *(full)* — `useAdmins({page,limit,search})` → `AdminDTO` (username, fullName, lastLoginAt, isEnabled). Writes: `useCreateAdmin` (→ one-time `AdminWithCredentialsDTO.generatedPassword`, reveal via `GeneratedPasswordPanel`), `useUpdateAdmin`, `useToggleAdmin` (enable/disable), `useResetAdminPassword` (→ one-time reveal), `useDeleteAdmin`. Schemas: `create-admin`/`update-admin`. **Guard UX (B5):** Delete disabled for self (`useSession` id) and when only one admin remains.

**Tab 2 — Commission (speed-tiered)** *(full)* — `useCommissions()` → `CommissionMatrixDTO { tiers[], rows[{planLabel, cells[{commissionDurationId, commission}]}] }`; tier headers read-only from `tiers` (`label`, `nbMinuteMin`/`Max`). Editable **DZD cell** → `commission-cell.schema.ts` → `useUpdateCommission({subscriptionPlanId, commissionDurationId, commission})`. In-tab note: "Changes apply to future activations only." Cell save-fail → cell reverts + flags red (local error state).

**Tab 3 — Subscription Plans** *(full)* — `useSubscriptionPlans({active?})` → list (label, type, duration, isActive). Add Plan → `create-subscription-plan.schema.ts` (`subscriptionType`/`subscriptionDuration` **enum** dropdowns, decision #3) → `useCreateSubscriptionPlan`. Toggle → `useToggleSubscriptionPlan`.

**Tab 4 — Delivery Companies** *(full)* — `useDeliveryCompanies({active?})` → list (name, registeredName, isActive). Add/Edit → `create/update-delivery-company.schema.ts` → `useCreateDeliveryCompany`/`useUpdateDeliveryCompany`. Toggle → `useToggleDeliveryCompany`.

**Tabs 5 & 6 — Inactivity Timeout / Active Hours** *(OMITTED — §E-1)* — no `settings` contract module (`useSettings`/`useUpdateTimeout`/`useUpdateActiveHours`, commands, routes all absent). **Not rendered in the tab bar** (user decision #4). When the upstream module lands, they slot in as two more `ui/tabs` triggers with no change to the four existing tabs.

**2. UI Components** — *New* `pages/admin/settings/SettingsPage.tsx` (tab host, **4 tabs**) + `components/`: `AdminAccountsTab` (+ `AddAdminModal`, `EditAdminModal`, `AdminActionsMenu`, reuse `GeneratedPasswordPanel`), `CommissionMatrixTab` (+ `CommissionCell`), `SubscriptionPlansTab` (+ `AddPlanModal`), `DeliveryCompaniesTab` (+ `CompanyModal`). *Shared:* `DataTable`, `TableSkeleton`, `EmptyState`, `NotFoundState`, `CopyButton`, `ui/tabs`, `ui/switch`, `ui/dialog`, `ui/alert-dialog`.

**3. Granular States** — per-tab skeletons; empty: only current admin (Delete disabled); no plans → "No subscription plans yet — add one to start creating sets."; no companies → "No delivery companies yet — add one before creating orders."; error: per-action toast + values preserved; commission cell fail → revert+red; delete-admin guard → toast.

**4. Forms & Mutations** — as above; all writes rely on in-hook invalidation + global toast.

**5. Optimization** — lazy route; each tab's query `enabled` on first activation (don't fetch all six upfront); memoized matrix `ColumnDef[]`.

**6. Unit-Test Strategy** — `SettingsPage.test.tsx` (fold tabs in): the tab bar renders **exactly the 4 supported tabs** (no Timeout/Active-Hours); Admin add ⇒ one-time password panel; self/last-admin Delete disabled; commission cell edit ⇒ `useUpdateCommission({…})` and revert-on-error; Add-Plan enum dropdowns ⇒ `useCreateSubscriptionPlan`; company add/toggle.

**7. Acceptance** — 4 tabs fully functional with confirmed, guarded mutations + one-time secrets; commission matrix editable per cell; Timeout/Active-Hours absent (pending upstream contract, §E-1); translated; layout preserved.

---

### D5 — Logs · `/admin/logs` (SV-PAGE-018) — immutable, read-only

**1. Hook & Data Mapping** — `useLogs({ page, limit, userId, actionType, dateFrom, dateTo, search })` → `PaginatedLogs` → `LogDTO { actionType, actionDescription, userName, createdAt }`. Filters: `useAdmins({limit:100})` (User dropdown) + `LogActionType` enum (Action-type dropdown). No writes, no nav.

**2. UI Components** — *New* `pages/admin/logs/LogsPage.tsx` + `components/`: `LogsFilters`, `LogsTable` (+ `LogActionBadge` icon/color per type, §B9). *Shared:* `DataTable`, `TableSkeleton`, `EmptyState`, `NotFoundState`, `SimplePagination`, `LiveTimer` (relative "2 hours ago", exact on hover).

**3. Granular States** — loading: filter bar enabled + table skeleton; empty: "No activity logged yet." / no-match + Clear; error: table retry.

**4. Forms & Mutations** — none.

**5. Optimization** — lazy route; memoized `ColumnDef[]`; debounced description search.

**6. Unit-Test Strategy** — `LogsPage.test.tsx`: skeleton; empty vs no-match+Clear; retry ⇒ `refetch`; action-type + user filters mutate the query; relative-time rendering; `LogActionBadge` per type.

**7. Acceptance** — filterable/paginated immutable audit trail with resolved admin names + typed badges + relative timestamps; translated; layout preserved.

---

## E. Missing hooks / contract DTOs to resolve first (Expected Output)

| # | Gap | Where | Type | Current handling | Recommended upstream fix | Severity |
|---|-----|-------|------|------------------|--------------------------|----------|
| **E-1** | **No `settings` module** — no `GET /settings`, no `UpdateTimeoutCommand`/`UpdateActiveHoursCommand`, no routes, no `useSettings`/`useUpdateTimeout`/`useUpdateActiveHours` (confirmed: contract has no `settings` module; backend has no such route) | **Settings Tabs 5 & 6** | contract module + routes + hooks | **Tabs 5 & 6 omitted from the tab bar** (not built) until the module lands — user decision | add a `settings` contract module (`timeout {minutes}`, `activeHours {start,end,days[]}`) + routes + `useSettings`/`useUpdateTimeout`/`useUpdateActiveHours`, then add the two tabs | **High — omitted this part** |
| E-2 | `ActivationDetailDTO` reductions: `distributor` block has **no `id`** (distributor link unbuildable); **no `card {key,subscriptionLabel}`** (card-key link + header label unbuildable); `client` lacks email + `taken/completed` timestamps; `activator` lacks `username` | D2 | contract DTO | render distributor/card as **plain text** (links deferred); show only present client/activator fields | enrich `ActivationDetailResponseSchema` with `distributor.id`, a `card {key,subscriptionLabel,…}` block, client email/timestamps, `activator.username` | Med |
| E-3 | Statistics **period** enum is calendar-based (`this_week`/`this_month`/`this_year`) vs the spec's rolling "Last 7 Days / 3 Months / Year" | D3 filter bar | contract query | map each spec label to the **closest** enum member; `custom` for a date range | add rolling members (`last_7d`, `last_1y`) if exact semantics are required | Low |
| E-4 | `useSubscriptionTypes`/`useSubscriptionDurations` endpoints (spec) don't exist | D4 Tab 3 | resolved | Add-Plan pickers are **enum-driven** (`SubscriptionType`/`SubscriptionDuration`) with i18n labels | none — keep enum-driven | Resolved |
| E-5 | Heatmap SVG keys wilayas by **name**; DTO exposes `wilayaId`+`wilayaName` (no code on the SVG) | D3.5 | integration | a normalization table (lib-name ↔ `wilayaName`), unit-tested for all 58 | expose a stable `wilayaCode` on both sides for a code-based join | Low |

---

## F. Deviations ledger (per decision #2 — "plan against what exists")

- **Settings Tabs 5 & 6 omitted** from the tab bar (no contract) — E-1. *(User decision: omit-until-contract; they slot in later with no change to the 4 built tabs.)*
- **Activation detail:** distributor block is **text, no link** (no id); **card-key link + subscription-label header dropped** (not in DTO); client email/timestamps + activator username **omitted** — E-2.
- **Statistics period labels** map to the nearest calendar enum member (rolling vs calendar) — E-3.
- **Add-Plan** type/duration come from **enums**, not dedicated endpoints — E-4 (resolved).
- **Notation:** camelCase `{items,meta}`/`limit` throughout (B2) — reconciliation, not a functional reduction.

Everything else in SV-PAGE-014→018 is planned at **full fidelity** against existing hooks + DTOs (Activations, Statistics 6 charts + heatmap, Admin/Commission/Plans/Companies tabs, Logs).

---

## G. Net-new artifact inventory (for the sprint/execute phase)

- **Routes:** 5 lazy routes in `App.tsx` under `AdminGuard` (§C). Nav links already present.
- **Pages:** `pages/admin/activations/{ActivationsPage,ActivationDetailPage}.tsx`; `pages/admin/statistics/StatisticsPage.tsx`; `pages/admin/settings/SettingsPage.tsx`; `pages/admin/logs/LogsPage.tsx` (+ each page's `components/` per §D).
- **Schemas (co-located):** `set-activator-price`, `create-admin`, `update-admin`, `create-subscription-plan`, `create-delivery-company`, `update-delivery-company`, `commission-cell` `.schema.ts` (each `AssertAssignable` to its Command).
- **Heatmap (§D3.5):** `WilayaHeatmap.tsx` (vendored 58-wilaya geometry), `wilaya-name-map.ts`, `WilayaDrilldownPanel.tsx`, `HeatmapLegend.tsx`, `HeatmapColorModeSelect.tsx`.
- **Shared additions:** `LogActionBadge`; thin `recharts` chart wrappers (Line/Bar/Donut) with empty-state branches.
- **i18n:** `admin.{activations,activationDetail,statistics,settings,logs}.*`, `enums.{subscriptionType,subscriptionDuration,logActionType}.*`, `admin.statistics.{period,colorMode}.*` — en/fr real, ar `""`.
- **Tests:** `/tests/unit/pages/{activations,activation-detail,statistics,settings,logs}/*.test.tsx` (hooks + `useTranslation` mocked; `.test.tsx`).
- **Reused (build nothing):** every hook in §B1/§D, the whole §B7 shared set, the Part-1 shell, `useDebouncedValue`, `recharts`, `StatusBadge`/`CardStatusBadge`, `GeneratedPasswordPanel`, `lib/query-keys.ts`.
- **Not vendored:** `react-algeria-map`'s `Map.css` (global CSS-var approach), Storybook, and build config — geometry only (§D3.5).

---

*End of Part 3 plan — this completes the admin panel (Parts 1–3, `/admin` → `/admin/logs`). Next deliverables per the spec: the Activator portal and the public Client activation portal.*
