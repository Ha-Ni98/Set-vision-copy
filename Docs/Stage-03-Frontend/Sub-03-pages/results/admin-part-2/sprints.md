# Admin Panel · Part 2 — Page Assembly Sprint Plan (SV-PAGE-011 → 013)

> **Stage 03 · Sub-03 · Phase 02 (Sprint Planning).** No code yet — a build playbook.
> **Source plan:** [results/admin-part-2/plan.md](./plan.md) · **Phase file:** [stage-03-sub-03-phase-02-sprints.md](../../stage-03-sub-03-phase-02-sprints.md) · **Rules:** [front-end-rules.md](../../../front-end-rules.md), [front-end-test-rules.md](../../../front-end-test-rules.md) · **Contract:** `@my-app/contract`
> **Governance:** rules = HOW · phase = WHAT/WHEN · contract = WHICH. HOW conflicts resolved toward the rules/explicit instruction and noted.

---

## Ordering & program shape

Required global order: **Foundation → Primitives & States → Assembly & Wiring → Polish → Tests** (UI before wiring; wiring never precedes primitives). This is one combined plan for **3 pages and no new shell** (the Part-1 Admin Shell + every shared component already exists), so it is **lighter than Part 1** — Primitives collapse to a single sprint; only Assembly splits, isolating the heavy Orders wizard. **Six sprints, five phases:**

| Phase | Sprints | Scope |
|-------|---------|-------|
| 1 · Foundation | **S1** | schemas · i18n · 3 lazy routes + stubs · shared Set/Lot badges |
| 2 · Primitives & States | **S2** all three pages | dumb components, skeletons, empty/error fallbacks, static modals/drawer/wizard-panels |
| 3 · Assembly & Wiring | **S3** Orders · **S4** Sets & Lots + Cards | page components, `useQuery`/`useMutation`, RHF, action-gating |
| 4 · Polish | **S5** | responsive (desktop-first), a11y, `useMemo` per plan §B8, honest deviation labels |
| 5 · Tests | **S6** | all three pages, `/tests/unit/**` with `vi.mock` on hooks |

**Dependency spine:** S1 → S2 → {S3, S4} → S5 → S6. Assembly needs primitives (S2 builds all of them up-front). Assembly split by write-surface — **Orders gets its own sprint** (a 4-step RHF wizard + 3 transition/delete flows + a detail drawer, the single heaviest artifact in this part); **Sets & Lots + Cards** pair in one sprint (two `useInventorySummary`-backed stat rows, straightforward create/confirm mutations).

> Coarser than Part 1's 7 sprints by design: no shell to build, 3 pages not 5, and Primitives are mechanical here because the whole `components/shared` library (DataTable, StatCard, EmptyState, NotFoundState, SimplePagination, badges) already exists. Levers if wanted: split S2 by page for ~7–8, or split S4 into Sets&Lots / Cards for ~7.

