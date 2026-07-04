# Admin Panel · Part 1 — Page Assembly Plan (SV-PAGE-006 → 010)

> **Stage 03 · Sub-03 · Phase 01 (Planning).** No code — audit + plan only.
> **Pages:** Dashboard · Activators list · Activator detail · Distributors list · Distributor detail
> **Routes:** `/admin` · `/admin/activators` · `/admin/activators/:id` · `/admin/distributors` · `/admin/distributors/:id`
> **Inputs:** [SV-PAGE-006-010_admin_part1_spec.md](../../../../Stage-00-Conception/Pages-Requirements/SV-PAGE-006-010_admin_part1_spec.md) · [front-end-rules.md](../../../front-end-rules.md) · [front-end-test-rules.md](../../../front-end-test-rules.md) · `@my-app/contract` · existing `Apps/web/src/hooks`
> **Governance:** rules = HOW · phase file = WHAT/WHEN · contract = WHICH. HOW conflicts resolved toward the rules and noted in §B; genuine WHICH conflicts escalated (see session decisions).

---

## A. Session decisions (answered before planning)

| # | Question | Decision |
|---|----------|----------|
| 1 | Output granularity | **One combined set-level `plan.md`** (this file). |
| 2 | Dashboard vs contract gaps | **Plan against what exists today** — assemble from existing summary/list hooks, accept reduced fidelity, log every deviation (§F). |
| 3 | Admin shell scope | **Judgment call → include a lean Admin Shell foundation** (§C). The admin area is entirely unbuilt, so no admin page can route/render without it; a combined plan is the natural home for shared chrome. |
| 4 | Activators "Password" column | **Drop the plaintext column**; expose passwords only through the one-time create response + a "Reset Password" row action. |

**Audit headline:** 4 of 5 pages map cleanly onto **existing Sub-02 hooks + contract DTOs**. Only the **Dashboard** is materially under-served by the contract. No new libraries required (`recharts`, `sonner`, shadcn already present).

---

## B. Cross-cutting resolutions (apply to every page)

### B1. Hook-name reconciliation (spec name → real export)
The spec names hooks by page-logical intent; the Integration Engine groups them by domain. These are **notation differences, resolved toward the contract/codebase** — no new hooks needed:

| Spec calls it | Real export (file) | Note |
|---|---|---|
| `useActivatorDetail` | `useActivator(id)` — `useActivators.ts` | same thing |
| `useActivatorPayments` | `usePayments({ activatorId, page, limit, includeDeleted })` — `usePayments.ts` | `GetPaymentsQuery.activatorId` scopes it |
| `useDistributorDetail` | `useDistributor(id)` — `useDistributors.ts` | same thing |
| `useDistributorOrders` | `useOrders({ distributorId, limit })` — `useOrders.ts` | `GetOrdersQuery.distributorId` |
| `useDistributorCards` | `useCards({ distributorId, limit })` — `useCards.ts` | `GetCardsQuery.distributorId` |
| `useActivateActivationByAdmin` | `useActivateByAdmin()` — `useAdminActivations.ts` | `mutate(id)` |
| `useCancelActivationByAdmin` | `useCancelByAdmin()` — `useAdminActivations.ts` | `mutate(id)` |
| `useFrozenActivations` | `useAdminActivations({ state: FREEZE, limit })` | no dedicated frozen hook (§F) |
| `useAdminWebSocket` | `connectRoleSocket(UserRole.ADMIN)` + `useRealtimeStatus()` — `lib/realtime.ts` | invalidation-only; no event feed (§F) |

### B2. Endpoint notation (spec REST path → real contract route)
The spec writes nested admin paths (`/api/admin/activators/{id}/payments`); the contract exposes **flat, filtered** routes (`PAYMENT_ROUTES` `/payments?activatorId=`; `ORDER_ROUTES`/`CARD_ROUTES` with `distributorId`). Services already use the contract routes via `apiPath`/`withParams`. **Resolved toward the contract** — pages consume the filtered hooks above; the `/admin` prefix lives in `VITE_API_URL`, never hardcoded (rules §3A).

