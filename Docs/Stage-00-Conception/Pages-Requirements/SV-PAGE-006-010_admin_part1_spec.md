# SV-PAGE-006→010 — Admin Panel · Part 1 of 3 (Dashboard · Activators · Distributors)

> **App:** Setvision Web Application
> **Pages:** Dashboard, Activators list, Activator detail, Distributors list, Distributor detail
> **Routes:** `/admin`, `/admin/activators`, `/admin/activators/{id}`, `/admin/distributors`, `/admin/distributors/{id}`
> **Auth:** JWT + role check (admin only)
> **Target Device:** Desktop-first (1280px+). Tablet functional; mobile not a primary target (tables may horizontal-scroll)
> **Languages:** EN + FR
> **Dark/Light mode:** Yes, persisted in localStorage
> **Source of truth:** the new DB schema + scenarios. Backend returns fully resolved DTOs (names, labels, computed totals) so the front renders without joining or recomputing.

---

## Conventions used in all three admin documents

- **API output rule:** every response is pre-resolved. FKs are returned as their human values, never as raw ids. A row that references a wilaya/commune/subscription plan/activator/distributor comes back with the *name/label* already filled in. The front never holds a wilaya table to join against.
- **Data dependencies:** each page lists the `use[Name]` hooks it consumes (read) or triggers (write), the form fields it collects, and the Command/DTO each form maps to. Interfaces and enum value lists are intentionally omitted.
- **Navigation:** only the existence and target route of a `<Link>` is given; the destination page is specified in its own section/document.
- **States:** every data region defines a loading state and an empty/error state.
- **Logging:** admin writes that must produce a `Log` row name the matching `Log Action Type` in their write description.

---

## Shared Admin Shell (applies to every admin page)

```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER: [Logo] SETVISION        🔔  EN|FR  🌙  Admin Name ▼     │
├──────────────────────┬──────────────────────────────────────────┤
│ SIDEBAR              │  PAGE CONTENT                            │
│ 📊 Dashboard         │                                          │
│ 👥 Activators        │                                          │
│ 🏪 Distributors  ▼   │                                          │
│   └ Distributors     │                                          │
│   └ Orders           │                                          │
│ 🎴 Activations   ▼   │                                          │
│   └ Sets & Lots      │                                          │
│   └ Cards            │                                          │
│   └ Activations      │                                          │
│ 📈 Statistics        │                                          │
│ ⚙️  Settings         │                                          │
│ 📜 Logs              │                                          │
└──────────────────────┴──────────────────────────────────────────┘
```

- Sidebar: persistent left panel on desktop; collapsible groups with `▼`; active route highlighted purple (`#6A2FD6`).
- Header: admin display name in the user menu; **Sign Out** in the dropdown (confirm dialog → clear JWT → close WebSocket → `<Link>` to `/login`).
- **Notification bell (admin):** badge fed live by `useAdminWebSocket`. Today it surfaces exactly two event types per the conception — an activation entering **FREEZE** (needs admin resolution) and is otherwise idle. No notifications table exists; the badge/list is derived from the live socket only and resets on read within the session.
- **Data dependencies (shell):** `useAdminAuth` (session + role guard via `AdminGuard`), `useAdminWebSocket` (shell-level connection shared by all pages), `useTheme`, `useLanguage`.
- **States (shell):** while the session is resolving → full-page spinner; invalid/expired session → redirect to `/login`; socket drop → silent reconnect with a small "reconnecting" indicator on the bell.

### Shared activation-lifecycle reference (used by Dashboard here; full card/set/lot machine is in Part 2)

An `Activation` moves through `PENDING → PROCESSING → (WRONG_INFORMATION ⇄ ADDITIONAL_INFORMATION) → ACTIVATED | CANCELLED_BY_ACTIVATOR | FREEZE`, with `REMOVED_FROM_ACTIVATOR` on inactivity timeout. A `FREEZE` is admin-resolved to `ACTIVATED_BY_ADMIN` or `CANCELLED_BY_ADMIN`. Card outcome: `ACTIVATED`/`ACTIVATED_BY_ADMIN` → card `ACTIVATED`; `CANCELLED_BY_ADMIN` → card `ACTIVATION_FAILED`. `CANCELLED_BY_ACTIVATOR`/`REMOVED_FROM_ACTIVATOR` spawn a fresh `PENDING` activation (card stays `ACTIVATION_PROGRESS`). All commission figures are activator-only; distributor commission does not exist.

---

# SV-PAGE-006 — Dashboard

