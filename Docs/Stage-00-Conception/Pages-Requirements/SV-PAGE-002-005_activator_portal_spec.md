# SV-PAGE-002→005 — Activator Portal (Login · Dashboard · History · Active Requests)

> **App:** Setvision Web Application
> **Pages:** Login, Dashboard, Activation History, Active Requests
> **Routes:** `/login`, `/dashboard`, `/history`, `/requests`
> **Auth:** JWT (all pages except `/login`)
> **Primary User:** Activator (Setvision employee) — works heavily on phone, so **mobile-first**
> **Languages:** EN + FR only (no Arabic / RTL in the activator portal)
> **Dark/Light mode:** Yes, persisted in localStorage
> **Source of truth:** new DB schema + scenarios. Backend returns fully resolved DTOs so the front renders without joining or recomputing.

---

## Conventions (same as the admin documents)

- **API output rule:** responses are pre-resolved — subscription labels, distributor store/wilaya/commune names, account-field labels, and per-activation earnings come back ready to render; FKs are never returned raw.
- **Data dependencies:** each page lists the `use[Name]` hooks it reads/triggers, the form fields it collects, and the Command they map to. Interfaces and enum value lists are omitted.
- **Navigation:** only the `<Link>` and its target route are given.
- **States:** every data region defines loading and empty/error.

### Activation lifecycle the activator drives

`PENDING` (in the pool) → activator **takes** → `PROCESSING`. From `PROCESSING` the activator can loop `WRONG_INFORMATION` (flag submitted fields as incorrect) and `ADDITIONAL_INFORMATION` (request a not-yet-supplied field — for Snapchat that is the **OTP**); each client reply returns the request to `PROCESSING`. From any of `PROCESSING / WRONG_INFORMATION / ADDITIONAL_INFORMATION` the activator ends in `ACTIVATED` (card → `ACTIVATED`), `CANCELLED_BY_ACTIVATOR` (a fresh `PENDING` activation is spawned for someone else), or `FREEZE` with a reason (handed to admin, who resolves to `ACTIVATED_BY_ADMIN` / `CANCELLED_BY_ADMIN`). The system auto-releases an inactive request as `REMOVED_FROM_ACTIVATOR`, also spawning a fresh `PENDING`.

The set of account fields the activator sees, copies, can flag, and can request is defined **per subscription plan**, not in the schema. For Snapchat today: submitted = username, email, phone, password; requestable additional = OTP. A future plan ships its own field set with no schema or page-structure change.

---

## Auth flow

```
Login → POST /api/auth/login { username, password }
      → 200: { access_token, refresh_token, role } → role-based redirect (activator → /dashboard)
      → 401: "Incorrect username or password."
      → 429: "Too many failed attempts. Try again in 5 minutes."

Token storage: httpOnly + Secure cookies (preferred), never localStorage
Access TTL: 15 min · silent refresh via POST /api/auth/refresh (backed by the Refresh Token table)
Expiry: redirect /login with "Session expired. Please log in again."
Guard: no valid JWT → /login · valid JWT on /login → /dashboard
```

---

## Authenticated shell (Dashboard / History / Active Requests share it)

```
┌──────────────────────────────────────────────────────────────┐
│ HEADER: Logo | SETVISION   🔔  🔊  EN|FR  🌙  User ▼          │
├──────────┬─────────────────────────────────────────────────────┤
│ SIDEBAR  │  PAGE CONTENT                                       │
│ 📊 Dash  │                                                     │
│ ⚡ Active │  (pending-count badge on Active)                    │
│ 🕐 History│                                                     │
└──────────┴─────────────────────────────────────────────────────┘
Mobile: sidebar → hamburger slide-over with backdrop, auto-closes on nav.
```

- **Header:** logo (`<Link>` `/dashboard`); **notification bell** (live, see below); **sound toggle** (mute/unmute the new-request chime); EN|FR; dark mode; user menu with **Sign Out** (confirm → clear JWT → close WebSocket → `<Link>` `/login`).
- **Notification bell (activator):** fed by `useActivatorWebSocket`. Per the conception it surfaces live events on the activator's own active requests — a client updating their information (correction submitted, OTP supplied) and admin resolutions of a frozen request. No notifications table; the list is session-scoped from the socket.
- **Sidebar:** Dashboard · Active Requests (badge = current pending-pool count) · Activation History. Active route highlighted purple. Mobile: slide-over.
- **Data dependencies (shell):** `useAuth`, `useActivatorWebSocket`, `useNotificationSound`, `useTheme`, `useLanguage`.
- **States (shell):** session resolving → spinner; expired → `/login`; socket drop → "Connection lost. Reconnecting…" toast + exponential backoff, re-fetch active + pending on reconnect.