### B3. Header stat sums come from summary hooks, not the list response
Spec text implies the list endpoints return `records[] + header sums` in one payload. The contract splits them: `PaginatedActivators`/`PaginatedDistributors` carry **records only**; the four header cards come from dedicated summary hooks that map 1:1:
- Activators header → `useActivatorsSummary()` → `{ totalActivators, onlineNow, totalSuccessful, totalCreditsOwed }` ✓
- Distributors header → `useDistributorsSummary()` → `{ totalDistributors, activeWithStock, totalCardsInStock, activationsThisMonth }` ✓

Each header card and the table load **independently** (own skeleton, own error).

### B4. Forms: co-located schemas refine loose contract commands
Contract commands are wire-loose (`fullName: z.string()`, no length/regex). The rules permit co-located `[name].schema.ts` (precedent: `components/sections/landing/account-form.schema.ts`). **Each form defines a local Zod schema that adds the spec's UX constraints and whose `parse()` output is assignable to the contract Command.** Pattern per existing code: `zodResolver` + shadcn `ui/form.tsx` + `useForm`. Server-only rules (username uniqueness) are **not** client-validated — surfaced as mutation errors (see B5).

### B5. Mutations, toasts, dialogs (uniform behavior)
- Global error feedback is already wired: `mutationCache.onError → toast` in `query-client.ts`. **Pages never add per-mutation error toasts.** A failed write ⇒ automatic toast, and the modal/row **stays open with values preserved** (only close/reset `onSuccess`).
- Query background-refetch failures toast only when data already exists (cache `onError` guard). 401 ⇒ axios redirect, never a toast.
- Destructive / state-changing actions (Activate/Cancel by admin, Enable/Disable, Delete, Delete Payment) use shadcn `AlertDialog`; the Cancel-by-admin confirm spells out the consequence ("the card will be marked failed").
- Invalidation is owned by the hooks (e.g. `useRecordPayment` sweeps `qk.payments.all()` + `qk.activators.all()`); pages never call `invalidateQueries` themselves.

### B6. i18n, theme, layout preservation
- **No inline JSX strings.** All copy via `useTranslation()` `t('admin.<area>.<element>')`, added to `src/config/translations.json` (flat key → `{ en, fr, ar:'' }`; `ar` reserved-empty, EN/FR only). Non-component copy (none expected here) would use `translate()`.
- Loading/error/empty are **localized inside the content area** — the `AdminLayout` (sidebar/header) never unmounts (rules §4). No full-page spinner except the session-resolving gate in the shell.
- Admin is **desktop-first**; tables may horizontal-scroll on mobile (`DataTable` already renders a stacked mobile variant via `renderMobileRow`).

### B7. Shared-component reuse map (build nothing that exists)
| Need | Reuse from `components/shared` (or `ui`) |
|---|---|
| Stat card + its loader | `StatCard` + `StatCardSkeleton` |
| Data table (desktop + mobile) | `DataTable` (presentational; page owns search/pagination/sort) |
| Table loading | `TableSkeleton` |
| Empty region (with CTA) | `EmptyState` (CTA goes in `decoration` slot) |
| Section error **with retry** + 404 detail | `NotFoundState` (`action` slot = Retry button / back `<Link>`; comment already earmarks it for section `isError`) |
| Chart loading | `ChartSkeleton` |
| Live/relative timers (waiting, frozen-since, duration) | `LiveTimer` |
| Status badges (enabled/disabled, activation state) | `StatusBadge` |
| One-time password reveal copy | `CopyButton` |
| Page title + actions | `PageHeader` |
| Route-split fallback | `PageLoader` (with `React.lazy`/`Suspense`) |
| Pagination control | `ui/pagination` |
| Modals / confirms / selects / forms | `ui/dialog`, `ui/alert-dialog`, `ui/select`, `ui/form`, `ui/input`, `ui/label` |