**Route:** `/admin`

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ STATS ROW (4 cards)                                         │
│ [Total Activations] [Total Activators] [Total Distributors] │
│ [Active Cards]                                              │
├─────────────────────────────────────────────────────────────┤
│ ⚠️ FROZEN ACTIVATIONS (priority, live)                      │
│ table: key | subscription | activator | client | since | reason
│ per row: [Activate] [Cancel]                                │
├─────────────────────────────────────────────────────────────┤
│ RECENT ACTIVATIONS (last 10, completed)                     │
├─────────────────────────────────────────────────────────────┤
│ PENDING ACTIVATIONS (live, color-coded by wait)             │
└─────────────────────────────────────────────────────────────┘
```

### Stats cards

| Card | Shows | Sub-label |
|------|-------|-----------|
| Total Activations | All-time completed (`ACTIVATED` + `ACTIVATED_BY_ADMIN`) | "+N this month", trend % vs previous month |
| Total Activators | Enabled count | "N disabled · N online now" |
| Total Distributors | Enabled count | "N with active stock" |
| Active Cards | Cards `AT_DISTRIBUTOR` with `is_active = true` | "across N distributors" |

### Frozen Activations (priority section, live)

- Lists activations currently in **FREEZE**. Each row resolves: key, subscription label, activator full name, client full name, frozen-since timestamp (relative), and the freeze reason text.
- Row actions: **Activate** → resolves to `ACTIVATED_BY_ADMIN` (card → `ACTIVATED`); **Cancel** → resolves to `CANCELLED_BY_ADMIN` (card → `ACTIVATION_FAILED`). Each opens a confirm dialog; "Cancel" confirm shows the consequence ("the card will be marked failed").
- New freezes arrive live via `useAdminWebSocket` and prepend with a brief highlight; resolved rows leave the list.

### Recent Activations

- Last 10 completed, read-only. Each row resolves: subscription label, activator full name, client full name, distributor store name, completed-at, duration (mm:ss, computed `taken_at → completed_at`).
- Row click → `<Link>` to `/admin/activations/{id}`.

### Pending Activations

- Live list of activations in **PENDING**. Resolves: subscription label, key, client full name, waiting-since, waiting duration. Waiting time color-coded green `<5m` / amber `5–15m` / red `>15m`.

### API

| Method | Endpoint | Input | Output (resolved) |
|--------|----------|-------|-------------------|
| GET | `/api/admin/dashboard/stats` | — | The 4 cards above, each with its count + sub-label values already computed (online count, disabled count, stock count, trend %) |
| GET | `/api/admin/dashboard/frozen-activations` | — | List of frozen rows: `{ activation_id, key, subscription_label, activator_full_name, client_full_name, frozen_since, freeze_reason }` |
| GET | `/api/admin/dashboard/recent-activations` | — | Last 10: `{ activation_id, subscription_label, activator_full_name, client_full_name, distributor_store_name, completed_at, duration_seconds }` |
| GET | `/api/admin/dashboard/pending-activations` | — | Live list: `{ activation_id, key, subscription_label, client_full_name, requested_at, waiting_seconds }` |
| POST | `/api/admin/activations/{id}/activate-by-admin` | — | Updated activation summary. **Writes** activation → `ACTIVATED_BY_ADMIN`, card → `ACTIVATED`. Logs `CHANGE_ACTIVATION_COMMISSION` is **not** triggered here; this is a state resolution (no dedicated log type in the enum — see Part 3 logging note) |
| POST | `/api/admin/activations/{id}/cancel-by-admin` | — | Updated activation summary. **Writes** activation → `CANCELLED_BY_ADMIN`, card → `ACTIVATION_FAILED` |
| WS | shared `useAdminWebSocket` | — | `new_pending_activation`, `activation_frozen`, `activation_completed` events to refresh the live regions |

### Data dependencies

- **Reads:** `useDashboardStats`, `useFrozenActivations`, `useRecentActivations`, `usePendingActivations`, `useAdminWebSocket`.
- **Writes:** `useActivateActivationByAdmin` (→ ActivateByAdminCommand), `useCancelActivationByAdmin` (→ CancelByAdminCommand).
- **Navigation:** recent/pending rows → `<Link>` `/admin/activations/{id}`.

### States

- **Loading:** stats row → 4 skeleton cards; each list region → skeleton rows.
- **Empty:** Frozen → green card "✓ No frozen activations — all running smoothly." Recent → "No completed activations yet." Pending → "All clear — no pending requests right now."
- **Error:** per-region inline retry ("Couldn't load this section. Retry."); a failed action shows a toast and leaves the row in place.

---

# SV-PAGE-007 — Activators Management

**Route:** `/admin/activators`

### Stats cards

Total Activators (enabled) · Currently Online · Total Successful Activations (sum of `nb_of_successful_activation`) · Total Credits Owed (sum of `credits` across activators).

### Add New Activator (modal)

| Field | Type | Validation | Maps to |
|-------|------|------------|---------|
| Full Name | text | 3–100 | CreateActivatorCommand.full_name |
| Username | text | unique, 3–30, alphanumeric + `_` | CreateActivatorCommand.username |
| Phone | tel | Algerian format | CreateActivatorCommand.phone |
| Initial Credits (DZD) | number | optional, default 0 | CreateActivatorCommand.initial_credits |

On success the response returns a one-time generated password shown in a confirmation panel ("Activator created. Initial password: XXXX — share securely."). Creates the underlying `User` (activator role) + `Activator`.

### Activators table

**Search:** name / username / phone. **Pagination:** 10/page, selectable 10/20/50/100.

| Column | Source / note |
|--------|---------------|
| Full Name | `Activator.fullname` |
| Username | `User.username` |
| Password | revealable on click (admin-only) |
| Phone | `Activator.phone` |
| Successful Activations | `nb_of_successful_activation` |
| Avg Activation Time | backend-derived (mm:ss), green `<5m`/amber/red |
| Total Earned | `total_earning` (DZD) |
| Credits Owed | `credits` (DZD) |
| Status | enabled/disabled from `User.is_enabled` |
| Actions | View · Enable/Disable · Delete · Record Payment |

### Record Payment (modal)

Fields: Amount (DZD, required), Date (default today). No note field. Maps to RecordPaymentCommand; backend snapshots `previous_credits` and decrements the activator's `credits`.

### API

| Method | Endpoint | Input | Output (resolved) |
|--------|----------|-------|-------------------|
| GET | `/api/admin/activators` | `?search=&page=&per_page=` | `{ records[], total, page, total_pages }`; each record: `{ id, full_name, username, password, phone, nb_successful, avg_activation_time_seconds, total_earned, credits_owed, is_enabled, last_login_at }` + header stat sums |
| POST | `/api/admin/activators` | CreateActivatorCommand | Created activator summary + `generated_password` (one-time). Logs `CHANGE_USER_INFORMATION` (creation) |
| POST | `/api/admin/activators/{id}/toggle` | — | Updated `is_enabled`. **Writes** `User.is_enabled`. Logs `CHANGE_USER_STAT` |
| DELETE | `/api/admin/activators/{id}` | — | 200. Soft-deletes the user (`deletedAt`) |
| POST | `/api/admin/activators/{id}/payments` | RecordPaymentCommand `{ amount, date }` | Payment row `{ id, amount, previous_credits, payment_date, recorded_by_name }` + new `credits_owed`. Logs `SET_PAYMENT` |

### Data dependencies

- **Reads:** `useActivators` (list + header sums).
- **Writes:** `useCreateActivator` (→ CreateActivatorCommand), `useToggleActivator`, `useDeleteActivator`, `useRecordPayment` (→ RecordPaymentCommand).
- **Navigation:** "View" / row click → `<Link>` `/admin/activators/{id}`.

### States

- **Loading:** stats → skeleton cards; table → skeleton rows.
- **Empty:** no activators → "No activators yet. Add your first activator." with the Add button; no search match → "No activators match your search." + Clear.
- **Error:** table-level retry; create/toggle/delete/payment failures → toast, modal stays open with values preserved.

---

# SV-PAGE-008 — Activator Detail

**Route:** `/admin/activators/{id}`

### Sections

```
┌─────────────────────────────────────────┐
│ PROFILE  Name | Username | Phone        │
│          [Edit] [Enable/Disable] [Reset PW]
├─────────────────────────────────────────┤
│ STATS & REVENUE                         │
│ Activations | Avg Time | Earned | Paid  │
│ Credits Owed | Success Rate %           │
├─────────────────────────────────────────┤
│ PERFORMANCE CHART (last 30 days)        │
├─────────────────────────────────────────┤
│ PAYMENTS HISTORY                        │
│ date | amount | prev. credits | by      │
│ [+ Record Payment]                      │
├─────────────────────────────────────────┤
│ [View All Activations by This Activator]│
└─────────────────────────────────────────┘
```

- **Editable fields:** Full Name, Phone, Username (uniqueness checked). Inline edit or modal.
- **Reset Password:** generates a new temp password, shown once.
- **Stats:** Total Activations (`nb_of_activation`), Avg Time (derived), Earned (`total_earning`), Paid (sum of non-deleted payments), Credits Owed (`credits`), Success Rate (`nb_successful / nb_activation`).
- **Payments history:** each row resolves the recording admin's name; soft-deleted payments are excluded from the Paid total. A row has a **Delete** action (soft delete).

### API

| Method | Endpoint | Input | Output (resolved) |
|--------|----------|-------|-------------------|
| GET | `/api/admin/activators/{id}` | — | `{ id, full_name, username, phone, is_enabled, last_login_at, nb_activation, nb_successful, avg_activation_time_seconds, total_earned, total_paid, credits_owed, success_rate }` |
| PATCH | `/api/admin/activators/{id}` | UpdateActivatorCommand `{ full_name?, phone?, username? }` | Updated profile. Logs `CHANGE_USER_INFORMATION` |
| POST | `/api/admin/activators/{id}/toggle` | — | Updated `is_enabled`. Logs `CHANGE_USER_STAT` |
| POST | `/api/admin/activators/{id}/reset-password` | — | `{ generated_password }` (one-time). Logs `CHANGE_USER_PASSWORD` |
| GET | `/api/admin/activators/{id}/performance` | `?days=30` | Daily series `{ date, count, earned }[]` (pre-aggregated) |
| GET | `/api/admin/activators/{id}/payments` | `?page=&per_page=` | Paginated payments: `{ id, amount, previous_credits, payment_date, recorded_by_name, is_deleted }` |
| POST | `/api/admin/activators/{id}/payments` | RecordPaymentCommand | New payment + updated `credits_owed`. Logs `SET_PAYMENT` |
| DELETE | `/api/admin/payments/{paymentId}` | — | 200, payment soft-deleted, `credits_owed` recomputed. Logs `DELETE_PAYMENT` |

### Data dependencies

- **Reads:** `useActivatorDetail`, `useActivatorPerformance`, `useActivatorPayments`.
- **Writes:** `useUpdateActivator` (→ UpdateActivatorCommand), `useToggleActivator`, `useResetActivatorPassword`, `useRecordPayment` (→ RecordPaymentCommand), `useDeletePayment`.
- **Navigation:** "View All Activations by This Activator" → `<Link>` `/admin/activations?activator={id}`.

### States

- **Loading:** profile + stats skeleton; chart shimmer; payments skeleton rows.
- **Empty:** no payments → "No payments recorded yet." with the Record Payment button; chart with no data → "No activity in this period."
- **Error:** profile load fail → full-section retry; edit/reset/payment fail → toast, form values preserved; invalid `{id}` → "Activator not found." with `<Link>` back to `/admin/activators`.

---

# SV-PAGE-009 — Distributors Management

**Route:** `/admin/distributors`

### Stats cards

Total Distributors (enabled) · Active Distributors (with `nb_of_active_cards > 0`) · Total Cards in Stock (sum of active cards across distributors) · Activations Originated This Month.

### Add New Distributor (modal)

| Field | Type | Validation | Maps to |
|-------|------|------------|---------|
| Full Name | text | 3–100 | CreateDistributorCommand.full_name |
| Store Name | text | 2–100 | CreateDistributorCommand.store_name |
| Phone | tel | Algerian format | CreateDistributorCommand.phone |
| Wilaya | select | from `useWilayas` | CreateDistributorCommand.wilaya_id |
| Commune | select | filtered by wilaya via `useCommunes` | CreateDistributorCommand.commune_id |

Wilaya/commune selects send ids; **all read responses return the resolved FR/AR names**, so tables/detail never join.

### Distributors table

**Filters:** search (name/store/phone), wilaya, commune (filtered by wilaya). **Pagination:** 10/page, selectable.

| Column | Source / note |
|--------|---------------|
| Full Name | `Distributor.distributor_full_name` |
| Store Name | `store_name` |
| Phone | resolved |
| Wilaya | resolved name |
| Commune | resolved name |
| Activations Count | `nb_of_activation` |
| Active Cards in Stock | `nb_of_active_cards` |
| Delivered Orders | backend-derived count |
| Status | `is_enabled` badge |
| Actions | View · Enable/Disable · Delete |

### API

| Method | Endpoint | Input | Output (resolved) |
|--------|----------|-------|-------------------|
| GET | `/api/admin/distributors` | `?search=&wilaya_id=&commune_id=&page=&per_page=` | `{ records[], total, page, total_pages }`; each: `{ id, full_name, store_name, phone, wilaya_name, commune_name, nb_activation, nb_active_cards, delivered_orders_count, is_enabled }` + header sums |
| POST | `/api/admin/distributors` | CreateDistributorCommand | Created distributor (resolved names). Logs `ADD_DISTRIBUTOR` |
| POST | `/api/admin/distributors/{id}/toggle` | — | Updated `is_enabled`. Logs `CHANGE_DISTRIBUTOR_STAT` |
| DELETE | `/api/admin/distributors/{id}` | — | 200, soft-deleted |
| GET | `/api/admin/wilayas` | — | `{ id, code, fr_name, ar_name }[]` |
| GET | `/api/admin/wilayas/{wilayaId}/communes` | — | `{ id, code, fr_name, ar_name }[]` |

### Data dependencies

- **Reads:** `useDistributors`, `useWilayas`, `useCommunes`.
- **Writes:** `useCreateDistributor` (→ CreateDistributorCommand), `useToggleDistributor`, `useDeleteDistributor`.
- **Navigation:** "View" / row click → `<Link>` `/admin/distributors/{id}`.

### States

- **Loading:** stats → skeleton; table → skeleton rows; commune select disabled+spinner until wilaya chosen.
- **Empty:** no distributors → "No distributors yet. Add your first distributor."; no filter match → "No distributors match your filters." + Clear Filters.
- **Error:** table retry; create/toggle/delete fail → toast, modal preserved; wilaya/commune fetch fail → select shows "Couldn't load — retry."

---

# SV-PAGE-010 — Distributor Detail

**Route:** `/admin/distributors/{id}`

### Sections

```
┌─────────────────────────────────────────┐
│ PROFILE (inline editable)               │
│ Name | Store | Phone | Wilaya | Commune │
├─────────────────────────────────────────┤
│ STATS                                    │
│ Sold Keys | Remaining Cards | Orders    │
│ Activations Originated                   │
├─────────────────────────────────────────┤
│ ORDERS HISTORY (compact)  [View All]    │
├─────────────────────────────────────────┤
│ CARDS HISTORY (compact)   [View All]    │
└─────────────────────────────────────────┘
```

- **Profile:** inline-edit Full Name, Store, Phone, Wilaya, Commune (commune re-filtered when wilaya changes). Enable/Disable toggle.
- **Stats (backend-derived):** Sold Keys (cards `ACTIVATED` originated here), Remaining Cards (`nb_of_active_cards`), Orders (count), Activations Originated.
- **Orders history:** compact table, each row resolves receiver name, wilaya/commune names, delivery company name, state, created/delivered dates, cards count.
- **Cards history:** compact table, each row resolves key, subscription label, current state.

### API

| Method | Endpoint | Input | Output (resolved) |
|--------|----------|-------|-------------------|
| GET | `/api/admin/distributors/{id}` | — | `{ id, full_name, store_name, phone, wilaya_id, wilaya_name, commune_id, commune_name, is_enabled, sold_keys, remaining_cards, orders_count, activations_count }` |
| PATCH | `/api/admin/distributors/{id}` | UpdateDistributorCommand `{ full_name?, store_name?, phone?, wilaya_id?, commune_id? }` | Updated profile (resolved names). Logs `CHANGE_DISTRIBUTOR_INFORMATION` |
| POST | `/api/admin/distributors/{id}/toggle` | — | Updated `is_enabled`. Logs `CHANGE_DISTRIBUTOR_STAT` |
| GET | `/api/admin/distributors/{id}/orders` | `?limit=` | Compact orders (resolved): `{ order_number, receiver_name, wilaya_name, commune_name, delivery_company_name, state, cards_count, created_at, completed_at }` |
| GET | `/api/admin/distributors/{id}/cards` | `?limit=` | Compact cards (resolved): `{ key, subscription_label, card_stat, is_active }` |

### Data dependencies

- **Reads:** `useDistributorDetail`, `useDistributorOrders`, `useDistributorCards`, plus `useWilayas`/`useCommunes` for the edit selects.
- **Writes:** `useUpdateDistributor` (→ UpdateDistributorCommand), `useToggleDistributor`.
- **Navigation:** "View All Orders" → `<Link>` `/admin/distributors/orders?distributor={id}`; "View All Cards" → `<Link>` `/admin/activations/cards?distributor={id}`.

### States

- **Loading:** profile + stats skeleton; each compact table skeleton.
- **Empty:** no orders → "No orders for this distributor yet."; no cards → "No cards delivered to this distributor yet."
- **Error:** profile fail → section retry; edit/toggle fail → toast, values preserved; invalid `{id}` → "Distributor not found." with `<Link>` back to `/admin/distributors`.

---

*End of Part 1. Part 2 covers Orders, Sets & Lots, and Cards (including the full card / set / lot / order state machine and the per-card derived logistics status). Part 3 covers Activations, Activation Detail, Statistics, Settings (with the Delivery Companies and Subscription Plans tabs and the speed-tiered commission matrix), and Logs.*