---

# SV-PAGE-002 — Login

**Route:** `/login` (public; redirect to `/dashboard` if already authenticated)

### UI

```
        [EN | FR]  🌙
          [ LOGO ]
          SETVISION
        Activator Login
   ┌───────────────────────┐
   │ Username              │
   ├───────────────────────┤
   │ Password          👁  │   show/hide toggle
   └───────────────────────┘
   [██████ Log In ██████████]
   ❌ Incorrect username or password.   (generic — never reveals which)
```

| Field | Validation | Maps to |
|-------|------------|---------|
| Username | required | LoginCommand.username |
| Password | required, show/hide | LoginCommand.password |

**Rules:** no "Forgot Password" (contact admin); no "Register" (admin creates accounts); button disabled + spinner while in-flight; CSRF token on submit.

### API

| Method | Endpoint | Input | Output |
|--------|----------|-------|--------|
| POST | `/api/auth/login` | LoginCommand `{ username, password }` | `{ access_token, refresh_token, role }` or 401 / 429 |
| POST | `/api/auth/refresh` | `{ refresh_token }` | rotated tokens |
| POST | `/api/auth/logout` | — | 200 (invalidate refresh token) |

### Data dependencies

- **Writes:** `useAuth.login` (→ LoginCommand).
- **Navigation:** on success → role-based redirect (`<Link>`/router to `/dashboard` for activators).

### States

- **Loading:** button spinner, fields disabled.
- **Empty:** n/a (initial form).
- **Error:** 401 → generic credential error under the form; 429 → lockout message with the wait window; empty fields → "Please fill in all fields."; network fail → "Couldn't reach the server. Check your connection and try again."

---

# SV-PAGE-003 — Dashboard

**Route:** `/dashboard`

### Stats cards

| Card | Shows | Detail |
|------|-------|--------|
| Total Earnings | `total_earning` (DZD) | trend % vs previous period |
| Balance Owed | `credits` (DZD) | what Setvision currently owes the activator |
| Total Activations | `nb_of_successful_activation` | "+N today" |
| Avg Activation Time | backend-derived (mm:ss, `taken_at → completed_at`) | green `<5m` / amber `5–10m` / red `>10m` |

Plus: a **"Go to Active Requests"** quick action, a **7-day sparkline** (activations/day), and a **slot indicator** ("2/3 active slots used"). Mobile: cards stack full-width with large numbers; quick action prominent.

### API

| Method | Endpoint | Input | Output (resolved) |
|--------|----------|-------|-------------------|
| GET | `/api/activator/stats` | — | `{ total_earnings, earnings_trend_percent, credits_balance, total_activations, activations_today, avg_activation_time_seconds, active_slots_used, weekly:[{date,count}] }` |

### Data dependencies

