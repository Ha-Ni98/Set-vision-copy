# Admin Panel · Part 2 — Page Assembly Plan (SV-PAGE-011 → 013)

> **Stage 03 · Sub-03 · Phase 01 (Planning).** No code — audit + plan only.
> **Pages:** Orders management · Sets & Lots management · Cards management
> **Routes:** `/admin/distributors/orders` · `/admin/activations/sets-lots` · `/admin/activations/cards`
> **Inputs:** [SV-PAGE-011-013_admin_part2_spec.md](../../../../Stage-00-Conception/Pages-Requirements/SV-PAGE-011-013_admin_part2_spec.md) · [front-end-rules.md](../../../front-end-rules.md) · [front-end-test-rules.md](../../../front-end-test-rules.md) · `@my-app/contract` · existing `Apps/web/src/hooks` + `Apps/api`
> **Governance:** rules = HOW · phase file = WHAT/WHEN · contract = WHICH. HOW conflicts resolved toward the rules and noted in §B; genuine WHICH conflicts escalated. Part 1's shell, conventions, and standing decisions apply here **unchanged** (spec preamble).

---

## A. Session decisions (applied under standing governance — nothing escalated)

The spec preamble defers all shell/convention/state-handling questions to Part 1, and Part 1's four session decisions still govern. No new question needed escalation; the judgment calls made here, all covered by existing governance:

| # | Point | Decision | Basis |
|---|-------|----------|-------|
| 1 | Output granularity | **One combined set-level `plan.md`** for the three pages, folder `admin-part-2`. | Mirrors Part 1 decision #1. |
| 2 | Stat-card gaps vs contract | **Plan against what exists today** — assemble from `useOrdersSummary`/`useInventorySummary`, accept reduced fidelity where the summary DTO can't express a card, log every deviation (§F). | Part 1 decision #2, carried by spec preamble. |
| 3 | Multi-select filters the contract doesn't support (Cards `state`, `flag`) | **Single-select, resolved toward the contract** (rules = HOW, contract = WHICH); logged (§F-4). | Rules §2 / governance. |
| 4 | Detail views (Order drawer, Card modal) | **No new routes** — `useOrder(id)` / `useCard(id)` feed in-page drawer/modal (spec: "no separate route"). | Spec + scope confinement. |
| 5 | Create-Order multi-step wizard | **Single RHF form + local `step` state**, per-step `trigger()` gating; one `CreateOrderCommand` submitted at Confirm. | Rules §2 (RHF+Zod), no wizard precedent to contradict. |

**Audit headline:** **all three pages map cleanly onto existing Sub-02 hooks + contract DTOs — zero missing hooks, zero missing routes on the backend** (verified `Apps/api/src/modules/{order,set,lot,card,statistics}`). The only shortfalls are **stat-card fidelity gaps** inside `InventorySummaryDTO` (§E/§F) and **notation reconciliations** (§B). No new libraries required.

---

## B. Cross-cutting resolutions (apply to every page)

### B1. Hook-name reconciliation (spec name → real export) — no new hooks
| Spec calls it | Real export (file) | Note |
|---|---|---|
| `useOrderDetail` | `useOrder(id)` — `useOrders.ts` | `enabled: !!id`; returns `OrderDetailDTO` (adds per-lot breakdown) |
| `useCardDetail` | `useCard(id)` — `useCards.ts` | `enabled: !!id`; returns `CardDetailDTO` (adds `distributionTimeline`) |
| `useAvailableLotsForOrder` | `useAvailableLotsForOrder({ subscriptionPlanId? })` — `useLots.ts` | returns full `LotDTO[]` (has label, `nbOfCards`, `lotStat`) |
| `useAvailableCardsForLot` | `useAvailableCardsForLot(subscriptionPlanId)` — `useCards.ts` | id-arg gate (`enabled: !!id`); returns `AvailableCardDTO[]` `{ id, key, subscriptionLabel }` |
| `useDeliveryCompanies` (active) | `useDeliveryCompanies({ active: true })` | `DeliveryCompanyDTO` `{ id, name, registeredName, isActive }` |
| `useSubscriptionPlans` (active) | `useSubscriptionPlans({ active: true })` | `SubscriptionPlanDTO` `{ id, label, isActive, … }` |
| `useDistributors` (Step-1 search) | `useDistributors({ search, limit: 100 })` | no server `enabled` filter (§F-5) → client-filter `isEnabled` |
| all writes | `useCreateOrder/useTransitionOrder/useDeleteOrder`, `useCreateSet/useTransitionSet/useDeleteSet`, `useCreateLot/useDeleteLot`, `useDeleteCard/useDisableCard/useEnableCard/useRevokeCard` | every mutation self-invalidates its read families in-hook (verified) |

