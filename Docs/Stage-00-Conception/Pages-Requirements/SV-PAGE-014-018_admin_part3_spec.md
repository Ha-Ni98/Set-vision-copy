# SV-PAGE-014→018 — Admin Panel · Part 3 of 3 (Activations · Activation Detail · Statistics · Settings · Logs)

> **App:** Setvision Web Application
> **Pages:** Activations management, Activation detail, Statistics, Settings, Logs
> **Routes:** `/admin/activations`, `/admin/activations/{id}`, `/admin/statistics`, `/admin/settings`, `/admin/logs`
> **Auth:** JWT + role check (admin only)
> **Target Device:** Desktop-first (1280px+).
> **Languages:** EN + FR · **Dark/Light mode:** Yes
> **Source of truth:** new DB schema + scenarios. Shell, conventions (resolved DTOs, hooks, `<Link>`-only navigation, loading/empty/error), the activation-lifecycle reference (Part 1), and the distribution state machine + logging note (Part 2) all apply here unchanged.

---

# SV-PAGE-014 — Activations Management

**Route:** `/admin/activations` · accepts `?activator=`, `?distributor=`, `?key=`, `?state=` to arrive pre-filtered.

### Admin's role on this page

Activation state is driven by the **client**, the **activator**, and the **system** — it is read-only here, with exactly two admin interventions:

1. **Resolve a `FREEZE`** → `ACTIVATED_BY_ADMIN` (card → `ACTIVATED`) or `CANCELLED_BY_ADMIN` (card → `ACTIVATION_FAILED`). Same two operations as the dashboard's Frozen section.
2. **Set / override the activator price** on a completed activation (`ACTIVATED` / `ACTIVATED_BY_ADMIN`).

Admins do **not** freeze, cancel, or fail an active request directly — freeze is requested by the activator, and `REMOVED_FROM_ACTIVATOR` is system-driven on timeout.

### Stats cards

Total Activations (all-time · today · this week · this month) · Activations by State (donut) · Average Duration (mm:ss) · Total Revenue (sum of `activation_price` on completed).

### Activations table

**Filters:** subscription plan, activator, state, period (date range), distributor, wilaya, commune.

| Column | Source / note |
|--------|---------------|
| Key | resolved |
| Subscription (label) | resolved plan label |
| Activator Full Name | blank until picked up |
| Distributor Store Name | resolved |
| Client Name / Client Phone | resolved |
| Request Date | `requested_at` |
| Start Processing Date | `taken_at` |
| Completion Date | `completed_at` |
| Duration | mm:ss, computed `taken_at → completed_at` |
| Activator Price | DZD (blank if not yet set) |
| State | color-coded badge |
| Actions | View · (if `FREEZE`) Resolve · (if completed & price unset) Set Activator Price |

**Resolve (FREEZE rows):** opens a small panel showing the freeze reason with **Activate** / **Cancel** buttons (the two admin resolutions, each confirmed).
**Set Activator Price:** modal with a single DZD amount → **SetActivatorPriceCommand**; backend stores it on `Activation.activation_price`.

### API

| Method | Endpoint | Input | Output (resolved) |
|--------|----------|-------|-------------------|
| GET | `/api/admin/activations` | `?subscription_plan_id=&activator_id=&state=&distributor_id=&wilaya_id=&commune_id=&date_from=&date_to=&key=&page=&per_page=` | `{ records[], total, page, total_pages }`; each: `{ id, key, subscription_label, activator_full_name, distributor_store_name, client_name, client_phone, state, requested_at, taken_at, completed_at, duration_seconds, activation_price, freeze_reason }` + header stat sums + by-state breakdown |
| POST | `/api/admin/activations/{id}/activate-by-admin` | — | Updated activation; activation → `ACTIVATED_BY_ADMIN`, card → `ACTIVATED` |
| POST | `/api/admin/activations/{id}/cancel-by-admin` | — | Updated activation; activation → `CANCELLED_BY_ADMIN`, card → `ACTIVATION_FAILED` |
| POST | `/api/admin/activations/{id}/set-price` | SetActivatorPriceCommand `{ amount }` | Updated `activation_price` · logs `CHANGE_ACTIVATION_COMMISSION` |