### B8. Optimization posture (rules §5 — clarity over premature memo)
- **`React.lazy()` + `<Suspense fallback={<PageLoader/>}>`** on all five admin route components (code-split only).
- `useMemo` **only** where it earns it: react-table `ColumnDef[]` arrays (stable identity), the Dashboard "completed" derived count (sum over `byState`), and pending/frozen wait-tier color maps.
- **Debounce** the list search inputs (~300 ms) before it becomes the `search` query param, so keystrokes don't each trigger a refetch. No other memoization planned.

---

## C. Admin Shell foundation (shared prerequisite — included per decision #3)

**New — `src/components/layout/`:** `AdminLayout.tsx`, `AdminSidebar.tsx`, `AdminHeader.tsx`, `NotificationBell.tsx`, `AdminGuard.tsx`. Mirror the existing Activator shell (`ActivatorLayout/Sidebar/Header`) for structure, theming, and `useTranslation`. **No commerce UI** (no cart/search/store-locator) — admin only (rules §6C).

- **`AdminGuard`** — thin role-checked wrapper over the existing `ProtectedRoute` + `useSession`/`AuthProvider`: session resolving → full-page spinner (the *only* full-page state); invalid/expired → redirect `/login`; authed non-admin → redirect. Wraps the whole `/admin/*` subtree.
- **`AdminSidebar`** — persistent left panel, collapsible groups, active route highlighted. Renders the **full** conception nav (Dashboard, Activators, Distributors▾, Activations▾, Statistics, Settings, Logs) but only the **Part-1 routes** resolve; every other item is a plain `<Link>` to a route delivered in Part 2/3 (**scope confinement** — plan the link, not the destination).
- **`AdminHeader`** — logo, `LanguageToggle` (EN/FR), `ThemeToggle`, admin display name menu with **Sign Out** (confirm dialog → `useLogout` → `disconnectRoleSocket()` → `<Link>`/redirect `/login`), and `NotificationBell`.
- **Realtime wiring** — `AdminLayout` calls `connectRoleSocket(UserRole.ADMIN)` on mount / `disconnectRoleSocket()` on unmount. The bell's reconnect indicator reads `useRealtimeStatus()` (`connecting`/`connected`/`disconnected`).
- **`NotificationBell` — reduced fidelity (§F):** the admin socket today only invalidates queries on `activation:frozen`; there is **no event feed** to derive a badge/list from (realtime is invalidation-only by design). Plan the bell chrome + connection indicator now; the **live FREEZE badge/list is deferred** pending an upstream event-feed (§F-6). It does not block the Dashboard's frozen table, which refreshes via query invalidation (§D1).

**Router:** add `/admin/*` under `AdminGuard` with the five lazy routes; keep loop-safe 401 handling (already in axios).

---

## D. Page plans

### D1 — Dashboard · `/admin` (SV-PAGE-006)  *(reduced fidelity — see §F)*

**1. Hook & Data Mapping**
| Region | Hook (existing) | DTO | Live? |
|---|---|---|---|
| Stat card "Total Activations" | `useActivationsSummary()` | `ActivationsSummaryDTO` — number = `useMemo` sum of `byState` for `ACTIVATED`+`ACTIVATED_BY_ADMIN`; sub = `+{total.month} this month` | via `qk.activations.all()` |
| Stat card "Total Activators" | `useActivatorsSummary()` | `{ totalActivators, onlineNow }` — sub = `{onlineNow} online now` | — |
| Stat card "Total Distributors" | `useDistributorsSummary()` | `{ totalDistributors, activeWithStock }` — sub = `{activeWithStock} with active stock` | — |
| Stat card "Active Cards" | `useDistributorsSummary()` | `{ totalCardsInStock, activeWithStock }` — sub = `across {activeWithStock} distributors` | — |
| **Frozen** (priority, live) | `useAdminActivations({ state: ActivationStat.FREEZE, limit: 50 })` | `AdminActivationDTO[]` → key, subscriptionLabel, activatorFullName, clientName, freezeReason | **yes** — admin socket `activation:frozen` → invalidates `qk.activations.all()` (covers `…list…`) |
| **Recent** (last 10 completed) | `useRecentActivations()` | `RecentActivationDTO[]` → subscriptionLabel, keyMasked, completedAt, state | not live under admin socket (§F-6) |
| **Pending** (live, color-coded) | `usePendingActivations()` | `PendingActivationDTO[]` → subscriptionLabel, keyMasked, requestedAt | not live under admin socket (§F-6) |
| Row actions (frozen) | `useActivateByAdmin()` / `useCancelByAdmin()` | `mutate(id)`; invalidate activations + activators (in-hook) | — |