### B2. Field & pagination notation (spec → contract) — resolved toward the contract
The spec is a conception-stage document: `snake_case`, `{ records[], total, page, total_pages }`, `per_page`, `receiver_*`. The **contract is the source of truth** and is already what the services/hooks return:
- **Pagination** = `paginated()` → `{ items: T[], meta: { page, limit, total, totalPages } }` (not `records`/`total_pages`); page size param is **`limit`** (max 100), not `per_page`.
- **Fields are camelCase**; notable renames the execute phase must use: `receiver_name → receivedName`, `receiver_phone → receivedPhone`, `delivered_count → cardsDeliveredCount` (DTO) / `deliveredCount` (transition command), `cards_count → cardsCount`, `lot_numbers → lotNumbers`, `number_of_keys → numberOfKeys`, `number_of_cards → nbOfCards`, `delivered_cards → deliveredCardsCount`.
- **Receiver geography = one pair.** `CreateOrderCommand` carries a single `wilayaId`/`communeId` (the delivery destination), not a separate `receiver_wilaya_id`; Step 3 pre-fills them from the chosen distributor and lets them be overridden.
- **Endpoints:** contract routes are flat (`ORDER_ROUTES`, `SET_ROUTES`, `LOT_ROUTES`, `CARD_ROUTES`); the `/admin` prefix lives in `VITE_API_URL`, never hardcoded (rules §3A). `useOrders`/`useCards` are filtered by `distributorId`, not nested paths.

### B3. Header stat sums come from summary hooks, not the list response
As in Part 1, list endpoints return **records only**; header cards come from dedicated summary hooks that each load/skeleton/error independently:
- Orders header → **`useOrdersSummary()`** → `{ totalOrders:{all,month,week}, byState[], pendingDelivery, inDelivery, totalRevenue }` — maps 1:1 to the four spec cards. ✓
- Sets & Lots header **and** Cards header → **`useInventorySummary()`** → `{ sets:{stat,count}[], lots:{stat,count}[], cards:{stat,count}[], cardFlags:{disabled,revoked} }`. Zero-count stats are **omitted** from the arrays — a shared `countOf(arr, stat)` helper (`useMemo`) must treat "missing" as **0** (DTO comment). Some spec cards are not fully expressible from this shape (§E/§F).

