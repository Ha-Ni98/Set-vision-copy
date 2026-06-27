# SV-PAGE-011→013 — Admin Panel · Part 2 of 3 (Orders · Sets & Lots · Cards)

> **App:** Setvision Web Application
> **Pages:** Orders management, Sets & Lots management, Cards management
> **Routes:** `/admin/distributors/orders`, `/admin/activations/sets-lots`, `/admin/activations/cards`
> **Auth:** JWT + role check (admin only)
> **Target Device:** Desktop-first (1280px+). Tables may horizontal-scroll on small screens.
> **Languages:** EN + FR · **Dark/Light mode:** Yes
> **Source of truth:** new DB schema + scenarios. Shell, conventions (resolved DTOs, hooks, `<Link>`-only navigation, loading/empty/error), and the activation-lifecycle reference are defined in **Part 1** and apply here unchanged.

---

## Distribution State Machine (read first — drives all three pages)

### Card lifecycle (single combined `Card Stat` + flags)

```
IN_SET ──set printed──▶ PRINTED ──added to lot──▶ IN_LOT ──order delivered──▶ AT_DISTRIBUTOR
   ▲                       ▲                          │                            │ client uses a valid key
   │ (set still editable)  │ lot deleted              │ lot returned               ▼
   └───────────────────────┘ (cards → PRINTED)        │ (lot → RETURNED,    ACTIVATION_PROGRESS
                                                       │  cards stay IN_LOT)   │              │
                                                       └───────────────────┐   │ activated    │ admin cancels
                                                                           (cards stay IN_LOT) ▼              ▼
                                                                               ACTIVATED   ACTIVATION_FAILED
                                                                                                 │ revoke
                                                                                                 ▼
                                                                                   AT_DISTRIBUTOR (is_revoked = true)
```

- There is **no separate distribution-vs-activation state** and **no card-level delivery state**. While a lot is `IN_DELIVERY`, its cards stay `IN_LOT`; they flip to `AT_DISTRIBUTOR` only when the order is marked delivered.
- **Flags:** `is_active` — the universal client-side gate, true from `AT_DISTRIBUTOR` onward (through `ACTIVATION_PROGRESS`, `ACTIVATED`, `ACTIVATION_FAILED`); false only pre-delivery or while disabled. `is_disabled` — admin-disabled overlay. `is_revoked` — set once a failed card is revoked for re-use.

### Set / Lot / Order states

- **Set:** `NOT_PRINTED → PENDING_PRINTING → PRINTED`.
- **Lot:** `PENDING → IN_DELIVERY → DELIVERED | RETURNED`. No `PENDING_DELIVERY`. A lot enters `IN_DELIVERY` **when it is placed on an order** and **cannot change again until the order it belongs to changes**.
- **Order:** `PENDING_DELIVERY → IN_DELIVERY → DELIVERED | RETURNED`.
- **Orders are many-to-many with lots** (`Order Lot` join). One order may bundle several lots, freely mixing `PENDING` and `RETURNED` lots.

### Admin action permissions (single source of truth for action enabling)

| Object | Action | Allowed when | Effect |
|--------|--------|--------------|--------|
| Set | Send to Print | `NOT_PRINTED` | → `PENDING_PRINTING` |
| Set | Mark Printed | `PENDING_PRINTING` | → `PRINTED`; all its cards `IN_SET → PRINTED` |
| Set | Delete (cascade) | `NOT_PRINTED` or `PENDING_PRINTING` | set + all its cards deleted entirely · logs `REMOVE_SET` |
| Lot | Delete | `PENDING` only | cards `IN_LOT → PRINTED` · logs `REMOVE_LOT` |
| Lot | (state follows order) | — | cannot be changed directly while `IN_DELIVERY` |
| Order | Delete | `PENDING_DELIVERY` only | each lot reverts to its prior state (`PENDING`, or `RETURNED` if it was returned) |
| Order | Mark IN_DELIVERY | `PENDING_DELIVERY` | → `IN_DELIVERY` |
| Order | Mark DELIVERED | `IN_DELIVERY` | order + its lots → `DELIVERED`; all cards → `AT_DISTRIBUTOR`, `is_active = true` |
| Order | Mark RETURNED | `IN_DELIVERY` | order + its lots → `RETURNED`; cards stay `IN_LOT`, lots re-assignable |
| Card | Delete | `IN_SET` or `PRINTED` | card deleted · logs `REMOVE_CARD` |
| Card | Disable | `IN_LOT` or `AT_DISTRIBUTOR`, not disabled | `is_disabled = true`, `is_active = false` |
| Card | Enable (undo disable) | currently disabled | `is_disabled = false`, `is_active = true`, card → `AT_DISTRIBUTOR` |
| Card | Revoke | `ACTIVATION_FAILED`, not disabled | `is_revoked = true`, `is_active = true`, card → `AT_DISTRIBUTOR` (re-usable); no flag-undo, but the card can still be disabled afterward · logs `REVOKE_CARD` |