> **Not** using `useDashboardStats()`: its DTO (`{activationsToday, totalRevenue, pendingActivations, activeActivators}`) does not match the spec's four cards — the summary hooks fit better. Left unconsumed (documented in §F-1).

**2. UI Components** — *New* `src/pages/admin/DashboardPage.tsx` + `components/`: `StatsRow`, `FrozenActivationsTable`, `RecentActivationsTable`, `PendingActivationsTable`, `ResolveFreezeDialog` (Activate/Cancel `AlertDialog`). *Shared:* `StatCard(Skeleton)`, `DataTable`, `TableSkeleton`, `EmptyState`, `NotFoundState`, `LiveTimer`, `StatusBadge`, `PageHeader`.

**3. Granular States**
- Loading: 4× `StatCardSkeleton`; each table → `TableSkeleton`.
- Empty: Frozen → green `EmptyState` "✓ No frozen activations — all running smoothly."; Recent → "No completed activations yet."; Pending → "All clear — no pending requests right now."
- Error: each region → `NotFoundState` (compact) with `action={<Button onClick={refetch}>Retry</Button>}`. A failed Activate/Cancel → global toast, row stays.

**4. Forms & Mutations** — no forms. Two confirm dialogs → `useActivateByAdmin` / `useCancelByAdmin` (`mutate(activationId)`); Cancel dialog states the card-failed consequence. Pending/Frozen "since" + Recent duration render via `LiveTimer`/computed `mm:ss` from timestamps.

**5. Optimization** — lazy route; `useMemo` for the completed-count reduction and the pending wait-tier color map (green `<5m` / amber `5–15m` / red `>15m`, from `requestedAt`); memoized `ColumnDef[]` per table.

**6. Unit-Test Strategy** — `/tests/unit/pages/dashboard/DashboardPage.spec.tsx`: `vi.mock` all six read hooks + two mutation hooks + `useTranslation`. Assert: 4 skeletons while `isLoading`; card numbers/sublabels from mocked DTOs; each region's `EmptyState` on `[]` and `NotFoundState`+retry (click ⇒ `refetch` called) on `isError`; frozen Activate/Cancel open dialog and confirm ⇒ `mutate(id)`; pending rows get the right tier class for boundary `requestedAt` values.

**7. Acceptance Criteria** — layout never breaks through any region's loading/error; four cards render from the summary hooks; frozen table lists FREEZE rows, refreshes on a live freeze, and resolves rows via admin mutations; recent shows last-10; pending is color-coded; all copy translated; deviations in §F acknowledged.

---

### D2 — Activators list · `/admin/activators` (SV-PAGE-007)

**1. Hook & Data Mapping**
- Header sums → `useActivatorsSummary()` (`totalActivators`, `onlineNow`, `totalSuccessful`, `totalCreditsOwed`).
- Table → `useActivators({ page, limit, search })` → `PaginatedActivators` (`ActivatorDTO`: fullName, username, phone, nbOfSuccessfulActivation, avgActivationTimeSeconds, totalEarning, `credits`=Credits Owed, isEnabled, lastLoginAt).
- Writes → `useCreateActivator` (→ `ActivatorWithCredentialsDTO`), `useToggleActivator`, `useDeleteActivator`, `useRecordPayment`.
- Nav → row/"View" → `<Link to="/admin/activators/{id}">`.