### Data dependencies

- **Reads:** `useActivations`; filter dropdowns reuse `useSubscriptionPlans`, `useActivators`, `useDistributors`, `useWilayas`, `useCommunes`.
- **Writes:** `useActivateActivationByAdmin`, `useCancelActivationByAdmin`, `useSetActivatorPrice` (→ SetActivatorPriceCommand).
- **Navigation:** "View" / row click → `<Link>` `/admin/activations/{id}`.

### States

- **Loading:** stats skeleton; table skeleton.
- **Empty:** no activations → "No activations yet."; filter no-match → "No activations match your filters." + Clear.
- **Error:** table retry; resolve/set-price failures → toast, panel/modal preserved; rejected resolve (no longer frozen) → toast naming the current state.

---

# SV-PAGE-015 — Activation Information (detail)

**Route:** `/admin/activations/{id}` — read-only, with the single "Set / Override Activator Price" action.

### Sections

```
┌─────────────────────────────────────────┐
│ CLIENT          name · phone · email · submitted at
├─────────────────────────────────────────┤
│ DISTRIBUTOR     store · wilaya · commune  [→ detail]
├─────────────────────────────────────────┤
│ ACTIVATOR       name · username  [→ detail]   (empty if none yet)
├─────────────────────────────────────────┤
│ SUBMITTED INFORMATION (per-plan fields, current values)
│ e.g. Snapchat: username · email · phone · password · OTP
├─────────────────────────────────────────┤
│ ACTIVATION TIMELINE (one row per Activation Step)
│ • PENDING        [date]
│ • PROCESSING     [date]
│ • WRONG_INFORMATION [date]  → flagged: username, password
│ • PROCESSING     [date]  (client corrected)
│ • ADDITIONAL_INFORMATION [date] → requested: OTP
│ • PROCESSING     [date]  (client supplied OTP)
│ • ACTIVATED      [date]
├─────────────────────────────────────────┤
│ CARD HISTORY (derived distribution timeline)
├─────────────────────────────────────────┤
│ FINANCIAL  activator price · applied commission tier · [Set / Override Price]
└─────────────────────────────────────────┘
```

**Submitted Information** is the EAV payoff: the backend resolves each field the activation uses to `{ field_label, current_value }`, where current value is **latest-wins** — the most recent `Wrong information` or `Additional information` step value for that field, falling back to the original `Activation information` value. The front renders whatever fields the plan defines (Snapchat today = username, email, phone, password, plus OTP once supplied); a future plan renders its own field set with no schema or page change.

**Activation Timeline** is built from `Activation Step` rows (one per state transition). A `WRONG_INFORMATION` step lists the fields flagged (resolved `Wrong information` labels); an `ADDITIONAL_INFORMATION` step lists the fields requested (resolved `Additional information` labels) and, once answered, their values. A `FREEZE` step shows its reason.

### API

| Method | Endpoint | Input | Output (resolved) |
|--------|----------|-------|-------------------|
| GET | `/api/admin/activations/{id}` | — | `{ client: {full_name, phone, email, requested_at, taken_at, completed_at}, distributor: {id, store_name, wilaya_name, commune_name}, activator: {id, full_name, username} \| null, card: {key, subscription_label, distribution_timeline[]}, submitted_information: [{field_label, current_value}], timeline: [{stat, created_at, wrong_fields:[{field_label,value}], additional_fields:[{field_label,value}], freeze_reason?}], financial: {activation_price, commission_tier_label} }` |
| POST | `/api/admin/activations/{id}/set-price` | SetActivatorPriceCommand `{ amount }` | Updated `activation_price` · logs `CHANGE_ACTIVATION_COMMISSION` |

