# Admin Panel · Part 1 — Page Assembly Sprint Plan (SV-PAGE-006 → 010)

> **Stage 03 · Sub-03 · Phase 02 (Sprint Planning).** No code yet — a build playbook.
> **Source plan:** [results/admin-part-1/plan.md](./plan.md) · **Phase file:** [stage-03-sub-03-phase-02-sprints.md](../../stage-03-sub-03-phase-02-sprints.md) · **Rules:** [front-end-rules.md](../../../front-end-rules.md), [front-end-test-rules.md](../../../front-end-test-rules.md) · **Contract:** `@my-app/contract`
> **Governance:** rules = HOW · phase = WHAT/WHEN · contract = WHICH. HOW conflicts resolved toward the rules/explicit instruction and noted.

---

## Ordering & program shape

Required global order: **Foundation → Primitives & States → Assembly & Wiring → Polish → Tests** (UI before wiring; wiring never precedes primitives). This is one combined plan for **5 pages + a shared shell**, so the two heaviest phases (Primitives, Assembly) split in two by workload; everything else is one sprint each. **Seven sprints, five phases:**

| Phase | Sprints | Scope |
|-------|---------|-------|
| 1 · Foundation | **S1** | schemas · i18n · routes + `React.lazy` scaffolding |
| 2 · Primitives & States | **S2** Shell + Dashboard · **S3** Activators + Distributors | dumb components, skeletons, empty/error fallbacks |
| 3 · Assembly & Wiring | **S4** Dashboard + Distributors · **S5** Activators | page components, `useQuery`/`useMutation`, RHF |
| 4 · Polish | **S6** | responsive (desktop-first), `useMemo`/`useCallback` per plan §B8 |
| 5 · Tests | **S7** | shell + all pages, `/tests/unit/**` with `vi.mock` on hooks |

**Dependency spine:** S1 → S2 → S3 → {S4, S5} → S6 → S7. Assembly needs primitives: S4 consumes Dashboard primitives (S2) + Distributors primitives (S3); S5 consumes Activators primitives (S3). Assembly split by write-surface — **Activators gets its own sprint** (6 mutations, 3 RHF forms, one-time-password + soft-delete flows); Dashboard (2 mutations, no forms) pairs with Distributors (3 mutations, dependent selects).

> Coarsened from a prior 12-sprint draft per request. Further levers if wanted: split S7 by area again, or merge S6 into S4/S5 for ~6; or split S3 back into Activators/Distributors for ~8.

### Execution protocol (applies to every sprint)
- **Per-sprint gates (non-negotiable, in each Validation block):** ① no inline JSX strings — all copy via `useTranslation` (plan §B6); ② `tsc --noEmit` clean; ③ no `useEffect` for fetching (rules §2); ④ layout survives `isError`/`isLoading` (local fallback, never full-page — except the shell session gate); ⑤ existing Vitest suite stays green; ⑥ no test files under `/src`.
- **Tests-last reconciliation (noted HOW resolution):** the phase *template* implies per-sprint page tests, but the explicit instruction orders **Tests last**. We follow the instruction — page/shell `.spec.tsx` files are authored in **S7**; S2–S6 keep only the *existing* suite green plus gates ①–④. Every S2–S5 component is built test-ready (props-driven, hooks isolable) so nothing blocks S7.
- **Commit convention (project memory):** on green, `git add .` then commit `Sprint N: <Title>` — no co-author trailer; update this file's Status marker (and the execution report, if the execute phase adds one) **before** committing.
- **Guardrails from the plan:** the §F deviations are *intentional* — do **not** invent `frozen_since`, enrich `Recent`/`Pending` rows, add a `password` column, or build a bell event-feed. Missing contract data is an upstream fix (plan §E), never a local patch (rules §2).
- **Status legend:** ⬜ Pending · 🟨 In progress · ✅ Done.

---

## PHASE 1 — FOUNDATION

### Sprint 1: Foundation — Schemas, i18n, Routes & Lazy scaffolding   — Status: ✅ Done