**2. UI Components** — *New* `pages/admin/activators/ActivatorsPage.tsx` + `components/`: `ActivatorsStatsRow`, `ActivatorsTable`, `ActivatorSearch`, `CreateActivatorModal` (+ `GeneratedPasswordPanel` reused w/ detail), `RecordPaymentModal` (shared w/ detail), row `ActivatorActionsMenu`. *Shared:* `StatCard(Skeleton)`, `DataTable`, `TableSkeleton`, `EmptyState`, `NotFoundState`, `StatusBadge`, `CopyButton`, `PageHeader`, `ui/pagination`, `ui/dialog`, `ui/alert-dialog`.
- **Password column dropped** (decision #4). Actions column = View · Enable/Disable · Delete · Record Payment · (password only via create panel / detail Reset).

**3. Granular States** — loading: stats skeletons + `TableSkeleton`. Empty: no data → `EmptyState` "No activators yet." with **Add** button in `decoration`; no search match → `EmptyState` "No activators match your search." + Clear. Error: table → `NotFoundState`+Retry; create/toggle/delete/payment fail → toast, modal preserved.

**4. Forms & Mutations**
- `create-activator.schema.ts` → `CreateActivatorCommand`: `fullName` 3–100; `username` 3–30 `^[A-Za-z0-9_]+$`; `phone` Algerian `^(?:\+213|0)(5|6|7)\d{8}$`; `initialCredits` optional ≥0 default 0. Success ⇒ swap modal body for `GeneratedPasswordPanel` (one-time `generatedPassword` + `CopyButton`). Username uniqueness = server error only.
- `record-payment.schema.ts` → `RecordPaymentCommand`: inject `activatorId` (from row); `amount` `>0`, `multipleOf 0.01`; `date` optional default today (no note field).

**5. Optimization** — lazy route; memoized `ColumnDef[]`; debounced search; `per_page` select (10/20/50/100) drives `limit`.

**6. Unit-Test Strategy** — `/tests/unit/pages/activators/`: `ActivatorsPage.spec.tsx` (skeletons; empty vs no-match; `NotFoundState`+retry; pagination/per-page changes query; row menu triggers toggle/delete confirms ⇒ `mutate`). `CreateActivatorModal.spec.tsx` (Zod errors via `userEvent` on invalid submit; valid ⇒ `mutate(command)`; success ⇒ password panel + copy). `RecordPaymentModal.spec.tsx` (amount/date validation; `activatorId` in command). Mock hooks + `useTranslation`.

**7. Acceptance Criteria** — searchable/paginated table; four header stats; create returns & reveals one-time password; enable/disable/delete/record-payment via confirmed mutations with preserved-on-error modals; no plaintext password anywhere; layout preserved; translated.

---

### D3 — Activator detail · `/admin/activators/:id` (SV-PAGE-008)

**1. Hook & Data Mapping**
- Profile+stats → `useActivator(id)` → `ActivatorDetailDTO` (adds `totalPaid`, `creditsOwed`, `successRate`).
- Chart → `useActivatorPerformance(id, { days: 30 })` → `ActivatorPerformanceDTO.series[{date,count,earned}]`.
- Payments → `usePayments({ activatorId: id, page, limit })` → `PaginatedPayments` (`recordedByName`, `previousCredits`, `isDeleted`).
- Writes → `useUpdateActivator`, `useToggleActivator`, `useResetActivatorPassword` (→ one-time password), `useRecordPayment`, `useDeletePayment`.
- Nav → "View All Activations by This Activator" → `<Link to="/admin/activations?activator={id}">` (destination = Part 3; link only).

**2. UI Components** — *New* `pages/admin/activators/ActivatorDetailPage.tsx` + `components/`: `ProfileCard` (+ `EditActivatorModal`), `StatsRevenueGrid`, `PerformanceChart` (recharts `LineChart`), `PaymentsHistoryTable`, reuse `RecordPaymentModal` + `GeneratedPasswordPanel` (Reset PW). *Shared:* `StatCard`, `DataTable`, `ChartSkeleton`, `TableSkeleton`, `EmptyState`, `NotFoundState`, `CopyButton`, `StatusBadge`, `ui/alert-dialog`.

**3. Granular States** — loading: profile/stats skeleton, `ChartSkeleton`, payments `TableSkeleton`. Empty: no payments → `EmptyState` + Record Payment CTA; empty chart → "No activity in this period." Error: profile fail → full-section `NotFoundState`+Retry; **invalid `:id`** → `NotFoundState` "Activator not found." + back `<Link>` to `/admin/activators`; edit/reset/payment fail → toast, values preserved.

**4. Forms & Mutations**
- `update-activator.schema.ts` → `UpdateActivatorCommand` (all optional; same field rules as create; username uniqueness server-side).
- Reuse `record-payment.schema.ts`. Reset PW → confirm → `useResetActivatorPassword(id)` → reveal once (`CopyButton`). Delete payment → `AlertDialog` → `useDeletePayment` (soft delete; `creditsOwed`/Paid recompute via invalidation; soft-deleted excluded from Paid).

**5. Optimization** — lazy route; memoized payments `ColumnDef[]`; chart data passed straight to recharts (no memo unless profiling shows cost).

**6. Unit-Test Strategy** — `/tests/unit/pages/activator-detail/`: `ActivatorDetailPage.spec.tsx` (skeletons; invalid-id ⇒ `NotFoundState`+back link; stats render). `EditActivatorModal.spec.tsx` (partial-update validation ⇒ `mutate`). `PaymentsHistoryTable.spec.tsx` (delete confirm ⇒ `useDeletePayment`; soft-deleted styling; empty state). Reset-PW reveal test. Mock hooks + `useTranslation`; assert chart via a mocked recharts container (test the empty-state branch, not SVG internals).

**7. Acceptance Criteria** — profile + six stat tiles from `ActivatorDetailDTO`; 30-day chart or its empty state; paginated payments with recorded-by + soft-delete handling; edit/reset/record/delete via mutations; invalid id handled locally (no global 404); translated; layout preserved.

---

### D4 — Distributors list · `/admin/distributors` (SV-PAGE-009)

**1. Hook & Data Mapping**
- Header sums → `useDistributorsSummary()`.
- Table → `useDistributors({ page, limit, search, wilayaId, communeId })` → `PaginatedDistributors` (`DistributorDTO`: fullName, storeName, phone, `wilayaName`, `communeName`, nbOfActivation, nbOfActiveCards, deliveredOrdersCount, isEnabled — all resolved names, no client-side joins).
- Filter selects → `useWilayas()` + `useCommunes(wilayaId)` (commune disabled until wilaya).
- Writes → `useCreateDistributor`, `useToggleDistributor`, `useDeleteDistributor`.
- Nav → row/"View" → `<Link to="/admin/distributors/{id}">`.

**2. UI Components** — *New* `pages/admin/distributors/DistributorsPage.tsx` + `components/`: `DistributorsStatsRow`, `DistributorsFilters` (search + `WilayaSelect` + `CommuneSelect`), `DistributorsTable`, `CreateDistributorModal`, `DistributorActionsMenu`. *Shared:* `StatCard(Skeleton)`, `DataTable`, `TableSkeleton`, `EmptyState`, `NotFoundState`, `StatusBadge`, `ui/select`, `ui/pagination`, `ui/dialog`, `ui/alert-dialog`.

**3. Granular States** — loading: stats skeleton, `TableSkeleton`; **commune select disabled + spinner until wilaya chosen**. Empty: no data → `EmptyState` + Add CTA; no filter match → "No distributors match your filters." + Clear Filters. Error: table → `NotFoundState`+Retry; create/toggle/delete fail → toast, modal preserved; **wilaya/commune fetch fail → inline "Couldn't load — retry" inside the select**.

**4. Forms & Mutations** — `create-distributor.schema.ts` → `CreateDistributorCommand`: `fullName` 3–100; `storeName` 2–100; `phone` Algerian regex; `wilayaId` uuid required; `communeId` uuid required. Selects **send ids**, reads **return resolved names**. Commune options from `useCommunes(selectedWilayaId)`; changing wilaya resets commune.

**5. Optimization** — lazy route; memoized `ColumnDef[]`; debounced search; `useCommunes` gated by `enabled: !!wilayaId`.

**6. Unit-Test Strategy** — `/tests/unit/pages/distributors/`: `DistributorsPage.spec.tsx` (skeletons; empty vs no-match+Clear; filters/pagination mutate query; toggle/delete confirms ⇒ `mutate`). `CreateDistributorModal.spec.tsx` (**wilaya→commune dependency**: commune disabled until wilaya; selecting wilaya calls `useCommunes(id)`; Zod errors; valid ⇒ `mutate(command)`). Mock hooks + `useTranslation`.

**7. Acceptance Criteria** — searchable + wilaya/commune-filtered, paginated table with resolved names; four header stats; dependent selects with disabled/loading/error states; create/toggle/delete via confirmed mutations; layout preserved; translated.

---

### D5 — Distributor detail · `/admin/distributors/:id` (SV-PAGE-010)

**1. Hook & Data Mapping**
- Profile+stats → `useDistributor(id)` → `DistributorDetailDTO` (adds `soldKeys`, `ordersCount`; Remaining Cards = `nbOfActiveCards`, Activations Originated = `nbOfActivation`).
- Orders (compact) → `useOrders({ distributorId: id, limit })` → `OrderDTO` (orderNumber, receivedName, wilayaName, communeName, deliveryCompanyName, orderStat, cardsCount, createdAt, completedAt — every spec column present).
- Cards (compact) → `useCards({ distributorId: id, limit })` → `CardDTO` (key, subscriptionLabel, cardStat, isActive).
- Edit selects → `useWilayas()` + `useCommunes(wilayaId)`.
- Writes → `useUpdateDistributor`, `useToggleDistributor`.
- Nav → "View All Orders" → `<Link to="/admin/distributors/orders?distributor={id}">`; "View All Cards" → `<Link to="/admin/activations/cards?distributor={id}">` (destinations = Part 2/3; links only).

**2. UI Components** — *New* `pages/admin/distributors/DistributorDetailPage.tsx` + `components/`: `DistributorProfileCard` (inline edit with wilaya/commune re-filter), `DistributorStatsGrid`, `OrdersHistoryCompact`, `CardsHistoryCompact`. *Shared:* `StatCard`, `DataTable`, `TableSkeleton`, `EmptyState`, `NotFoundState`, `StatusBadge`, `ui/select`, `ui/alert-dialog`.

**3. Granular States** — loading: profile/stats skeleton, each compact table `TableSkeleton`. Empty: no orders → "No orders for this distributor yet."; no cards → "No cards delivered to this distributor yet." Error: profile fail → section `NotFoundState`+Retry; **invalid `:id`** → "Distributor not found." + back `<Link>`; edit/toggle fail → toast, values preserved.

**4. Forms & Mutations** — `update-distributor.schema.ts` → `UpdateDistributorCommand` (all optional; wilaya/commune ids; commune re-filtered on wilaya change). Enable/Disable → `AlertDialog` → `useToggleDistributor`.

**5. Optimization** — lazy route; memoized compact `ColumnDef[]`; `useCommunes` gated on the edited wilaya.

**6. Unit-Test Strategy** — `/tests/unit/pages/distributor-detail/`: `DistributorDetailPage.spec.tsx` (skeletons; invalid-id ⇒ `NotFoundState`+back; stats render; both compact tables' empty states). `DistributorProfileCard.spec.tsx` (inline edit; **changing wilaya resets commune + refetches**; valid ⇒ `useUpdateDistributor` mutate). Mock hooks + `useTranslation`.

**7. Acceptance Criteria** — profile with inline edit (dependent selects) + four stats; compact orders & cards histories with resolved values, empty states, and "View All" links; toggle/edit via mutations; invalid id handled locally; translated; layout preserved.

---

## E. Missing hooks / contract DTOs to resolve first (Expected Output)

Nothing blocks the four clean pages (D2–D5). The items below are **Dashboard/shell gaps** — the spec asks for data the contract/realtime layer doesn't yet provide. Per rules §2, a missing DTO is an **upstream (Stage 01 contract / realtime) fix, never a local patch**; for now they are handled via the reduced-fidelity choices in §D1/§C and tracked here.

| # | Gap | Where | Type | Current handling | Recommended upstream fix | Severity |
|---|-----|-------|------|------------------|--------------------------|----------|
| F-1 | `DashboardStatsDTO` doesn't match the 4 spec cards (no all-time-completed, **no trend %**, no disabled count) | D1 stats | contract DTO | source cards from `useActivationsSummary`/`useActivatorsSummary`/`useDistributorsSummary`; derive completed via `byState`; **omit trend % & disabled count** | add a purpose-built `AdminDashboardStats` DTO (completed total, month trend %, activators enabled/disabled/online, cards-in-stock + distributor count) | Med |
| F-2 | No frozen endpoint / `useFrozenActivations`; `AdminActivationDTO` has **no `frozen_since`** | D1 frozen | route + DTO + hook | reuse `useAdminActivations({state:FREEZE})`; **drop the "since" column** (or approximate) | add `GET /activations/frozen` + `FrozenActivationDTO` incl. `frozenSince` + `useFrozenActivations` | Med |
| F-3 | `RecentActivationDTO` lacks `activatorFullName`, `clientName`, `distributorStoreName`, `durationSeconds` | D1 recent | contract DTO | render only the fields present (subscription, key, completedAt, state); **drop 4 columns** | enrich `RecentActivationDTO` with the resolved names + duration | Med |
| F-4 | `PendingActivationDTO` lacks `clientFullName` | D1 pending | contract DTO | **drop the client column** | add `clientFullName` to `PendingActivationDTO` | Low |
| F-5 | `ActivatorDTO` has no `password` field | D2 table | contract DTO / policy | **column dropped** (decision #4); one-time create/reset password only | none — keep the one-time-secret model | Resolved |
| F-6 | Admin socket is invalidation-only, wires only `activation:frozen`→`all`; **no bell event feed**, no `new_pending`/`completed` listeners | Shell + D1 | realtime | frozen table refreshes live; **pending/recent not live; bell badge deferred** | add admin-namespace `activation:created`/`activation:completed` invalidations (→ `pending`/`recent`) + a small event-feed store for the bell (or `useAdminWebSocket`) | Med |
| F-7 | Admin shell (`AdminLayout/Sidebar/Header/Guard/Bell`, `useAdminWebSocket`) not built | Shell | components/hook | planned as foundation in §C | build once; reused by Parts 2/3 | Planned |

---

## F. Deviations ledger (Dashboard, "plan against what exists")

Rendered per decision #2; each is a knowing reduction vs SV-PAGE-006, traceable to §E:
- Card "Total Activations": no **trend % vs previous month** (F-1).
- Card "Total Activators": no **disabled count** in the sub-label (F-1).
- Frozen table: no **frozen-since** relative timestamp (F-2).
- Recent table: no **activator / client / distributor / duration** columns (F-3).
- Pending table: no **client name** column (F-4); wait-tier color-coding retained (client-derived).
- Live behavior: **frozen = live**; **pending & recent do not auto-refresh** under the current admin socket; **notification-bell badge deferred** (F-6).

Everything else in SV-PAGE-006 → 010 is planned at full fidelity against existing hooks + DTOs.

---

## G. Net-new artifact inventory (for the sprint/execute phase)

- **Shell:** `layout/AdminLayout|AdminSidebar|AdminHeader|NotificationBell|AdminGuard.tsx` + `/admin/*` lazy routes.
- **Pages:** `pages/admin/DashboardPage.tsx`; `pages/admin/activators/{ActivatorsPage,ActivatorDetailPage}.tsx`; `pages/admin/distributors/{DistributorsPage,DistributorDetailPage}.tsx` (+ each page's `components/`).
- **Schemas (co-located):** `create-activator`, `update-activator`, `record-payment`, `create-distributor`, `update-distributor` `.schema.ts`.
- **i18n:** `admin.shell.*`, `admin.dashboard.*`, `admin.activators.*`, `admin.distributors.*`, `common.actions.*` keys in `translations.json` (en/fr real copy, ar `""`).
- **Tests:** `/tests/unit/pages/{dashboard,activators,activator-detail,distributors,distributor-detail}/*.spec.tsx` (hooks + `useTranslation` mocked).
- **Reused (build nothing):** every hook in §B1/§D, the entire §B7 shared-component set, `lib/realtime.ts`, `lib/query-keys.ts`.