### Data dependencies

- **Reads:** `useActivationDetail`.
- **Writes:** `useSetActivatorPrice` (→ SetActivatorPriceCommand).
- **Navigation:** distributor block → `<Link>` `/admin/distributors/{id}`; activator block → `<Link>` `/admin/activators/{id}`; card key → `<Link>` `/admin/activations/cards?key={key}`.

### States

- **Loading:** sectioned skeletons (client/distributor/activator/timeline blocks).
- **Empty:** activator block when none assigned → "No activator has picked this up yet."; timeline always has at least the `PENDING` row.
- **Error:** load fail → full-page retry; invalid `{id}` → "Activation not found." with `<Link>` back to `/admin/activations`; set-price fail → toast, modal preserved.

---

# SV-PAGE-016 — Statistics

**Route:** `/admin/statistics`

### Filter bar

Period (Today / Last 7 Days / Last 30 Days / Last 3 Months / Last Year / Custom Range) · Subscription plan · Wilaya (optional). All charts re-fetch on filter change; backend returns **pre-aggregated** series so the front only renders.

### Charts

| Chart | Type |
|-------|------|
| Activations Over Time | Line (daily/weekly aggregation chosen by backend per period) |
| Activations by State | Donut |
| Top 10 Activators | Horizontal bar (by completed count) |
| Top 10 Distributors | Horizontal bar (by activations originated) |
| Avg Activation Time Trend | Line |
| Revenue Over Time | Line (sum of activator prices) |

### Algeria Wilaya Heatmap

- Interactive SVG of all 58 wilayas.
- **Color-mode selector:** dropdown choosing which metric drives the gradient — distributors / activations / cancellations / avg time. Scale: light purple (low) → dark purple (high).
- Hover tooltip per wilaya: distributors count, activations count, cancellations count, avg activation time.
- Click a wilaya → drill-down panel with that wilaya's detailed stats.

### API

| Method | Endpoint | Input | Output (resolved) |
|--------|----------|-------|-------------------|
| GET | `/api/admin/statistics/overview` | `?period=&date_from=&date_to=&subscription_plan_id=&wilaya_id=` | All six chart series, pre-aggregated and labelled |
| GET | `/api/admin/statistics/wilaya-heatmap` | `?period=&subscription_plan_id=` | Per-wilaya `{ wilaya_name, distributors_count, activations_count, cancellations_count, avg_activation_time_seconds }[]` for all 58 |
| GET | `/api/admin/statistics/wilaya/{wilayaId}` | `?period=` | Drill-down detail for one wilaya |

### Data dependencies

- **Reads:** `useStatisticsOverview`, `useWilayaHeatmap`, `useWilayaDrilldown`; filter dropdowns reuse `useSubscriptionPlans`, `useWilayas`.
- **Writes:** none.
- **Navigation:** none required; the heatmap drill-down is an in-page panel.

### States

- **Loading:** each chart shows its own shimmer; the map shows a neutral (un-shaded) outline while data loads.
- **Empty:** a period with no data → each chart renders "No data for this period."; heatmap renders all wilayas at the lowest shade with a "no activity" tooltip.
- **Error:** per-chart retry; heatmap fetch fail → outline map + "Couldn't load wilaya stats. Retry."

---

# SV-PAGE-017 — Settings

**Route:** `/admin/settings` — tabbed.

```
[ Admin Accounts ] [ Commission ] [ Subscription Plans ] [ Delivery Companies ] [ Inactivity Timeout ] [ Active Hours ]
```

### Tab 1 — Admin Accounts

- List of admin users: username, full name, last login, status (enabled/disabled).
- **Add Admin:** full name, username, phone → returns a one-time generated password. Maps to **CreateAdminCommand**; creates `User` (admin role) + `Admin`.
- **Edit / Delete:** cannot delete **self**; cannot delete the **last** admin (both enforced backend-side and reflected by disabled buttons).
- **Reset Password:** generates a new temp password, shown once.