### B4. Forms: co-located schemas refine loose contract commands
Contract commands are wire-loose. Each form defines a local `[name].schema.ts` whose `parse()` output is **assignable to the contract Command** (compile-time `AssertAssignable` guard, per Part 1), adding UX constraints:
- **`create-order.schema.ts` → `CreateOrderCommand`** (the wizard's single schema; step slices validated via `trigger()`).
- **`mark-delivered.schema.ts` → `TransitionOrderCommand`** (`{ to: DELIVERED, deliveredCount }`; `deliveredCount` int, `0…order.cardsCount`, default = `cardsCount`).
- **`create-set.schema.ts` → `CreateSetCommand`** (`numberOfKeys` int ≥1 default 100; `subscriptionPlanId` uuid).
- **`create-lot.schema.ts` → `CreateLotCommand`** (`subscriptionPlanId` uuid; `cardIds` nonempty — the checkbox multi-select feeds a controlled field).
- **Cards page has no create/edit forms** — Delete/Disable/Enable/Revoke are parameterless id calls behind confirm dialogs.
- **`z.coerce.number()` fields** (`numberOfKeys`, prices, `deliveredCount`) use the Part-1 `useForm<Input, unknown, Output>` split (`z.input` vs `z.infer`).

### B5. Mutations, toasts, dialogs, action-gating (uniform behavior)
- Global error feedback already wired (`mutationCache.onError → toast`); **pages add no per-mutation toasts.** Failed write ⇒ auto toast, modal/wizard **stays open, values preserved** (only close/reset `onSuccess`). A **state-guard rejection** (e.g. delete a non-`PENDING` lot) surfaces as that same toast — the message is the backend's.
- Every **destructive / state-changing** action (set/lot/order/card transitions, deletes, disable/enable/revoke) uses shadcn `AlertDialog`; cascade actions spell out the consequence ("deletes the set and all its cards", "cards return to PRINTED").
- **Action enabling is data-driven from the spec's permission table**, keyed off the row's state (+ card flags): a disallowed action is **hidden** (spec: "Disabled actions are hidden"). Each page §D lists its gating map. Invalidation is owned by the hooks (the cross-domain fan-outs are already implemented — order transition sweeps orders+lots+cards+distributors; set/lot mutations sweep their cards; §D references them).

### B6. i18n, theme, layout preservation
- **No inline JSX strings** — all copy via `useTranslation()`, added to `src/config/translations.json` (flat key → `{ en, fr, ar:'' }`; `ar` reserved-empty, EN/FR only). New namespaces: `admin.orders.*`, `admin.setsLots.*`, `admin.cards.*`, plus enum labels `enums.setStat.*`, `enums.lotStat.*`, `enums.deliveryType.*`, `enums.cardFlag.*`, and shared `common.actions.*` additions (sendToPrint, markPrinted, markInDelivery, markDelivered, markReturned, disable, enable, revoke, viewCards, selectAll, deselectAll, next, back, confirm). `enums.orderStat.*` / `enums.cardStat.*` already exist (Part 1 badges).
- Loading/error/empty are **localized inside the content area**; `AdminLayout` never unmounts (rules §4).
- Admin is **desktop-first**; wide tables horizontal-scroll (`DataTable` already renders a stacked mobile variant via `renderMobileRow`, and its desktop wrapper was fixed to `overflow-x-auto` in Part 1 Sprint 6).

### B7. Shared-component reuse map (build almost nothing new)
| Need | Reuse |
|---|---|
| Stat card + loader | `StatCard` + `StatCardSkeleton` |
| Data table (desktop + mobile) | `DataTable` (page owns search/pagination/filter state) |
| Table / chart loading | `TableSkeleton` |
| Empty region (+ CTA / `<Link>`) | `EmptyState` (CTA in `decoration` slot) |
| Section error + retry / detail 404 | `NotFoundState` (`action` slot = Retry / back `<Link>`) |
| Status badges | `OrderStatusBadge`, `CardStatusBadge` **(exist)**; `SetStatusBadge`, `LotStatusBadge` **(net-new, §B9)** |
| Monospace key copy | `CopyButton` |
| Page title + actions | `PageHeader` |
| Route-split fallback | `PageLoader` + `React.lazy`/`Suspense` |
| Pagination | `SimplePagination` |
| Modals / wizard / confirms / selects / forms | `ui/dialog`, `ui/alert-dialog`, `ui/select`, `ui/checkbox`, `ui/form`, `ui/input`, `ui/label` |
| Debounced search input | `useDebouncedValue` (Part 1) |

### B8. Optimization posture (rules §5)
- **`React.lazy()` + `<Suspense fallback={<PageLoader/>}>`** on all three route components.
- `useMemo` where it earns it: react-table `ColumnDef[]` arrays; the `countOf(summaryArray, stat)` reductions (B3); the Create-Order live selected-card-count and total; the derived per-row action-permission map.
- **Debounce** each list's search input (~300 ms, `useDebouncedValue`) before it becomes the `search` param.

### B9. Net-new shared additions (small, justified)
- **`SetStatusBadge` / `LotStatusBadge`** added to `components/shared/StatusBadge.tsx` beside the existing enum badges (same `StatusPill` engine, so tone language can't drift). Tones: Set `NOT_PRINTED`=neutral, `PENDING_PRINTING`=warning, `PRINTED`=success; Lot `PENDING`=warning, `IN_DELIVERY`=warning, `DELIVERED`=success, `RETURNED`=destructive.
- **Card flag chips** — a small page-local `CardFlagChips` rendering `StatusPill` for `isDisabled`→"Disabled" (neutral) and `isRevoked`→"Revoked" (destructive); nothing when neither.
- **Delivery type** renders as a **plain translated label** (`enums.deliveryType.*`), not a colored badge (spec assigns it no color).

---

## C. Routing & shell integration (delta only — the shell already exists)

The Part-1 Admin Shell (`AdminLayout/Sidebar/Header/Guard`, realtime, nav) is built and unchanged. This part only:
1. **Registers three lazy routes** under the existing `AdminGuard` subtree in `App.tsx`:
   `/admin/distributors/orders` · `/admin/activations/sets-lots` · `/admin/activations/cards`.
   - **Routing precedence note:** `/admin/distributors/orders` is a static sibling of the existing `/admin/distributors/:id`. React-Router ranks static segments above dynamic params, so `orders` resolves to the Orders page (no `:id` collision) — but the route must be **declared** so the ranking applies.
2. **Activates three nav `<Link>`s that already exist** in `config/nav-links.ts` (`admin.shell.nav.orders`, `.setsAndLots`, `.cards`) — they currently point at these paths as scope-confined links; no nav edit needed beyond them now resolving.
3. Adds the §B9 shared badges. No new layout, guard, provider, or socket work.

---

## D. Page plans

### D1 — Orders Management · `/admin/distributors/orders` (SV-PAGE-011)
Accepts `?distributor={id}` to arrive pre-filtered.

**1. Hook & Data Mapping**
| Region | Hook | DTO / notes |
|---|---|---|
| 4 stat cards | `useOrdersSummary()` | Total Orders (`totalOrders.all` / `.month` / `.week`) · Pending Delivery (`pendingDelivery`) · In Delivery (`inDelivery`) · Total Revenue (`totalRevenue`) — **full fidelity** ✓ |
| Table | `useOrders({ page, limit, search, distributorId, wilayaId, deliveryCompanyId, state, dateFrom, dateTo })` | `PaginatedOrders` → `OrderDTO` (every spec column present, see B2) |
| Filter: wilaya | `useWilayas()` | resolved names in-row already; select sends `wilayaId` |
| Filter: delivery company | `useDeliveryCompanies({ active: true })` | `deliveryCompanyId` |
| Detail drawer | `useOrder(id)` | `OrderDetailDTO` (adds `lots[]` per-lot breakdown, `cardsDeliveredCount`) |
| Wizard Step 1 | `useDistributors({ search, limit: 100 })` | client-filter `isEnabled` (§F-5); pre-fills Step 3 |
| Wizard Step 2 | `useAvailableLotsForOrder({ subscriptionPlanId? })` + `useSubscriptionPlans({ active:true })` | PENDING+RETURNED lots; plan filter optional (cross-plan selection allowed) |
| Wizard Step 3 | `useWilayas()` + `useCommunes(receiverWilayaId)` | commune disabled until wilaya |
| Wizard Step 4 | `useDeliveryCompanies({ active: true })` | delivery company + type |
| Writes | `useCreateOrder` · `useTransitionOrder` · `useDeleteOrder` | transition fan-out (orders+lots+cards+distributors) is in-hook |

**2. UI Components** — *New* `pages/admin/distributors/OrdersPage.tsx` + `components/`: `OrdersStatsRow`, `OrdersFilters`, `OrdersTable`, `OrderDetailDrawer`, `CreateOrderModal` (stepper host) with step panels `StepSelectDistributor` / `StepSelectLots` / `StepReceiverInfo` / `StepDeliveryConfig` / `StepConfirmSummary`, `MarkDeliveredModal`, `OrderActionsMenu`. *Shared:* `StatCard(Skeleton)`, `DataTable`, `TableSkeleton`, `EmptyState`, `NotFoundState`, `OrderStatusBadge`, `SimplePagination`, `PageHeader`, `ui/dialog`, `ui/alert-dialog`, `ui/select`.

**3. Granular States**
- Loading: 4× `StatCardSkeleton`; table `TableSkeleton`; wizard Step-2 lot list shimmer; commune select disabled until wilaya.
- Empty: no orders → `EmptyState` "No orders yet. Create your first order." + Create CTA; no filter match → "No orders match your filters." + Clear; **wizard Step 2 with no eligible lots** → `EmptyState` "No PENDING or RETURNED lots available — create a lot first." with a `<Link to="/admin/activations/sets-lots">`.
- Error: table → `NotFoundState`+Retry (`refetch`); create/transition/delete fail → toast, wizard values preserved; a transition rejected by the backend state guard → its toast (B5).

**4. Forms & Mutations**
- `create-order.schema.ts` → `CreateOrderCommand`: `distributorId` uuid; `lotIds` nonempty uuid[]; `receivedName` 3–100; `receivedPhone` Algerian `^(?:\+213|0)(5|6|7)\d{8}$`; `wilayaId`/`communeId` uuid; `deliveryCompanyId` uuid; `deliveryType` enum; `orderPrice` >0 `.01`; `deliverPrice` ≥0 `.01`. Stepper validates slices via `form.trigger([...stepFields])`; Confirm ⇒ `useCreateOrder.mutate(command)`.
- `mark-delivered.schema.ts` → `TransitionOrderCommand {to:DELIVERED, deliveredCount}` (default = order `cardsCount`). Mark IN_DELIVERY / RETURNED / Delete = parameterless confirm → `useTransitionOrder`/`useDeleteOrder`.

**5. Action gating** (spec permission table): Delete → only `PENDING_DELIVERY`; Mark IN_DELIVERY → `PENDING_DELIVERY`; Mark DELIVERED / Mark RETURNED → `IN_DELIVERY`; View → always. Others hidden.

**6. Optimization** — lazy route; memoized `ColumnDef[]`; debounced search; `useMemo` live card-count total in Step 2; `distributorId` seeded once from `?distributor=`.

**7. Unit-Test Strategy** — `/tests/unit/pages/orders/OrdersPage.test.tsx` (fold sub-components in, per Part-1 token discipline): mock `useOrders`, `useOrdersSummary`, `useOrder`, `useAvailableLotsForOrder`, `useDistributors`, `useDeliveryCompanies`, `useWilayas`, `useCommunes`, `useSubscriptionPlans`, the 3 write hooks + `useTranslation`. Assert: 4 stat skeletons; empty vs no-match+Clear; `NotFoundState`+retry ⇒ `refetch`; **action gating** (Delete only shown on `PENDING_DELIVERY`); Mark-DELIVERED modal defaults `deliveredCount` to `cardsCount` and confirm ⇒ `mutate({id, command})`; wizard step gating (invalid Step 1 blocks Next; empty required fields don't submit; Step-2 empty-lots `<Link>`); valid full wizard ⇒ `useCreateOrder.mutate(command)`.

**8. Acceptance** — searchable/filterable/paginated table with resolved names + state badges; 4 header stats at full fidelity; 4-step wizard creates an order (lots→IN_DELIVERY via invalidation); state-gated actions; detail drawer with per-lot breakdown + `<Link>` to distributor; layout preserved; translated.

---

### D2 — Sets & Lots Management · `/admin/activations/sets-lots` (SV-PAGE-012)
One page, **two independent tables + two create modals**.

**1. Hook & Data Mapping**
| Region | Hook | Notes |
|---|---|---|
| 4 stat cards | `useInventorySummary()` | Total Sets (Σ`sets[].count` + breakdown) · Total Lots (Σ`lots[].count` + breakdown) · Cards in Sets/in Lots (`countOf(cards, IN_SET)` / `IN_LOT`) · **Cards Awaiting Delivery** — *reduced fidelity* (§F-1) |
| Sets table | `useSets({ page, limit, search, subscriptionPlanId, state })` | `PaginatedSets` → `SetDTO` (setNumber, numberOfKeys, subscriptionLabel, setStat, createdAt, printedAt) |
| Lots table | `useLots({ page, limit, search, subscriptionPlanId, state })` | `PaginatedLots` → `LotDTO` (lotNumber, subscriptionLabel, nbOfCards, deliveredCardsCount, lotStat, createdAt, deliveryDate) |
| Both filters: plan | `useSubscriptionPlans({ active: true })` | drives `subscriptionPlanId` |
| Lot modal candidate list | `useAvailableCardsForLot(subscriptionPlanId)` | `AvailableCardDTO[]`; gated on chosen plan |
| Writes | `useCreateSet` · `useTransitionSet` · `useDeleteSet` · `useCreateLot` · `useDeleteLot` | set/lot mutations sweep their cards in-hook |

**2. UI Components** — *New* `pages/admin/activations/SetsLotsPage.tsx` + `components/`: `SetsLotsStatsRow`, `SetsTable`, `LotsTable`, `SetsFilters`, `LotsFilters`, `CreateSetModal`, `CreateLotModal` (plan select → candidate checkbox list + Select/Deselect All + live count), `SetActionsMenu`, `LotActionsMenu`. *Shared:* `StatCard(Skeleton)`, `DataTable`, `TableSkeleton`, `EmptyState`, `NotFoundState`, `SetStatusBadge`/`LotStatusBadge` (§B9), `SimplePagination`, `PageHeader`, `ui/dialog`, `ui/alert-dialog`, `ui/checkbox`, `ui/select`.

**3. Granular States**
- Loading: stats skeleton; **both** tables `TableSkeleton`; lot-modal candidate list shimmer.
- Empty: no sets → "No sets yet. Create your first set."; no lots → "No lots yet."; lot modal, no PRINTED cards for the plan → "No printed cards available for this plan."; filter no-match → "Nothing matches your filters." + Clear.
- Error: each table → `NotFoundState`+Retry; create/transition/delete fail → toast; a delete blocked by state guard → its toast (B5).

**4. Forms & Mutations**
- `create-set.schema.ts` → `CreateSetCommand` (`numberOfKeys` int ≥1 default 100; `subscriptionPlanId` uuid). Confirm ⇒ `useCreateSet`.
- `create-lot.schema.ts` → `CreateLotCommand` (`subscriptionPlanId` uuid; `cardIds` nonempty). Checkbox list is a controlled `cardIds` field; Select/Deselect All + live count are local. Confirm ⇒ `useCreateLot`.
- Set transitions (Send to Print → `PENDING_PRINTING`; Mark Printed → `PRINTED`) & deletes → confirm → `useTransitionSet`/`useDeleteSet`/`useDeleteLot`.

**5. Action gating**: Set — Send to Print (`NOT_PRINTED`), Mark Printed (`PENDING_PRINTING`), Delete (`NOT_PRINTED`|`PENDING_PRINTING`, cascade warning), View Cards (always → `<Link ?set=setNumber>`). Lot — Delete (`PENDING` only, "cards return to PRINTED"), View Cards (always → `<Link ?lot=lotNumber>`).

**6. Optimization** — lazy route; memoized `ColumnDef[]` ×2; two debounced searches; `useMemo` `countOf` reductions + live lot selected-count; `useAvailableCardsForLot` gated by plan id.

**7. Unit-Test Strategy** — `/tests/unit/pages/sets-lots/SetsLotsPage.test.tsx`: mock `useSets`, `useLots`, `useInventorySummary`, `useAvailableCardsForLot`, `useSubscriptionPlans`, the 5 write hooks + `useTranslation`. Assert: stats skeleton→values (incl. `countOf` treats missing stat as 0); both tables' empty/no-match; set action gating (Mark Printed only on `PENDING_PRINTING`; cascade-delete confirm ⇒ `useDeleteSet.mutate(id)`); lot Delete only on `PENDING`; Create-Set Zod (numberOfKeys/plan) ⇒ `mutate`; Create-Lot select-all toggles `cardIds`, empty selection blocks submit, valid ⇒ `useCreateLot.mutate({subscriptionPlanId,cardIds})`; "View Cards" `<Link>` targets carry `?set=`/`?lot=`.

**8. Acceptance** — two filterable/paginated tables with state badges + breakdown stats; create-set generates cards (via invalidation); create-lot moves PRINTED→IN_LOT; state-gated set/lot actions with cascade warnings; "View Cards" links; layout preserved; translated.

---

### D3 — Cards Management · `/admin/activations/cards` (SV-PAGE-013)
Accepts `?set=`, `?lot=`, `?distributor=`, `?key=` to arrive pre-filtered.

**1. Hook & Data Mapping**
| Region | Hook | Notes |
|---|---|---|
| 4 stat cards | `useInventorySummary()` | Total Cards (Σ`cards[].count`) · Cards by State (`cards[]` breakdown) · **Active Cards** — *reduced fidelity* (§F-2) · Flagged (`cardFlags.disabled` + `.revoked`) ✓ |
| Table | `useCards({ page, limit, search, state, setNumber, lotNumber, distributorId, subscriptionPlanId, flag })` | `PaginatedCards` → `CardDTO` (key, subscriptionLabel, setNumber, lotNumber?, distributorName?, cardStat, isActive, isDisabled, isRevoked, createdAt) |
| Filter: plan | `useSubscriptionPlans({ active: true })` | `subscriptionPlanId` |
| Filter: distributor | `useDistributors({ search, limit: 100 })` | `distributorId` |
| Detail modal | `useCard(id)` | `CardDetailDTO.distributionTimeline: {stat,at}[]` (derived; rows appear only when timestamp exists) |
| Writes | `useDeleteCard` · `useDisableCard` · `useEnableCard` · `useRevokeCard` | each sweeps `qk.cards.all()` in-hook |

**2. UI Components** — *New* `pages/admin/activations/CardsPage.tsx` + `components/`: `CardsStatsRow`, `CardsFilters` (key search + state + set/lot/distributor/plan/flag selects), `CardsTable`, `CardFlagChips` (§B9), `CardDetailModal` (timeline + "View Activation History" `<Link>`), `CardActionsMenu`. *Shared:* `StatCard(Skeleton)`, `DataTable`, `TableSkeleton`, `EmptyState`, `NotFoundState`, `CardStatusBadge`, `CopyButton` (key), `SimplePagination`, `PageHeader`, `ui/dialog`, `ui/alert-dialog`, `ui/select`.

**3. Granular States**
- Loading: stats skeleton; table `TableSkeleton`; detail-modal timeline shimmer.
- Empty: no cards → `EmptyState` "No cards yet — create a set to generate cards." + `<Link to="/admin/activations/sets-lots">`; filter no-match → "No cards match your filters." + Clear; **invalid pre-filter** (e.g. unknown `?set=`) → the same empty result with the active filter shown and clearable.
- Error: table → `NotFoundState`+Retry; action failures → toast; a state-guarded action rejected → its toast (B5).

**4. Forms & Mutations** — no forms. Each action is a confirm `AlertDialog` → parameterless id mutation: Delete → `useDeleteCard`; Disable → `useDisableCard`; Enable → `useEnableCard`; Revoke → `useRevokeCard`.

**5. Action gating** (state + flags): Delete (`IN_SET`|`PRINTED`); Disable (`IN_LOT`|`AT_DISTRIBUTOR`, not disabled); Enable (currently disabled); Revoke (`ACTIVATION_FAILED`, not disabled); View (always). Others hidden.

**6. Optimization** — lazy route; memoized `ColumnDef[]`; debounced key search; `useMemo` `countOf` reductions; the four pre-filters (`?set/?lot/?distributor/?key`) seed the query once from `useSearchParams`.

**7. Reconciliation** — spec asks for **multi-select** `state` and a `flag` filter; the contract's `GetCardsQuery.state`/`flag` are **single** enums. Planned **single-select** for both (§F-4). Card flags render as `CardFlagChips`; distributor cell renders only when `distributorName` is non-null (`AT_DISTRIBUTOR`+).

**8. Unit-Test Strategy** — `/tests/unit/pages/cards/CardsPage.test.tsx`: mock `useCards`, `useInventorySummary`, `useCard`, `useSubscriptionPlans`, `useDistributors`, the 4 write hooks + `useTranslation`. Assert: stats skeleton→values (Flagged = disabled+revoked; `countOf` missing→0); empty vs no-match+Clear; **pre-filter seeding** (`?set=X` puts `setNumber:X` in the query and shows a clearable chip); action gating per state/flag (Revoke only on `ACTIVATION_FAILED`+not-disabled; Enable only when disabled) and confirm ⇒ correct `mutate(id)`; flag chips render for `isDisabled`/`isRevoked`; detail modal lists only timeline rows present.

**9. Acceptance** — searchable/filterable/paginated cards table with state badge + flag chips + conditional distributor; 4 header stats (2 reduced-fidelity, logged); state/flag-gated confirmed actions; detail modal derived timeline + history `<Link>`; pre-filters honored & clearable; layout preserved; translated.

---

## E. Missing hooks / contract DTOs to resolve first (Expected Output)

**No hook, route, or DTO blocks build** — all reads/writes exist and the backend implements every endpoint. The only shortfalls are **two stat-card fidelity gaps** where `InventorySummaryDTO` can't express the spec's exact metric. Per rules §2 these are **upstream (Stage 01) enrichments, never local patches**; handled now via the §F reductions.

| # | Gap | Where | Type | Current handling | Recommended upstream fix | Severity |
|---|-----|-------|------|------------------|--------------------------|----------|
| F-1 | "Cards Awaiting Delivery = `IN_LOT` on an `IN_DELIVERY` order" isn't isolable — `InventorySummary.cards` counts `IN_LOT` regardless of the owning lot's/order's state | D2 stats card 4 | contract DTO | render total `IN_LOT` count, **label it plainly** (drop the "on an IN_DELIVERY order" precision) | add `cardsAwaitingDelivery` to `InventorySummaryDTO` (server joins card→lot→order) | Low |
| F-2 | "Active Cards = `AT_DISTRIBUTOR` + `is_active`" — the summary is keyed by `CardStat` only; the `is_active` refinement (a disabled `AT_DISTRIBUTOR` card is inactive) isn't separable | D3 stats card 3 | contract DTO | render the `AT_DISTRIBUTOR` count as "Active/at-distributor cards", **note the `is_active` nuance isn't applied** | add `activeCards` (is_active-aware) to `InventorySummaryDTO` | Low |
| F-3 | Orders detail is a drawer needing `OrderDetailDTO` — **fully present** (no gap); listed only to confirm the audit checked it | D1 drawer | — | none needed | — | Resolved |
| F-4 | Cards filter: spec wants **multi-select** `state` + a `flag` facet; contract `GetCardsQuery.state`/`flag` are **single** enums | D3 filters | contract query | **single-select** both, toward the contract | widen to `state: CardStat[]` (CSV/`z.array`) if multi-select is required | Low |
| F-5 | Order wizard Step 1 wants "**enabled** distributors"; `GetDistributorsQuery` has no `enabled`/`isEnabled` filter | D1 wizard | contract query | fetch by `search` + **client-filter `isEnabled`** on the page | add `isEnabled?: boolean` to `GetDistributorsQuery` | Low |

---

## F. Deviations ledger (per decision #2 — "plan against what exists")

Each is a knowing reduction vs SV-PAGE-011→013, traceable to §E:
- D2 stat "Cards Awaiting Delivery": shows **total `IN_LOT`**, not the `IN_DELIVERY`-order subset (F-1).
- D3 stat "Active Cards": shows the **`AT_DISTRIBUTOR` count**, without the `is_active` refinement (F-2).
- D3 filters: **single-select** `state`, single `flag` (F-4).
- D1 wizard Step 1: enabled-distributor filtering is **client-side** on the fetched page, not server-side (F-5).
- Notation: pages consume camelCase `{items,meta}`/`limit`/`receivedName` (contract), not the spec's snake_case `{records}`/`per_page`/`receiver_*` (B2) — a reconciliation, not a functional reduction.

Everything else in SV-PAGE-011→013 is planned at **full fidelity** against existing hooks + DTOs.

---

## G. Net-new artifact inventory (for the sprint/execute phase)

- **Routes:** three lazy routes in `App.tsx` under `AdminGuard` (§C). Nav links already present.
- **Pages:** `pages/admin/distributors/OrdersPage.tsx`; `pages/admin/activations/{SetsLotsPage,CardsPage}.tsx` (+ each page's `components/` per §D).
- **Schemas (co-located):** `create-order`, `mark-delivered`, `create-set`, `create-lot` `.schema.ts` (each with an `AssertAssignable` guard to its contract Command).
- **Shared additions:** `SetStatusBadge` + `LotStatusBadge` in `components/shared/StatusBadge.tsx` (§B9).
- **i18n:** `admin.orders.*`, `admin.setsLots.*`, `admin.cards.*`, `enums.setStat.*`, `enums.lotStat.*`, `enums.deliveryType.*`, `enums.cardFlag.*`, and the `common.actions.*` verbs (§B6) — en/fr real copy, ar `""`.
- **Tests:** `/tests/unit/pages/{orders,sets-lots,cards}/*.test.tsx` (hooks + `useTranslation` mocked; `.test.tsx` per the tooling reconciliation carried from Part 1).
- **Reused (build nothing):** every hook in §B1/§D, the entire §B7 shared set, the Part-1 Admin Shell + realtime, `useDebouncedValue`, `lib/query-keys.ts`, `OrderStatusBadge`/`CardStatusBadge`.

---

*End of Part 2 plan. Part 3 (Activations, Activation Detail, Statistics, Settings, Logs) will complete the admin panel.*