### Execution protocol (applies to every sprint)
- **Per-sprint gates (non-negotiable, in each Validation block):** ① no inline JSX strings — all copy via `useTranslation` (plan §B6); ② `tsc --noEmit` clean (both `tsconfig.json` + `tsconfig.test.json`); ③ no `useEffect` for fetching (rules §2); ④ layout survives `isError`/`isLoading` with a **localized** fallback, never full-page (rules §4); ⑤ existing Vitest suite stays green (baseline 334 tests from Part 1); ⑥ no test files under `/src`.
- **Tests-last reconciliation (noted HOW resolution):** the phase *template* implies per-sprint page tests, but the explicit Part-1 instruction — carried here — orders **Tests last**. Page `.test.tsx` files are authored in **S6**; S2–S5 keep only the existing suite green plus gates ①–④. Every S2–S4 component is built test-ready (props-driven, hooks isolable) so nothing blocks S6.
- **Commit convention (project memory):** on green, `git add` the touched paths then commit `Sprint N: <Title>` — no co-author trailer; update docs (this file's Status marker + the sprint report) **before** committing. Keep the stray untracked `Docs/Stage-00-Conception/react-algeria-map` **out of commits** (scope-add the paths you changed rather than a blanket `git add .`).
- **Guardrails from the plan:** the §F deviations are *intentional* — do **not** invent a server-side "Cards Awaiting Delivery" (F-1), an `is_active`-aware "Active Cards" count (F-2), a multi-select card `state`/`flag` filter (F-4), or a server `isEnabled` distributor filter (F-5). Missing contract data is an upstream fix (plan §E), never a local patch (rules §2). Reuse existing hooks/badges/`useDebouncedValue`/shared components — build nothing that exists (plan §B7).
- **Naming reconciliations locked (plan §B1/§B2):** hooks are `useOrder`/`useCard` (not `useOrderDetail`/`useCardDetail`); DTOs are camelCase (`receivedName`, `cardsCount`, `nbOfCards`, `deliveredCardsCount`, `lotNumbers`, `cardsDeliveredCount`); pagination is `{ items, meta:{page,limit,total,totalPages} }` with `limit` (not `per_page`/`records`); test files are `.test.tsx` (not `.spec.tsx`).
- **Status legend:** ⬜ Pending · 🟨 In progress · ✅ Done.

---

## PHASE 1 — FOUNDATION

### Sprint 1: Foundation — Schemas, i18n, Routes & Shared Badges   — Status: ✅ Done

**Goals**
- Every form's co-located Zod schema exists and its output is assignable to the matching contract Command.
- All translation keys for the 3 pages present in `translations.json` (EN/FR real copy, `ar: ""`).
- The 3 admin routes mount as `React.lazy()` stubs under the existing `AdminGuard`; `SetStatusBadge`/`LotStatusBadge` exist as shared primitives; `tsc` + existing suite pass with zero page UI built.

**Tasks**
- [x] Co-located schemas (#schema): `pages/admin/distributors/components/create-order.schema.ts` (→ `CreateOrderCommand`); `.../components/mark-delivered.schema.ts` (→ `TransitionOrderCommand` `{ to: DELIVERED, deliveredCount }`); `pages/admin/activations/components/create-set.schema.ts` (→ `CreateSetCommand`); `.../create-lot.schema.ts` (→ `CreateLotCommand`). Constraints per plan §B4/§D1: `receivedName` 3–100; `receivedPhone` `^(?:\+213|0)(5|6|7)\d{8}$`; `lotIds`/`cardIds` `z.array(z.uuid()).nonempty()`; `orderPrice` `>0 .multipleOf(0.01)`; `deliverPrice` `≥0 .multipleOf(0.01)`; `numberOfKeys` int `≥1` default 100; `deliveredCount` int `0…` (max = order cardsCount, enforced at call site); all ids `z.uuid()`. Coerced-number fields export a `z.input` **and** `z.infer` type (Part-1 RHF split). Add a compile-time `AssertAssignable<FormOutput extends Command ? true : false>` to each.
- [x] i18n keys (#i18n): `admin.orders.*`, `admin.setsLots.*`, `admin.cards.*`; enum labels `enums.setStat.*`, `enums.lotStat.*`, `enums.deliveryType.*`, `enums.cardFlag.*`; and reusable `common.actions.*` verbs (`sendToPrint`, `markPrinted`, `markInDelivery`, `markDelivered`, `markReturned`, `disable`, `enable`, `revoke`, `viewCards`, `selectAll`, `deselectAll`, `next`, `back`, `confirm`). Flat key → `{ en, fr, ar:"" }`. (`enums.orderStat.*`/`enums.cardStat.*` already exist from Part 1 — reuse.)
- [x] Route scaffolding (#routing): register `/admin/distributors/orders`, `/admin/activations/sets-lots`, `/admin/activations/cards` with `React.lazy()` page stubs (return `<></>`), inside `<Suspense fallback={<PageLoader/>}>`, under the **existing** `AdminGuard`/`AdminLayout`. Confirm `/admin/distributors/orders` resolves ahead of `/admin/distributors/:id` (static-over-dynamic ranking, plan §C).
- [x] Shared badges (#ui): add `SetStatusBadge` + `LotStatusBadge` to `components/shared/StatusBadge.tsx` via the existing `StatusPill` engine, tones per plan §B9. Nav links already point at the 3 routes — no `nav-links.ts` edit.

**Validation**
- [x] No inline strings — keys resolve via `useTranslation`. / [x] `tsc --noEmit` clean (both configs).
- [x] Each schema output assignable to its contract Command (assertion compiles).
- [x] Lazy routes resolve to stubs, `/orders` doesn't collide with `:id`; existing Vitest green; no `/src` tests. / [x] Committed on green.

**Risks**
- `z.coerce.number()` input/output typing (mitigated by the Part-1 `useForm<Input, unknown, Output>` pattern).
- Route ranking — verify the static `/orders` route wins over `/distributors/:id`.

---

## PHASE 2 — PRIMITIVES & STATES

### Sprint 2: Primitives & States — Orders, Sets & Lots, Cards   — Status: ✅ Done

**Goals**
- Every "dumb" presentational component for all three pages renders from props with a Shadcn `Skeleton` loader and a localized empty/error fallback. No hooks, no data fetching, no form validation — static modals/drawer/wizard-panels only. Existing suite + `tsc` green.

**Tasks** *(all #ui; build test-ready — props-driven, no hook calls)*
- [x] **Orders** (`pages/admin/distributors/components/`): ~~`OrdersStatsRow`~~ **reuses the shared `StatsRow`** (Part-1 precedent), `OrdersFilters` (search + wilaya/company/state/date selects, presentational), `OrdersTable` (`DataTable` columns + `renderMobileRow`, `OrderStatusBadge`, delivery-type label), `OrderDetailDrawer` (static per-lot breakdown), the 5 wizard step panels `StepSelectDistributor`/`StepSelectLots`/`StepReceiverInfo`/`StepDeliveryConfig`/`StepConfirmSummary` (static markup + prop contracts anticipating S3 RHF) **plus a `CreateOrderModal` stepper-host shell** (local `step` state only, no RHF yet — same Sprint-2-vs-later split as Part-1's `CreateActivatorModal`), `MarkDeliveredModal` (static), `OrderActionsMenu` (renders the state-gated action set from a prop).
- [x] **Sets & Lots** (`pages/admin/activations/components/`): ~~`SetsLotsStatsRow`~~ **reuses `StatsRow`**, `SetsTable` (`SetStatusBadge`), `LotsTable` (`LotStatusBadge`), `SetsFilters`, `LotsFilters`, `CreateSetModal` (static form fields), `CreateLotModal` (static candidate checkbox list + Select/Deselect-All + live-count chrome), `SetActionsMenu`, `LotActionsMenu`.
- [x] **Cards** (`pages/admin/activations/components/`): ~~`CardsStatsRow`~~ **reuses `StatsRow`**, `CardsFilters` (key search + state/plan/distributor/flag selects; set/lot render as clearable pre-filter chips, not selects — no hook lists every set/lot number, see report), `CardsTable` (`CardStatusBadge` + `CardFlagChips`, monospace key + `CopyButton`, conditional distributor cell), `CardFlagChips`, `CardDetailModal` (static derived-timeline layout + history `<Link>` slot), `CardActionsMenu`.
- [x] Each region wires its three states: `isLoading` → matching `Skeleton`/`TableSkeleton`; empty → `EmptyState` (with the plan's copy + CTA/`<Link>` slot); `isError` → `NotFoundState` with a `Retry` action slot. Compose the stub pages statically so each primitive is visually verifiable.

**Validation**
- [x] Every primitive renders in isolation from props; loading/empty/error branches all present and localized. / [x] No inline strings; no `useEffect` fetching.
- [x] Desktop-first; wide tables get `DataTable`'s stacked mobile row. / [x] `tsc` clean; existing Vitest green; no `/src` tests. / [x] Committed on green.

**Risks**
- `DataTable` renders desktop **and** mobile variants together in JSDOM — design action buttons/labels so S6 can disambiguate (`getAllBy…[0]`), per Part-1.
- Wizard step-panel prop contracts must anticipate the S3 RHF field wiring (name each controlled field now).

---

## PHASE 3 — ASSEMBLY & WIRING

### Sprint 3: Assembly & Wiring — Orders   — Status: ✅ Done

**Goals**
- `OrdersPage` fully live: summary stats, filterable/paginated table, detail drawer, the 4-step create-order wizard (RHF + all reads + per-step `trigger()` + submit), and every state-gated transition/delete. Layout survives each region's loading/error. `tsc` + existing suite green.

**Tasks**
- [x] Wire `OrdersPage` (#wiring): `useOrdersSummary()` → 4 stat cards; `useOrders({ page, limit, search, distributorId, wilayaId, deliveryCompanyId, state, dateFrom, dateTo })` with `useDebouncedValue` search + `SimplePagination`; seed `distributorId` once from `?distributor=`.
- [x] Filters (#wiring): `useWilayas()`, `useDeliveryCompanies({ active: true })`, state + date-range controls feeding the query.
- [x] Detail drawer (#wiring): `useOrder(id)` (`enabled: !!id`) → `OrderDetailDTO.lots[]` breakdown; receiver/distributor name → `<Link to="/admin/distributors/{id}">`.
- [x] Create-Order wizard (#wiring #forms): one `useForm(create-order)` + local `step` state — **the wizard host (`CreateOrderModal`) now owns every wizard-scoped hook itself** (rather than the page threading a dozen props down, see report); `StepSelectDistributor` (`useDistributors({ search, limit:100 })`, client-filter `isEnabled`); `StepSelectLots` (`useAvailableLotsForOrder({ subscriptionPlanId? })` + `useSubscriptionPlans({ active:true })`, controlled `lotIds`, live card-count, empty → `<Link>` to sets-lots); `StepReceiverInfo` (prefill from chosen distributor, `useWilayas`/`useCommunes(receiverWilayaId)`, commune gated on wilaya); `StepDeliveryConfig` (`useDeliveryCompanies({active:true})`, `deliveryType`, prices); `StepConfirmSummary` → `useCreateOrder.mutate(command)`. Advance only when `form.trigger([...stepFields])` passes.
- [x] Transitions/delete (#wiring): `OrderActionsMenu` gated by `orderStat` (Delete=`PENDING_DELIVERY`; Mark IN_DELIVERY=`PENDING_DELIVERY`; Mark DELIVERED/RETURNED=`IN_DELIVERY`); `MarkDeliveredModal` (mark-delivered schema, default `deliveredCount = order.cardsCount`) → `useTransitionOrder`; IN_DELIVERY/RETURNED/Delete confirm `AlertDialog`s → `useTransitionOrder`/`useDeleteOrder`.
- [x] Optimization (#perf): memoized `ColumnDef[]`, live Step-2 card-count total; rely on the **in-hook** cross-domain invalidation (orders+lots+cards+distributors) — never invalidate from the page.

**Validation**
- [x] No `useEffect` fetching; failed writes rely on the global `mutationCache` toast; wizard/modal stay open + values preserved on error. / [x] Disallowed actions hidden per gating. / [x] Layout survives every region's loading/error. / [x] `tsc` clean; existing Vitest green. / [x] Committed on green.

**Risks**
- Wizard `step` state × RHF `trigger()` gating; `z.coerce` price/int fields (Part-1 split).
- Double-invalidation — the transition hook already fans out; don't re-invalidate.

---

### Sprint 4: Assembly & Wiring — Sets & Lots + Cards   — Status: ✅ Done

**Goals**
- `SetsLotsPage` and `CardsPage` fully live: `useInventorySummary`-backed stat rows (via a `countOf` helper), both Sets/Lots tables + create modals + gated actions; Cards table + filters + URL pre-filters + detail modal + gated confirm actions. Layout survives loading/error. `tsc` + existing suite green.

**Tasks**
- [x] `SetsLotsPage` stats (#wiring): `useInventorySummary()` + a memoized `countOf(arr, stat)` (missing stat ⇒ 0, extracted to shared `lib/utils.ts` since both pages need it) → Total Sets/Lots (summed, no per-stat breakdown subtext — no i18n keys were built for that in S1, see report), Cards in Sets/in Lots; **F-1** card renders total `IN_LOT` with honest label.
- [x] Sets/Lots tables (#wiring): `useSets`/`useLots` with `useDebouncedValue` search + plan/state filters + pagination; `useSubscriptionPlans({active:true})` for the filter selects.
- [x] Create modals (#wiring #forms): `CreateSetModal` (create-set schema) → `useCreateSet`; `CreateLotModal` (create-lot schema, `useAvailableCardsForLot(subscriptionPlanId)` gated on plan, controlled `cardIds` + Select/Deselect-All + live count) → `useCreateLot`. **Both modals call their own `useSubscriptionPlans`/`useAvailableCardsForLot` directly** (same self-contained-hooks architecture as Sprint 3's `CreateOrderModal`), so the page passes only `open`/`onOpenChange`/`onSubmit`/`isPending`.
- [x] Set/Lot actions (#wiring): gated by state → `useTransitionSet`/`useDeleteSet` (cascade-warning `AlertDialog`), `useDeleteLot` (`PENDING` only, "cards return to PRINTED"); "View Cards" → `<Link ?set=setNumber>` / `<Link ?lot=lotNumber>`.
- [x] `CardsPage` (#wiring): `useInventorySummary()` → Total Cards (Σ`cards`), **F-2** Active = `AT_DISTRIBUTOR` count (honest label), Flagged = `cardFlags.disabled + .revoked` — 3 stat cards, not 4 ("Cards by State" is a breakdown array, not a scalar a `StatCard` can render; decided in S2, confirmed here); `useCards({...})` with debounced key search + **single-select** state/set/lot/distributor/plan/flag + pagination; seed `?set/?lot/?distributor/?key` once → clearable filter chips.
- [x] Cards filters + detail + actions (#wiring): `useSubscriptionPlans` + `useDistributors` for the selects; `CardDetailModal` ← `useCard(id)` timeline + `<Link to="/admin/activations?key={key}">`; `CardActionsMenu` gated by `cardStat` + flags → `useDeleteCard`/`useDisableCard`/`useEnableCard`/`useRevokeCard` confirm dialogs.

**Validation**
- [x] `countOf` treats missing stat as 0; F-1/F-2 use honest labels (deviations only). / [x] Single-select state/flag (F-4); no `useEffect` fetching. / [x] Action gating correct per permission table. / [x] Layout survives loading/error. / [x] `tsc` clean; existing Vitest green. / [x] Committed on green.

**Risks**
- `useInventorySummary` feeds **two** pages — keep the two stat mappings straight.
- URL pre-filter seeding vs the debounced search (seed once, don't loop).

---

## PHASE 4 — POLISH

### Sprint 5: Polish — responsive, a11y, memoization, honest labels   — Status: ✅ Done

**Goals**
- Desktop-first responsive pass, a11y labels on icon-only controls, memoization exactly where plan §B8 calls for it, semantic color tokens only, and deviation copy (F-1/F-2) worded honestly. No behavior change. `tsc` + existing suite green.

**Tasks**
- [x] a11y (#a11y): `aria-label` on every icon-only button — Orders/Set/Lot/Card action menus (already present since each was built with `aria-label={t("common.actions.action")}` from Sprint 2), date-range filter inputs (already labeled since Sprint 3). **Confirmed inapplicable to this part:** wizard Next/Back render visible text ("Next"/"Back"), not icons, so no `aria-label` is needed; no per-page-size select exists on any of the 3 pages (only `SimplePagination`'s Prev/Next, unlike Activators' page-size select from Part-1) — nothing to label; flag chips (`CardFlagChips`) are non-interactive `<span>`s, not controls.
- [x] Memoization audit (#perf): confirmed already correct everywhere — all 4 tables' `ColumnDef[]` (`useMemo<ColumnDef<X>[]>`), both pages' `countOf`-based stat arrays, `CreateOrderModal`'s `enabledDistributors`/`cardsTotal`, and `StepSelectLots`' `cardsTotal` are all wrapped in `useMemo`. No `useMemo`/`useCallback` added — rules §5 (clarity over premature memo).
- [x] Responsive (#responsive): confirmed — all 4 tables reuse `DataTable` (Part-1's `overflow-x-auto` desktop wrapper, unmodified) and each supplies a `renderMobileRow` stacked card (name/key + secondary line + status badge, matching Part-1's `DistributorsTable` shape — mobile rows intentionally carry no actions menu either, same as Part-1: admin is desktop-first, "mobile best-effort" per rules §6C). Wizard/drawer/modals all use the shared `Dialog`/`Sheet` default/explicit `max-w-lg`.
- [x] Honest deviation copy (#i18n): **found and fixed** — F-1's stat title still read "Cards in Lots (Awaiting Delivery)", which smuggles back the exact "awaiting delivery" precision the deviation explicitly drops; changed to plain "Cards in Lots" (`admin.setsLots.stats.cardsAwaitingDelivery.title`). F-2's "At-Distributor Cards" title was already honest, no change.
- [x] Theming (#theming): grepped every Part-2 file for hardcoded hex/rgb/raw Tailwind palette classes — zero hits; semantic tokens only.

**Validation**
- [x] No inline strings introduced. / [x] `tsc` clean; existing Vitest green. / [x] No behavior change (one honest-copy string fix only); pre-existing out-of-scope issues left untouched (scope discipline). / [x] Committed on green.

**Risks**
- Scope creep — resist "fixing" adjacent pre-existing issues (e.g. the flagged `LoginPage` redirect); flag, don't touch.

---

## PHASE 5 — TESTS

### Sprint 6: Unit Tests — Orders, Sets & Lots, Cards   — Status: ⬜ Pending

**Goals**
- One `.test.tsx` per page under `/tests/unit/pages/{orders,sets-lots,cards}/`, hooks + `useTranslation` mocked (no MSW), asserting states, action-gating, forms, the wizard, and URL pre-filters. All green; both tsconfigs clean.

**Tasks**
- [ ] `orders/OrdersPage.test.tsx` (#testing): 4 stat skeletons on load; empty vs no-match + Clear; `NotFoundState`+retry ⇒ `refetch`; **action gating** (Delete only on `PENDING_DELIVERY`; DELIVERED/RETURNED only on `IN_DELIVERY`); `MarkDeliveredModal` defaults `deliveredCount` to `cardsCount`, confirm ⇒ `useTransitionOrder.mutate({id, command})`; wizard step gating (invalid Step-1 blocks Next; empty required fields don't submit; Step-2 empty-lots `<Link>`); valid full wizard ⇒ `useCreateOrder.mutate(command)`.
- [ ] `sets-lots/SetsLotsPage.test.tsx` (#testing): stats render (incl. `countOf` treating a missing stat as 0); both tables' empty/no-match; set gating (Mark Printed only `PENDING_PRINTING`; cascade Delete confirm ⇒ `useDeleteSet.mutate(id)`); lot Delete only `PENDING`; create-set Zod ⇒ `mutate`; create-lot Select-All toggles `cardIds`, empty selection blocks submit, valid ⇒ `useCreateLot.mutate({subscriptionPlanId,cardIds})`; "View Cards" `<Link>` targets carry `?set=`/`?lot=`.
- [ ] `cards/CardsPage.test.tsx` (#testing): stats (Flagged = disabled+revoked; missing stat ⇒ 0); empty vs no-match; **pre-filter seeding** (`?set=X` ⇒ `setNumber:X` in query + a clearable chip); gating (Revoke only `ACTIVATION_FAILED`+not-disabled; Enable only when disabled) + confirm ⇒ correct `mutate(id)`; flag chips render for `isDisabled`/`isRevoked`; detail modal lists only timeline rows whose timestamp exists.
- [ ] Reuse Part-1 shared test infra (#testing): `tests/fixtures/wrappers/{mockTranslation,renderWithRouter,setup}` (RTL `cleanup()` + Radix `Select` polyfills already in `setup.ts`); use `getByRole('option', { name })` for Radix `SelectItem`; scope ambiguous mocked-key text with `within(dialog)`/`getAllBy…[0]`.

**Validation**
- [ ] `vitest run` green across success/loading/error branches. / [ ] No test files under `/src`; files are `.test.tsx`. / [ ] Both `tsconfig.json` + `tsconfig.test.json` clean. / [ ] Committed on green.

**Risks**
- Ambiguous mocked-translation-key matches (mitigate with scoping, per Part-1).
- Radix `Select`/`Dialog` under JSDOM — the shared `setup.ts` polyfills already cover it; folding sub-component specs into the owning-page file keeps token cost down (Part-1 discipline).

---

## Net-new artifact recap (from plan §G, sprint-mapped)

| Sprint | Artifacts |
|--------|-----------|
| S1 | `create-order`/`mark-delivered`/`create-set`/`create-lot` `.schema.ts`; i18n namespaces; 3 lazy routes + stubs; `SetStatusBadge`/`LotStatusBadge` |
| S2 | all `components/` primitives for `OrdersPage`, `SetsLotsPage`, `CardsPage` (dumb) |
| S3 | live `pages/admin/distributors/OrdersPage.tsx` (+ wizard/drawer/transitions wired) |
| S4 | live `pages/admin/activations/{SetsLotsPage,CardsPage}.tsx` (+ modals/actions wired) |
| S5 | a11y/responsive/memo/theming polish across all three |
| S6 | `/tests/unit/pages/{orders,sets-lots,cards}/*.test.tsx` |

**Reused (build nothing):** every domain + shared hook (plan §B1), the entire §B7 shared-component set, the Part-1 Admin Shell, `useDebouncedValue`, `lib/query-keys.ts`, `OrderStatusBadge`/`CardStatusBadge`, and the `tests/fixtures/wrappers` infra.