> **Logging note (carried into Part 3):** the `Log Action Type` enum covers `REMOVE_SET`, `REMOVE_LOT`, `REMOVE_CARD`, `REVOKE_CARD`. It does **not** include set/lot/order **creation**, set/order **state transitions**, order **deletion**, or card **disable/enable** — those actions therefore write no log row under the current enum.

---

# SV-PAGE-011 — Orders Management

**Route:** `/admin/distributors/orders` · accepts `?distributor={id}` to arrive pre-filtered.

### Stats cards

Total Orders (all-time · this month · this week) · Pending Delivery (count) · In Delivery (count) · Total Revenue from Orders (sum of `order_price`).

### Create New Order — multi-step modal

```
Step 1  Select Distributor      searchable dropdown of enabled distributors
Step 2  Select Lots             multi-select list of PENDING + RETURNED lots
                                 (label, duration, card count, state) · live total card count
Step 3  Receiver Information     pre-filled from distributor (name, phone, wilaya, commune);
                                 every field overridable
Step 4  Delivery Configuration   delivery company (active list) · delivery type (Home / Pickup Point / Store)
                                 · order price · deliver price
Confirm  summary → [Confirm Order]
         → order created in PENDING_DELIVERY; every selected lot → IN_DELIVERY
```

Maps to **CreateOrderCommand**: `distributor_id`, `lot_ids[]`, `receiver_name`, `receiver_phone`, `receiver_wilaya_id`, `receiver_commune_id`, `delivery_company_id`, `delivery_type`, `order_price`, `deliver_price`.

### Orders table

**Filters:** search (distributor / receiver / order number), date range, wilaya, delivery company, state. **Pagination:** 10/page, selectable.

| Column | Source / note |
|--------|---------------|
| Order Number | resolved |
| Distributor Name | resolved |
| Receiver Name | may differ from distributor |
| Phone | resolved |
| Wilaya / Commune | resolved names |
| Delivery Company | resolved name |
| Delivery Type | Home / Pickup Point / Store |
| Lots | list of lot numbers on the order |
| Cards Count | aggregate across the order's lots |
| Order Price | DZD |
| Deliver Price | DZD |
| Created / Completed | dates |
| State | color-coded badge: `PENDING_DELIVERY` amber, `IN_DELIVERY` blue, `DELIVERED` green, `RETURNED` red |
| Actions | state-dependent (below) |