- **Reads:** `useActivatorStats`, `useActivatorWebSocket` (slot count + today's count stay live).
- **Navigation:** "Go to Active Requests" → `<Link>` `/requests`.

### States

- **Loading:** four skeleton cards + sparkline shimmer.
- **Empty:** new activator with no history → cards show 0 / "—", sparkline shows "No activity yet," with the quick action emphasised.
- **Error:** full-section retry ("Couldn't load your stats. Retry.").

---

# SV-PAGE-004 — Activation History

**Route:** `/history`

### Section A — Global Recent Activations (last 10, all activators)

Read-only. **Desktop:** table — Activator Name · Subscription (label) · Key (masked `XXXX-…-AB12`) · Activation Email. **Mobile:** card list. Exactly 10, no pagination, refreshes via WebSocket / on focus.

### Section B — Personal History (paginated)

**Filters & controls**

| Control | Type | Options |
|---------|------|---------|
| Status | chips/dropdown | All · Activated · Cancelled (by me) · Removed (timeout) · Frozen / Admin-resolved |
| Sort | dropdown | Newest (default) · Oldest · Highest earning · Lowest earning · Fastest · Slowest |
| Date range | picker | optional start/end |
| Search | text (debounced 300ms) | client name · key · phone |

**Table (desktop):** Subscription (label) · Client Name · Client Phone (tap-to-call on mobile) · Key (full) · State (color-coded badge) · Activation Time (mm:ss) · Earning (DZD). **Mobile:** card with title + state badge, client, tap-to-call phone + key, time left / earning right. **Pagination:** 10/page; desktop prev/next + "Page N of M", mobile "Load More".

> Earning per row is the per-activation commission already computed by the backend from the achieved speed tier (or the admin override) — the front does not recompute it.

### API

| Method | Endpoint | Input | Output (resolved) |
|--------|----------|-------|-------------------|
| GET | `/api/activations/recent` | — | 10 items: `{ activator_name, subscription_label, key_masked, activation_email, completed_at }` |
| GET | `/api/activator/history` | `?status=&sort_by=&date_from=&date_to=&search=&page=&per_page=` | `{ records[], total, page, total_pages }`; each: `{ id, subscription_label, client_name, client_phone, key, state, duration_seconds, earning, completed_at }` |

### Data dependencies

- **Reads:** `useGlobalRecent`, `useActivatorHistory`, `useActivatorWebSocket` (Section A live refresh).
- **Navigation:** none (history rows are read-only; activators have no activation-detail route).

### States

- **Loading:** Section A skeleton rows/cards; Section B skeleton cards.
- **Empty:** Section A → "No activations yet."; Section B no history → "You haven't completed any activations yet. Head to Active Requests to get started!" with a `<Link>` `/requests`; filter no-match → "No activations match your filters." + Clear Filters.
- **Error:** per-section retry.

---

# SV-PAGE-005 — Active Requests (primary working page)

**Route:** `/requests`

```
┌──────────────────────────────────────────┐
│ MY ACTIVE REQUESTS (max 3)               │
│ Slots: [●][●][○]  2/3 used               │
│ ┌─ Card ───────────────────────── 02:34 ┐│
│ │ Snapchat Plus — 01 Month  🟣 In Progress│
│ │ Key: ABCD-EFGH-IJKL-MNOP              ││
│ │ Distributor: TechShop · Algiers · …   ││
│ │ Client: Mohamed Ali · 0551234567 📋   ││
│ │ Account: user 📋 · mail 📋 · phone 📋 ││
│ │          pass 📋 · (OTP 📋 once given)││
│ │ [Wrong Info] [Request OTP] [Activate] ││
│ │ [Cancel] [Freeze]                     ││
│ └───────────────────────────────────────┘│
├──────────────────────────────────────────┤
│ PENDING POOL (oldest first)              │
│ Subscription | Key | Waiting | [Activate]│
└──────────────────────────────────────────┘
```

### Section A — My Active Requests (work queue, 0–3)

- **Slot indicator:** 3 blocks; 3/3 → "Max active requests reached. Complete, cancel, or freeze one to take another."; 0/3 → "No active requests. Pick one from the pending pool below."
- **Live timer (top-right):** counts up from `taken_at`, **color-coded by the commission speed tiers** (green = top tier, amber = next, red = beyond the last tier) so the activator sees their earning tier as it slips. Inactivity auto-release (`REMOVED_FROM_ACTIVATOR`) is enforced by the backend per the Settings timeout.
- **Status badge (top-left):** `PROCESSING` → "In Progress" (purple) · `WRONG_INFORMATION` → "Awaiting Correction" (red) · `ADDITIONAL_INFORMATION` → "Awaiting OTP" (amber, pulsing) · `FREEZE` → "Frozen — Admin Review" (orange).
- **Card body (all resolved):** subscription label + key; distributor store/wilaya/commune (collapsible); client name + tap-to-call phone (📋); account fields for the plan, each plain-text + 📋 copy (Snapchat: username, email, phone, password; OTP appears with 📋 once the client supplies it). Passwords are shown as ordinary copyable text — no purge/cache rules.

#### Action buttons (availability by state)

```
Wrong Info        opens a modal with a checkbox per submitted account field
                  (Snapchat: username / email / phone / password)
                  → FlagWrongInfoCommand → state WRONG_INFORMATION
                  → client page re-opens those fields for correction

Request OTP       Snapchat's "additional info" action (single field today)
                  → RequestAdditionalInfoCommand(OTP) → state ADDITIONAL_INFORMATION
                  → client page shows the OTP input; reply returns to PROCESSING
                  (future plans render a field picker instead of a fixed OTP button)

Activate          → state ACTIVATED, card → ACTIVATED, card leaves the queue (exit anim)

Cancel            confirm → state CANCELLED_BY_ACTIVATOR; a fresh PENDING activation is
                  spawned and reappears in the pool; card leaves the queue

Freeze            modal with a reason textarea → FreezeRequestCommand
                  → state FREEZE; actions lock; card shows "Frozen — Admin Review";
                  leaves the queue once admin resolves
```

`Wrong Info`, `Request OTP`, `Activate`, `Cancel`, `Freeze` are available while the request is `PROCESSING / WRONG_INFORMATION / ADDITIONAL_INFORMATION`. A `FREEZE` card has all actions disabled until the admin resolves it.

#### Real-time on active cards

| Event | Card update | Notification |
|-------|-------------|--------------|
| Client corrects flagged info | card refreshes resolved values, badge → "In Progress" | bell + toast "Client {name} updated their information." |
| Client supplies OTP | OTP value appears (copyable), badge → "In Progress" | bell + sound + toast "OTP received from {name}." |
| Admin resolves a freeze | card updates to the admin outcome, then leaves the queue | toast "Admin resolved your frozen request." |

### Section B — Pending pool

- **Columns (desktop):** Subscription (label) · Key (masked, last 4) · Waiting Time (live, since `requested_at`; green `<5m` / amber `5–15m` / red `>15m`) · Action ("Activate", disabled at 3/3 slots). **Sort:** fixed oldest-first (FIFO). **Mobile:** card with full-width Activate.
- **Take race condition:** backend take is atomic; the winner gets the card in their queue, the loser sees "This request was taken by another activator." and the row is removed via socket. Never double-assigned.
- **New request:** arrives via socket → prepends with a purple glow + chime (mutable) → sidebar badge updates; on another page (mobile) → push-style toast "New activation request available!" with tap-to-navigate.

### API

| Method | Endpoint | Input | Output (resolved) |
|--------|----------|-------|-------------------|
| GET | `/api/activator/active-requests` | — | 0–3 items: `{ id, subscription_label, key, taken_at, state, distributor:{store_name,wilaya_name,commune_name}, client_name, client_phone, account_fields:[{field_label,value}], otp_value, freeze_reason }` |
| GET | `/api/activator/pending` | — | pool: `{ id, subscription_label, key_masked, requested_at }` |
| POST | `/api/requests/{id}/take` | — | the active request, or 409 if already taken |
| POST | `/api/requests/{id}/flag-wrong-info` | FlagWrongInfoCommand `{ fields[] }` (account-field keys) | 200 → `WRONG_INFORMATION`; creates `Wrong information` rows (value null until corrected) |
| POST | `/api/requests/{id}/request-additional` | RequestAdditionalInfoCommand `{ fields[] }` (Snapchat: OTP) | 200 → `ADDITIONAL_INFORMATION`; creates `Additional information` row(s) |
| POST | `/api/requests/{id}/activate` | — | 200 → `ACTIVATED`, card → `ACTIVATED` |
| POST | `/api/requests/{id}/cancel` | — | 200 → `CANCELLED_BY_ACTIVATOR`; spawns fresh `PENDING` |
| POST | `/api/requests/{id}/freeze` | FreezeRequestCommand `{ reason }` | 200 → `FREEZE` |
| WS | `/ws/activator?token={jwt}` | — | `new_pending_request`, `request_taken`, `request_released`, `client_updated_info`, `client_submitted_otp`, `admin_resolved_freeze`, `request_completed` |

### Data dependencies

- **Reads:** `useActiveRequests`, `usePendingRequests`, `useActivatorWebSocket`.
- **Writes:** `useTakeRequest`, `useFlagWrongInfo` (→ FlagWrongInfoCommand), `useRequestAdditionalInfo` (→ RequestAdditionalInfoCommand), `useActivateRequest`, `useCancelRequest`, `useFreezeRequest` (→ FreezeRequestCommand).
- **Navigation:** none leaves the page; the cross-page "new request" toast taps through to `/requests`.

### States

- **Loading:** slot indicator + active cards skeleton; pending pool skeleton rows/cards.
- **Empty:** no active requests → slot indicator at 0/3 with "Pick one from the pending pool below."; empty pool → reassuring (not error) "😌 No pending requests right now. We'll notify you when one comes in." with subtle pulsing dots showing the system is live.
- **Error:** take 409 → toast + row removed; any action failure → toast, card state unchanged; socket drop → shell "reconnecting" toast, then active + pending re-fetched on reconnect.

---

*End of the Activator portal. Final deliverable, on your go: the public Client activation portal (SV-PAGE-001) — key entry, the per-plan account form, the WRONG_INFORMATION / ADDITIONAL_INFORMATION (OTP) re-submit flow, and the activated / failed end states gated by `is_active`.*