### Tab 2 — Commission (activator, speed-tiered)

The commission matrix replaces the old flat salary table. Activator pay depends on **how fast** the activation completed.

- **Rows:** active subscription plans (resolved label).
- **Columns:** the configured `Commission Duration` tiers (e.g. ≤15 min, ≤30 min, and the catch-all "other/unlimited" tier). Tier definitions (min/max minutes) come from the data layer and are shown as read-only column headers; admins edit the **DZD cell values** only.
- **Cell:** editable DZD commission for that plan × tier.
- **Note shown in-tab:** "Changes apply to future activations only. Existing activations keep their original commission."
- At completion the system maps the activation's duration (`taken_at → completed_at`) to exactly one tier and writes `Activation.activation_price`; an admin can still override per-activation from the Activations pages.

Each cell save maps to **UpdateCommissionCommand** `{ subscription_plan_id, commission_duration_id, amount }` · logs `CHANGE_ACTIVATION_COMMISSION`.

### Tab 3 — Subscription Plans

- List of plans: subscription type + duration (resolved label) + active status.
- **Add Plan:** pick subscription type + duration → creates a plan (active by default); a new plan appears as a new row in the Commission matrix awaiting tier amounts.
- **Toggle Active:** activate/deactivate a plan. Deactivating hides it from Set/Lot/Order creation pickers; existing cards keep their plan.

### Tab 4 — Delivery Companies

- List: name, registered name, active status.
- **Add / Edit:** name, registered name. **Toggle Active:** inactive companies are hidden from the Order wizard's delivery-company picker.

### Tab 5 — Inactivity Timeout

- Numeric input (minutes) — how long an active request stays with an activator before auto-release to the pending pool as `REMOVED_FROM_ACTIVATOR`. Default 15, range 5–60. Maps to **UpdateTimeoutCommand**.

### Tab 6 — Active Hours

- Working hours start/end (Algiers time) + days-of-week toggle. Used to scope response-time statistics. Maps to **UpdateActiveHoursCommand**.

### API

| Method | Endpoint | Input | Output (resolved) |
|--------|----------|-------|-------------------|
| GET | `/api/admin/settings` | — | All settings blocks: timeout, active hours, commission matrix (plans × tiers with amounts), plus tier headers |
| GET | `/api/admin/admins` | — | Admins `{ id, username, full_name, last_login_at, is_enabled }` |
| POST | `/api/admin/admins` | CreateAdminCommand | Created admin + one-time `generated_password` · logs `CHANGE_USER_INFORMATION` |
| PATCH | `/api/admin/admins/{id}` | UpdateAdminCommand | Updated admin · logs `CHANGE_USER_INFORMATION` |
| DELETE | `/api/admin/admins/{id}` | — | 200 (guarded: not self, not last) |
| POST | `/api/admin/admins/{id}/reset-password` | — | `{ generated_password }` · logs `CHANGE_USER_PASSWORD` |
| GET | `/api/admin/subscription-plans` | `?active=` | Plans `{ id, label, subscription_type_name, duration_label, is_active }` |
| POST | `/api/admin/subscription-plans` | `{ subscription_type_id, subscription_duration_id }` | Created plan |
| POST | `/api/admin/subscription-plans/{id}/toggle` | — | Updated `is_active` |
| GET | `/api/admin/subscription-types` | — | `{ id, name }[]` (Add-Plan dropdown) |
| GET | `/api/admin/subscription-durations` | — | `{ id, label }[]` (Add-Plan dropdown) |
| GET | `/api/admin/delivery-companies` | `?active=` | `{ id, name, registered_name, is_active }[]` |
| POST | `/api/admin/delivery-companies` | `{ name, registered_name }` | Created company |
| PATCH | `/api/admin/delivery-companies/{id}` | `{ name?, registered_name? }` | Updated company |
| POST | `/api/admin/delivery-companies/{id}/toggle` | — | Updated `is_active` |
| PATCH | `/api/admin/settings/commission` | UpdateCommissionCommand | Updated cell · logs `CHANGE_ACTIVATION_COMMISSION` |
| PATCH | `/api/admin/settings/timeout` | UpdateTimeoutCommand `{ minutes }` | Updated timeout |
| PATCH | `/api/admin/settings/active-hours` | UpdateActiveHoursCommand `{ start, end, days[] }` | Updated active hours |