**Actions:** View (opens order detail drawer) · Delete (only `PENDING_DELIVERY`) · Mark IN_DELIVERY · Mark DELIVERED (opens a small modal to record the delivered card count, defaulting to the order's total) · Mark RETURNED. Disabled actions are hidden per the permission table.

### API

| Method | Endpoint | Input | Output (resolved) |
|--------|----------|-------|-------------------|
| GET | `/api/admin/orders` | `?search=&wilaya_id=&delivery_company_id=&state=&date_from=&date_to=&distributor_id=&page=&per_page=` | `{ records[], total, page, total_pages }`; each: `{ order_number, distributor_name, receiver_name, receiver_phone, wilaya_name, commune_name, delivery_company_name, delivery_type, lot_numbers[], cards_count, order_price, deliver_price, state, created_at, completed_at }` + header stat sums |
| GET | `/api/admin/orders/{id}` | — | Full order incl. per-lot breakdown `{ lot_number, subscription_label, cards_count, lot_state }[]`, receiver block (resolved names), prices, `delivered_count` |
| GET | `/api/admin/lots/available-for-order` | `?subscription_plan_id=` | Lots in `PENDING` or `RETURNED`: `{ id, lot_number, subscription_label, cards_count, state }` |
| POST | `/api/admin/orders` | CreateOrderCommand | Created order (resolved); selected lots set to `IN_DELIVERY` |
| DELETE | `/api/admin/orders/{id}` | — | 200; lots revert. (No log type) |
| POST | `/api/admin/orders/{id}/transition` | TransitionOrderCommand `{ to, delivered_count? }` | Updated order + cascaded card/lot effects per the permission table |

### Data dependencies

- **Reads:** `useOrders`, `useOrderDetail`, `useAvailableLotsForOrder`, `useDistributors` (Step 1 search), `useDeliveryCompanies` (active, Step 4), `useWilayas` / `useCommunes` (Step 3 overrides), `useSubscriptionPlans` (Step 2 filter).
- **Writes:** `useCreateOrder` (→ CreateOrderCommand), `useDeleteOrder`, `useTransitionOrder` (→ TransitionOrderCommand).
- **Navigation:** "View" opens a detail drawer (no separate route). Receiver/distributor name in the drawer → `<Link>` `/admin/distributors/{id}`.

### States

- **Loading:** stats skeleton; table skeleton; wizard Step 2 list shimmer; commune select disabled until wilaya chosen.
- **Empty:** no orders → "No orders yet. Create your first order."; no filter match → "No orders match your filters." + Clear; wizard Step 2 with no eligible lots → "No PENDING or RETURNED lots available — create a lot first." with a `<Link>` to `/admin/activations/sets-lots`.
- **Error:** table retry; create/transition/delete failures → toast, wizard values preserved; a transition rejected by the backend state guard → toast explaining the current state.

---

# SV-PAGE-012 — Sets & Lots Management

**Route:** `/admin/activations/sets-lots`

### Stats cards

Total Sets (with state breakdown) · Total Lots (with state breakdown) · Cards in Sets / in Lots (counts) · Cards Awaiting Delivery (`IN_LOT` on an `IN_DELIVERY` order).

### Create New Set (modal)

| Field | Type | Validation | Maps to |
|-------|------|------------|---------|
| Number of Keys | number | int, default 100 | CreateSetCommand.number_of_keys |
| Subscription Plan | select | active plans from `useSubscriptionPlans` (resolved label) | CreateSetCommand.subscription_plan_id |

Confirm → set in `NOT_PRINTED`; the keys are generated as cards in `IN_SET`.

### Create New Lot (modal)

- **Subscription Plan** filter (drives the candidate list).
- List of **available cards in `PRINTED`** matching the plan, with checkboxes; **Select All / Deselect All**; live selected count.
- Confirm → lot in `PENDING`; selected cards → `IN_LOT`. Maps to **CreateLotCommand** `{ subscription_plan_id, card_ids[] }`.

### Sets table

**Filters:** search (set number), subscription plan, state.

| Column | Notes |
|--------|-------|
| Set Number / Number of Keys / Subscription (label) / State / Created / Printed | resolved |
| Actions | Send to Print (`NOT_PRINTED→PENDING_PRINTING`) · Mark Printed (`PENDING_PRINTING→PRINTED`) · Delete (`NOT_PRINTED` or `PENDING_PRINTING`, cascade) · View Cards |

### Lots table

**Filters:** search (lot number), subscription plan, state. Lots are not edited or delivered from this page — delivery is driven entirely by Orders, and lot state follows the order.

| Column | Notes |
|--------|-------|
| Lot Number / Subscription (label) / Number of Cards / Delivered Cards / Created / Delivery Date / State | resolved |
| Actions | Delete (`PENDING` only → cards back to `PRINTED`) · View Cards |

### API

| Method | Endpoint | Input | Output (resolved) |
|--------|----------|-------|-------------------|
| GET | `/api/admin/sets` | `?search=&subscription_plan_id=&state=&page=&per_page=` | Sets `{ set_number, number_of_keys, subscription_label, state, created_at, printed_at }` + state-breakdown sums |
| POST | `/api/admin/sets` | CreateSetCommand | Created set (cards generated in `IN_SET`) |
| POST | `/api/admin/sets/{id}/transition` | `{ to }` | Updated set; on `PRINTED`, cards `IN_SET→PRINTED` |
| DELETE | `/api/admin/sets/{id}` | — | 200; cascade-deletes the set's cards · logs `REMOVE_SET` |
| GET | `/api/admin/lots` | `?search=&subscription_plan_id=&state=&page=&per_page=` | Lots `{ lot_number, subscription_label, number_of_cards, number_of_delivered_cards, state, created_at, delivery_date }` + state-breakdown sums |
| GET | `/api/admin/cards/available-for-lot` | `?subscription_plan_id=` | `PRINTED` cards matching the plan: `{ id, key, subscription_label }` |
| POST | `/api/admin/lots` | CreateLotCommand | Created lot in `PENDING`; selected cards `→ IN_LOT` |
| DELETE | `/api/admin/lots/{id}` | — | 200; cards `IN_LOT→PRINTED` · logs `REMOVE_LOT` |
| GET | `/api/admin/subscription-plans` | `?active=true` | Active plans: `{ id, label }` (e.g. "Snapchat Plus — 01 Month") |

### Data dependencies

- **Reads:** `useSets`, `useLots`, `useAvailableCardsForLot`, `useSubscriptionPlans`.
- **Writes:** `useCreateSet` (→ CreateSetCommand), `useTransitionSet`, `useDeleteSet`, `useCreateLot` (→ CreateLotCommand), `useDeleteLot`.
- **Navigation:** set "View Cards" → `<Link>` `/admin/activations/cards?set={set_number}`; lot "View Cards" → `<Link>` `/admin/activations/cards?lot={lot_number}`.

### States

- **Loading:** stats skeleton; both tables skeleton; lot modal candidate list shimmer.
- **Empty:** no sets → "No sets yet. Create your first set."; no lots → "No lots yet."; lot modal with no `PRINTED` cards for the plan → "No printed cards available for this plan."; filter no-match → "Nothing matches your filters." + Clear.
- **Error:** table retry; create/transition/delete failures → toast; a delete blocked by state guard → toast naming the current state.

---

# SV-PAGE-013 — Cards Management

**Route:** `/admin/activations/cards` · accepts `?set=`, `?lot=`, `?distributor=`, `?key=` to arrive pre-filtered.

### Stats cards

Total Cards (all states) · Cards by State (breakdown across the combined `Card Stat`) · Active Cards (`AT_DISTRIBUTOR` + `is_active`) · Flagged (disabled / revoked counts).

### Cards table

**Search:** by key. **Filters:** state (multi-select), set number, lot number, distributor, subscription plan, flag (disabled / revoked). **Pagination:** dynamic 5/10/20/50/100, default 10.

| Column | Notes |
|--------|-------|
| Key | monospace |
| Subscription (label) | resolved |
| Set Number / Lot Number | resolved (lot blank if not in a lot) |
| Distributor | resolved name, only once `AT_DISTRIBUTOR` |
| Created | date |
| State | `Card Stat` badge + flag chips (`Disabled`, `Revoked`) |
| Actions | state-dependent per the permission table |

**Actions:** View (detail modal) · Delete (`IN_SET`/`PRINTED`) · Disable (`IN_LOT`/`AT_DISTRIBUTOR`) · Enable (when disabled) · Revoke (`ACTIVATION_FAILED`, not disabled). Each destructive action confirms first.

### Card detail modal

```
┌──────────────────────────────────────┐
│ KEY · subscription label · state + flags
├──────────────────────────────────────┤
│ DISTRIBUTION TIMELINE (derived)      │
│ • IN_SET        [set created]        │
│ • PRINTED       [set printed]        │
│ • IN_LOT        [lot created]        │
│ • IN_DELIVERY   [order in delivery]  │
│ • AT_DISTRIBUTOR[order delivered]    │
├──────────────────────────────────────┤
│ [View Activation History]            │
└──────────────────────────────────────┘
```

The timeline is **derived from set/lot/order timestamps** (no card-history table); each row appears only once its source timestamp exists.

### API

| Method | Endpoint | Input | Output (resolved) |
|--------|----------|-------|-------------------|
| GET | `/api/admin/cards` | `?search=&state=&set_number=&lot_number=&distributor_id=&subscription_plan_id=&flag=&page=&per_page=` | `{ records[], total, page, total_pages }`; each: `{ id, key, subscription_label, set_number, lot_number, distributor_name, card_stat, is_active, is_disabled, is_revoked, created_at }` + state-breakdown sums |
| GET | `/api/admin/cards/{id}` | — | Card + derived distribution timeline `{ stat, at }[]` |
| DELETE | `/api/admin/cards/{id}` | — | 200 (state-guarded) · logs `REMOVE_CARD` |
| POST | `/api/admin/cards/{id}/disable` | — | `is_disabled=true`, `is_active=false` (no log type) |
| POST | `/api/admin/cards/{id}/enable` | — | `is_disabled=false`, `is_active=true`, → `AT_DISTRIBUTOR` (no log type) |
| POST | `/api/admin/cards/{id}/revoke` | — | `is_revoked=true`, `is_active=true`, → `AT_DISTRIBUTOR` · logs `REVOKE_CARD` |

### Data dependencies

- **Reads:** `useCards`, `useCardDetail`.
- **Writes:** `useDeleteCard`, `useDisableCard`, `useEnableCard`, `useRevokeCard`.
- **Navigation:** "View Activation History" → `<Link>` `/admin/activations?key={key}`; distributor name → `<Link>` `/admin/distributors/{id}`; set/lot chips → `<Link>` back to `/admin/activations/sets-lots`.

### States

- **Loading:** stats skeleton; table skeleton; detail modal timeline shimmer.
- **Empty:** no cards → "No cards yet — create a set to generate cards." with a `<Link>` to `/admin/activations/sets-lots`; filter no-match → "No cards match your filters." + Clear.
- **Error:** table retry; action failures → toast; a state-guarded action rejected → toast naming the current state; invalid pre-filter (e.g. unknown `?set=`) → empty result with the active filter shown and clearable.

---

*End of Part 2. Part 3 covers Activations, Activation Detail, Statistics, Settings (Admin Accounts, the speed-tiered commission matrix, Delivery Companies, Subscription Plans, Inactivity Timeout, Active Hours), and Logs.*