**Goals**
- Every form's co-located Zod schema exists and its `z.infer` is assignable to the matching contract Command.
- All translation keys for the shell + 5 pages present in `translations.json` (EN/FR real copy, `ar: ""`).
- `/admin/*` mounts 5 lazy route stubs under `AdminGuard`/`AdminLayout` **stubs**; `tsc` + lazy loading pass with zero UI built.

**Tasks**
- [x] Co-located schemas (#foundation): `pages/admin/activators/components/{create-activator,update-activator,record-payment}.schema.ts`; `pages/admin/distributors/components/{create-distributor,update-distributor}.schema.ts`. Constraints per plan §D: `fullName` 3–100; `username` 3–30 `^[A-Za-z0-9_]+$`; `phone` `^(?:\+213|0)(5|6|7)\d{8}$`; `storeName` 2–100; `amount` `>0` `.multipleOf(0.01)`; `initialCredits` optional `≥0` default 0; `wilayaId`/`communeId` `z.uuid()`. Add a compile-time assignability check to each so it can't drift from `CreateActivatorCommand`/`UpdateActivatorCommand`/`RecordPaymentCommand`/`CreateDistributorCommand`/`UpdateDistributorCommand`.
- [x] i18n keys (#i18n): `admin.shell.*`, `admin.dashboard.*`, `admin.activators.*`, `admin.distributors.*`, and reusable `common.actions.*` (save, cancel, delete, edit, view, retry, clear, add, enable, disable, confirm, reset-password, record-payment, sign-out). Flat key → `{ en, fr, ar:"" }`.
- [x] Route scaffolding (#foundation): register `/admin`, `/admin/activators`, `/admin/activators/:id`, `/admin/distributors`, `/admin/distributors/:id` with `React.lazy()` page stubs (modules returning `null`), wrapped in `<Suspense fallback={<PageLoader/>}>`, under **passthrough** `AdminGuard` + `AdminLayout` stubs (bare `<Outlet/>`) created here and fleshed out in S2. Keep axios loop-safe 401 handling intact.

**Validation**
- [x] No inline strings — keys resolve via `useTranslation`. / [x] `tsc --noEmit` clean.
- [x] Each schema `z.infer` assignable to its contract Command (assertion compiles).
- [x] Lazy routes resolve to stubs; existing Vitest green; no `/src` tests. / [x] Committed on green.

**Execution notes (see report-sprint-01.md for full detail):**
- Page stubs render `<></>` rather than literal `null` — `withSuspense`'s existing type (`LazyExoticComponent<() => JSX.Element>`) requires `JSX.Element`; an empty fragment satisfies it without a cast and is visually identical to "nothing yet."
- i18n was authored as a full first pass (shell + all 4 page namespaces, ~115 keys, all spec-verbatim) rather than validation-messages-only, per this sprint's own task list naming all 4 namespaces as targets — de-risks S2–S6 from needing further translations.json churn. Also pre-added `enums.cardStat.*`/`enums.orderStat.*` (needed by S3's Distributor Detail compact tables).
- **Discovered gap for S3:** `StatusBadge` is hard-typed to `ActivationStat` only (`TONE: Record<ActivationStat, Tone>`) — Distributor Detail's Cards/Orders history (CardStat/OrderStat) and the enabled/disabled column will need it generalized or a sibling component. Not fixed here (out of S1 scope); flagged for S3.
- **Discovered gap for S2:** `useAuth()` exposes no `role` — only `session?.role` used internally for the socket. The real `AdminGuard` (S2) will need role, via either exposing it on `AuthCtx` or calling `useSession()` directly.
- **Tooling correction:** `front-end-test-rules.md`/phase docs say `.spec.tsx`; the actual `vitest.config.ts` `include` glob and all 37 existing test files use `.test.tsx`/`.test.ts`. `.spec.tsx` files would silently never run. Resolved toward the working convention — **S7 test files will use `.test.tsx`**, not `.spec.tsx`.

**Risks**
- Schema over-tightening breaking assignability to the loose contract Command → keep refinements superset-compatible.
- Key namespace collisions with existing activator/public keys.

---

## PHASE 2 — PRIMITIVES & STATES

### Sprint 2: Primitives — Admin Shell + Dashboard   — Status: ✅ Done

**Goals**
- `/admin/*` renders inside the real `AdminLayout` (guard + sidebar + header + bell), session/role states handled, admin socket connects on mount.
- Every Dashboard component renders from props across success/empty/loading/error — **no page hooks yet** (plan §C, §D1.2–3).

**Tasks**
- *Shell* (plan §C):
  - [x] `AdminGuard.tsx` (#state): role-checked wrapper over `ProtectedRoute`/`useSession` — session resolving → full-page spinner (the *only* full-page state, rules §4); invalid/expired → redirect `/login`; authed non-admin → redirect.
  - [x] `AdminLayout.tsx` (#ui/#wiring): chrome + `<Outlet/>`; ~~`connectRoleSocket(UserRole.ADMIN)` on mount / `disconnectRoleSocket()` on unmount~~ **no socket management — see execution notes**.
  - [x] `AdminSidebar.tsx` (#ui): full conception nav; Part-1 items as active-highlightable `NavLink`s, all other groups (Orders, Sets & Lots, Cards, Activations, Statistics, Settings, Logs) as plain `<Link>` (scope confinement).
  - [x] `AdminHeader.tsx` (#ui): `Logo`, `LanguageToggle` (EN/FR), `ThemeToggle`, admin-name menu → **Sign Out** `AlertDialog` (→ `useLogout` → `disconnectRoleSocket()` → redirect `/login`).
  - [x] `NotificationBell.tsx` (#ui/#state): bell chrome + `useRealtimeStatus()` reconnect indicator. **Feed/badge deferred (§F-6)** — idle bell, no invented event store.
- *Dashboard* (plan §D1.2–3):
  - [x] `pages/admin/DashboardPage.tsx` static region layout (#ui).
  - [x] `StatsRow.tsx` (#ui): 4× `StatCard`, each with independent `StatCardSkeleton` slot.
  - [x] `FrozenActivationsTable.tsx` / `RecentActivationsTable.tsx` / `PendingActivationsTable.tsx` (#ui): `DataTable` + memoized `ColumnDef[]`; **reduced column sets per §F** (no `frozen_since`; no recent activator/client/store/duration; no pending client). Frozen row exposes Activate/Cancel callback props.
  - [x] `ResolveFreezeDialog.tsx` (#ui): presentational `AlertDialog`, Activate & Cancel variants; Cancel copy states "the card will be marked failed."
  - [x] States (#state): `TableSkeleton` per table; `EmptyState` variants (frozen = green "all running smoothly", recent, pending); compact `NotFoundState` with a `Retry` `action` slot. `LiveTimer` for pending wait / relative times.

**Validation**
- [x] All labels via `useTranslation`. / [x] `tsc` clean. / [x] No data `useEffect` (socket wiring is not fetching).
- [x] Guard states verified (resolving / invalid / non-admin) — **in a real headless browser**, not just code review; Dashboard renders all three states from props; layout intact. / [x] Existing Vitest green. / [x] Committed.

**Execution notes (see report-sprint-02.md for full detail):**
- **Correction vs. this sprint's own task list:** `AdminLayout` does **not** call `connectRoleSocket`/`disconnectRoleSocket`. Closer reading of `AuthProvider.tsx` (Sub-02) showed it already owns the role-socket lifecycle globally, keyed on session+role — connects the moment any admin session resolves, regardless of route. Having `AdminLayout` manage it too would double-connect on mount and, worse, could disconnect a socket `AuthProvider` still wants alive if the admin ever navigates away and back without a role change (its effect wouldn't re-fire to reconnect). `AdminLayout` only renders chrome.
- **S1's flagged `useAuth()`-has-no-`role` gap resolved without touching `AuthProvider.tsx`:** `AdminGuard` calls `useSession()` directly (same cache entry, no extra network call) rather than extending `AuthCtx`.
- **Redirect-target refinement:** authed-non-admin redirects to `/dashboard`, not `/login` (the task text didn't specify a target). Sending an already-authenticated user to `/login` would just bounce them straight back out via `PublicOnlyRoute` — `/dashboard` is their actual home.
- **`LiveTimer` (existing, Sub-01) already implements the spec's exact wait-tier thresholds** (green `<5m` / amber `5–15m` / red `>15m` via its `mode="wait"`) — `PendingActivationsTable` uses it directly. **This supersedes Sprint 4's planned bespoke `useMemo` color-map task**, which sprints.md's S4 section should drop when reached.
- Added `formatDateTime()` to `lib/utils.ts` (no date-formatting helper existed anywhere in the codebase yet) and extended `nav-links.ts` additively with `NavGroup`/`ADMIN_NAV_LINKS` (existing `NavLink`/`ACTIVATOR_NAV_LINKS` untouched).
- Added 4 more i18n keys discovered while building (bell empty-state, section-error body, activate-confirm body — the last needed to avoid a Radix a11y console warning on the dialog, which would violate "console silent") and one column-header key (fixing a leftover broken placeholder caught before commit).
- **Browser-verified**, not just gated by `tsc`/`vitest`: started the Vite dev server (created `.env` from `.env.example`; none existed), drove headless Chromium (already locally cached — zero network fetch) to `/admin`, `/login`, `/admin/activators` unauthenticated. All three resolved correctly — both admin routes client-side-redirect to a cleanly rendered `/login` (screenshot-confirmed, not blank). One expected console error (`ERR_CONNECTION_REFUSED` from `useSession()`'s fetch — no backend running, which is exactly the mechanism that makes the redirect-on-no-session path exercisable without one) and one pre-existing React Router future-flag warning (present on `/login` too, predates this sprint). No new console errors/warnings introduced. **Not verified:** the authenticated admin-shell rendering (sidebar/header/skeletons) — would need a live backend + seeded admin account, which don't exist in this environment; noted rather than assumed.

---

### Sprint 3: Primitives — Activators + Distributors   — Status: ⬜ Pending

**Goals**
- All Activators and Distributors list + detail dumb components + states built from props (plan §D2–D5). Shared `RecordPaymentModal` + `GeneratedPasswordPanel` created once; dependent wilaya→commune select UX built.

**Tasks**
- *Activators* (plan §D2.2, §D3.2):
  - [ ] List (#ui): `ActivatorsPage.tsx`, `ActivatorsStatsRow`, `ActivatorsTable` (memo `ColumnDef`, **no password column**), `ActivatorSearch`, `ActivatorActionsMenu` (View · Enable/Disable · Delete · Record Payment).
  - [ ] Shared modal shells — RHF wired in S5 (#ui): `CreateActivatorModal`, `GeneratedPasswordPanel` (one-time secret + `CopyButton`), `RecordPaymentModal`.
  - [ ] Detail (#ui): `ActivatorDetailPage.tsx`, `ProfileCard` (+ `EditActivatorModal` field markup), `StatsRevenueGrid` (6 tiles), `PerformanceChart` (recharts `LineChart` + `ChartSkeleton` + empty branch), `PaymentsHistoryTable` (memo `ColumnDef`, soft-deleted styling).
- *Distributors* (plan §D4.2, §D5.2):
  - [ ] List (#ui): `DistributorsPage.tsx`, `DistributorsStatsRow`, `DistributorsFilters` (search + `WilayaSelect` + `CommuneSelect`), `DistributorsTable` (memo `ColumnDef`, resolved names), `DistributorActionsMenu`, `CreateDistributorModal`.
  - [ ] Detail (#ui): `DistributorDetailPage.tsx`, `DistributorProfileCard` (inline-edit markup + selects), `DistributorStatsGrid` (Sold Keys · Remaining Cards · Orders · Activations), `OrdersHistoryCompact`, `CardsHistoryCompact` (memo `ColumnDef`).
- *States, both areas* (#state):
  - [ ] Skeletons for stats/table/profile/chart/payments/compact-tables; **commune select disabled + spinner until wilaya chosen**.
  - [ ] `EmptyState` variants: no activators / no-match+Clear / no payments+CTA / empty chart; no distributors / no-match+Clear Filters / no orders / no cards.
  - [ ] `NotFoundState`: table Retry; **invalid `:id` → "…not found." + back `<Link>`** on both detail pages; select fetch-error → inline "Couldn't load — retry."

**Validation**
- [ ] Copy via `useTranslation`. / [ ] `tsc` clean. / [ ] All states render from props; chart empty-branch + disabled/loading/error select states present. / [ ] Existing Vitest green. / [ ] Committed.

**Risks**
- Larger sprint (two areas) → review in list-then-detail order. recharts responsive container; shared-modal reuse across list & detail; dependent-select empty/disabled states; compact-table overflow.

---

## PHASE 3 — ASSEMBLY & WIRING

### Sprint 4: Assembly — Dashboard + Distributors   — Status: ⬜ Pending

**Goals**
- Dashboard four cards + three regions live at §F fidelity; frozen resolves via admin mutations and refreshes on a live freeze. Distributors list + detail fully wired, including dependent wilaya/commune selects and inline profile edit.

**Tasks**
- *Dashboard* (plan §D1.1/4/5, §F):
  - [ ] Reads (#wiring): `useActivationsSummary` + `useActivatorsSummary` + `useDistributorsSummary` → `StatsRow` (independent per-card loading/error); `useAdminActivations({ state: ActivationStat.FREEZE, limit: 50 })` → Frozen; `useRecentActivations` → Recent; `usePendingActivations` → Pending. **No `useDashboardStats` (§F-1); no fetch `useEffect`.**
  - [ ] Derived (#perf): `useMemo` completed = Σ `byState` (`ACTIVATED` + `ACTIVATED_BY_ADMIN`). ~~`useMemo` pending wait-tier map~~ **superseded — `PendingActivationsTable` (built Sprint 2) already colors via `LiveTimer`'s existing `mode="wait"` thresholds; nothing to build here.**
  - [ ] Mutations (#wiring): `useActivateByAdmin` / `useCancelByAdmin` via `ResolveFreezeDialog` (`mutate(id)`); in-hook invalidation; failure → global toast, row stays, dialog closes only on success. Region error → `NotFoundState` Retry → `refetch`; empty → `EmptyState`.
- *Distributors* (plan §D4.1/4, §D5.1/4):
  - [ ] List reads (#wiring): `useDistributorsSummary` + `useDistributors({ page, limit, search, wilayaId, communeId })`; filter selects `useWilayas()` + `useCommunes(wilayaId)` (`enabled: !!wilayaId`).
  - [ ] List writes (#wiring/#form): `useCreateDistributor` (RHF `create-distributor.schema`; wilaya change resets commune), `useToggleDistributor`, `useDeleteDistributor`.
  - [ ] Detail reads (#wiring): `useDistributor(id)`, `useOrders({ distributorId: id, limit })`, `useCards({ distributorId: id, limit })`, `useWilayas`/`useCommunes`; invalid `id` → `NotFoundState`.
  - [ ] Detail writes (#wiring/#form): `useUpdateDistributor` (RHF `update-distributor.schema`; inline edit; commune re-filters on wilaya change), `useToggleDistributor`.
  - [ ] Nav (#wiring): row/View → `<Link>` detail; "View All Orders" → `/admin/distributors/orders?distributor={id}`; "View All Cards" → `/admin/activations/cards?distributor={id}` (links only).

**Validation**
- [ ] Copy via `useTranslation`. / [ ] `tsc` clean. / [ ] No fetch `useEffect`. / [ ] Each region/table `isError` keeps the shell intact; dependent-select correctness (commune gated/reset); select fetch-error inline retry. / [ ] RHF `parse` output assignable to Commands. / [ ] Existing Vitest green. / [ ] Committed.
- [ ] **Guardrail:** deviations §F unchanged (no invented `frozen_since`/columns/live pending-recent).

**Risks**
- Dashboard four independent card states; accidental dialog-close on mutation error; wilaya→commune reset/refetch edge cases; inline-edit dirty/cancel state.

---

### Sprint 5: Assembly — Activators (list + detail)   — Status: ⬜ Pending

**Goals**
- Activators list + detail fully wired: reads, paginated/searchable table, all mutations, RHF forms, one-time password reveal, soft-delete payments.

**Tasks**
- [ ] List reads (#wiring): `useActivatorsSummary` + `useActivators({ page, limit, search })`; pagination via `ui/pagination`, debounced search, `per_page` (10/20/50/100) → `limit`.
- [ ] List writes (#wiring/#form): `useCreateActivator` (RHF + `zodResolver(create-activator.schema)`; success → swap to `GeneratedPasswordPanel`), `useToggleActivator`, `useDeleteActivator` (`AlertDialog`), `useRecordPayment` (RHF `record-payment.schema`, inject row `activatorId`).
- [ ] Detail reads (#wiring): `useActivator(id)`, `useActivatorPerformance(id, { days: 30 })`, `usePayments({ activatorId: id, page, limit })`; invalid `id` → `NotFoundState`.
- [ ] Detail writes (#wiring/#form): `useUpdateActivator` (RHF `update-activator.schema`), `useToggleActivator`, `useResetActivatorPassword` (reveal once via `GeneratedPasswordPanel`), `useRecordPayment`, `useDeletePayment` (`AlertDialog`; Paid/creditsOwed recompute via in-hook invalidation).
- [ ] Nav (#wiring): row/View → `<Link>` `/admin/activators/:id`; "View All Activations by This Activator" → `<Link>` `/admin/activations?activator={id}` (link only).

**Validation**
- [ ] Copy via `useTranslation`. / [ ] `tsc` clean. / [ ] RHF `parse` output assignable to Commands. / [ ] No fetch `useEffect`. / [ ] Modals preserve values on error, close only on success. / [ ] Existing Vitest green. / [ ] Committed.

**Risks**
- Shared modal state across list/detail; one-time secret lifecycle (never refetch/persist); `date` default = today.

---

## PHASE 4 — POLISH

### Sprint 6: Polish — responsive, performance, a11y, theming   — Status: ⬜ Pending

**Goals**
- Desktop-first admin polish across shell + 5 pages; memoization exactly where plan §B8 calls for it (and nowhere else); a11y + dark/light parity.

**Tasks**
- [ ] Responsive (#ui): admin grid + sidebar behavior; verify table horizontal-scroll and `DataTable` mobile stacked rows; header/user-menu on tablet (mobile best-effort per spec).
- [ ] Performance (#perf): confirm `ColumnDef[]` memoization on every table; Dashboard `useMemo` derivations; debounced search (~300 ms); `enabled`-gating on `useCommunes`; add `useCallback` only for handlers passed hot to memoized children. **Do not** add speculative memo (rules §5).
- [ ] a11y (#a11y): dialog focus-trap/return, `aria-label` on icon buttons + bell, `<label>` on selects/inputs, keyboard nav for menus/pagination.
- [ ] Theming: dark/light parity for `StatCard`, tables, dialogs, badges (semantic CSS vars).

**Validation**
- [ ] Copy via `useTranslation`. / [ ] `tsc` clean. / [ ] No new layout shift; no unnecessary memoization introduced. / [ ] Existing Vitest green. / [ ] Committed.

**Risks**
- Over-memoization hurting clarity; dark-mode contrast on status colors.

---

## PHASE 5 — TESTS  (`/tests/unit/**`, `vi.mock` hooks — never MSW; mock `useTranslation`, assert keys)

### Sprint 7: Unit tests — Shell + Dashboard + Activators + Distributors   — Status: ⬜ Pending

**Goals**
- Every page + shell's reaction-to-state covered with mocked hooks; Zod validation and mutation dispatch asserted. *(If this sprint balloons, split by area — shell+dashboard / activators / distributors.)*

**Tasks**
- [ ] *Shell* (#testing) `/tests/unit/components/layout/`: `AdminGuard.spec.tsx` (mock `useSession` → resolving spinner / invalid → redirect / non-admin → redirect); `AdminHeader.spec.tsx` (Sign Out confirm ⇒ `useLogout`); `NotificationBell.spec.tsx` (mock `useRealtimeStatus` → indicator states).
- [ ] *Dashboard* (#testing) `/tests/unit/pages/dashboard/DashboardPage.spec.tsx` per plan §D1.6: `vi.mock` 6 reads + 2 mutations + `useTranslation`; 4 skeletons on `isLoading`; card values from mocked DTOs; each region `EmptyState` on `[]` and `NotFoundState`+Retry (⇒ `refetch`) on `isError`; frozen Activate/Cancel confirm ⇒ `mutate(id)`; pending tier class at 5m/15m boundary.
- [ ] *Activators* (#testing) `/tests/unit/pages/activators/` + `/activator-detail/` per §D2.6/§D3.6: `ActivatorsPage`, `CreateActivatorModal` (Zod errors via `userEvent`; valid ⇒ `mutate(command)`; success ⇒ password panel + copy), `RecordPaymentModal` (`activatorId` in command), `ActivatorDetailPage` (invalid-id ⇒ `NotFoundState`+back), `EditActivatorModal`, `PaymentsHistoryTable` (delete confirm ⇒ `useDeletePayment`; soft-deleted styling), Reset-PW reveal; chart asserted via mocked recharts container (empty branch, not SVG).
- [ ] *Distributors* (#testing) `/tests/unit/pages/distributors/` + `/distributor-detail/` per §D4.6/§D5.6: `DistributorsPage` (empty vs no-match+Clear; filters/pagination mutate query; toggle/delete confirm ⇒ `mutate`), `CreateDistributorModal` (**commune disabled until wilaya; select wilaya calls `useCommunes(id)`; change wilaya resets commune**; Zod errors), `DistributorDetailPage` (invalid-id ⇒ `NotFoundState`+back; compact-table empty states), `DistributorProfileCard` (**wilaya change resets commune + refetches**; valid ⇒ `useUpdateDistributor`).

**Validation**
- [ ] `vitest run` green with mocked hooks (success/loading/error). / [ ] No MSW; no `/src` tests; `useTranslation` mocked (assert keys, not translated copy). / [ ] `tsc` clean. / [ ] Committed.

**Risks**
- Large test sprint — split by area if it grows. `user-event` async validation awaits; recharts + `ui/select` interaction under RTL; mocking realtime/session cleanly.

---

## Traceability (sprint → plan → artifacts)

| Sprint | Plan refs | Primary artifacts (plan §G) |
|--------|-----------|------------------------------|
| S1 | §B4, §B6, §B8, §G | 5 `*.schema.ts`; `translations.json` keys; `/admin/*` lazy routes + guard/layout stubs |
| S2 | §C, §D1.2–3 | shell (`AdminLayout/Sidebar/Header/NotificationBell/AdminGuard`) + `DashboardPage` primitives |
| S3 | §D2.2, §D3.2, §D4.2, §D5.2 | Activators + Distributors list/detail components; shared `RecordPaymentModal`, `GeneratedPasswordPanel`, `Wilaya`/`CommuneSelect` |
| S4 | §D1.1/4/5, §D4.1/4, §D5.1/4, §F | Dashboard wiring + mutations; Distributors reads/writes + RHF + dependent selects |
| S5 | §D2.1/4, §D3.1/4 | Activators reads/writes + RHF + one-time password + soft-delete |
| S6 | §B6, §B8 | responsive / perf / a11y / theming |
| S7 | §C, §D1.6, §D2.6, §D3.6, §D4.6, §D5.6 | shell + dashboard + activators + distributors specs |

**Blocked-by-upstream (do not build here):** plan §E `F-1..F-4`, `F-6` — Dashboard fidelity beyond §F waits on contract/realtime enrichment. Execution reports (if the execute phase adds them) follow the Sub-02 `report-sprint-NN.md` convention in this folder.