> Only `CHANGE_USER_*` (admin accounts) and `CHANGE_ACTIVATION_COMMISSION` (commission cells) produce log rows. Subscription-plan, delivery-company, timeout, and active-hours changes write no log under the current enum.

### Data dependencies

- **Reads:** `useSettings`, `useAdmins`, `useSubscriptionPlans`, `useSubscriptionTypes`, `useSubscriptionDurations`, `useDeliveryCompanies`, `useCommissionMatrix` (part of `useSettings`).
- **Writes:** `useCreateAdmin`, `useUpdateAdmin`, `useDeleteAdmin`, `useResetAdminPassword`, `useCreateSubscriptionPlan`, `useToggleSubscriptionPlan`, `useCreateDeliveryCompany`, `useUpdateDeliveryCompany`, `useToggleDeliveryCompany`, `useUpdateCommission` (→ UpdateCommissionCommand), `useUpdateTimeout` (→ UpdateTimeoutCommand), `useUpdateActiveHours` (→ UpdateActiveHoursCommand).
- **Navigation:** none leaves the page (all tabs are in-page).

### States

- **Loading:** per-tab skeletons; the active tab loads on first visit.
- **Empty:** no extra admins → list shows only the current admin (delete disabled); no plans → "No subscription plans yet — add one to start creating sets."; no delivery companies → "No delivery companies yet — add one before creating orders."
- **Error:** per-action toast with values preserved; commission cell save fail → cell reverts and flags red; delete-admin guard hit → toast ("You can't delete your own or the last admin account.").

---

# SV-PAGE-018 — Logs

**Route:** `/admin/logs` — immutable audit trail; no create/edit/delete from the UI.

### Filters

User (dropdown of admins) · Action type (the `Log Action Type` values) · Period (date range) · free-text search on the description.

### Logs table

| Column | Notes |
|--------|-------|
| Action Type | icon + color per type |
| Description | the stored `action_description` text |
| User | resolved admin name |
| Created Date | relative ("2 hours ago"), exact on hover |

- **Pagination:** dynamic per-page.
- No title column and no before/after expansion — the new `Log` carries only `action_type`, `action_description`, `user`, `created_at`.
- Rows are written automatically by the operations that have a matching action type (see the logging notes across Parts 1–3).

### API

| Method | Endpoint | Input | Output (resolved) |
|--------|----------|-------|-------------------|
| GET | `/api/admin/logs` | `?user_id=&action_type=&date_from=&date_to=&search=&page=&per_page=` | `{ records[], total, page, total_pages }`; each: `{ id, action_type, action_description, user_name, created_at }` |
| GET | `/api/admin/admins` | — | reused to populate the User filter |

### Data dependencies

- **Reads:** `useLogs`, `useAdmins` (filter).
- **Writes:** none (read-only page).
- **Navigation:** none.

### States

- **Loading:** filter bar enabled; table skeleton rows.
- **Empty:** no logs → "No activity logged yet."; filter no-match → "No log entries match your filters." + Clear.
- **Error:** table retry.

---

*End of Part 3 — admin panel complete (Parts 1–3 cover routes `/admin` through `/admin/logs`). Next deliverables, on your go: the Activator portal (Login · Dashboard · History · Active Requests) and the public Client activation portal.*
