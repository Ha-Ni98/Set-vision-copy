# Activator Portal — Page Assembly Plan (SV-PAGE-002 → 005)

> **Stage 03 · Sub-03 · Phase 01 (Planning).** No code — audit + plan only.
> **Pages:** Login · Dashboard · Activation History · Active Requests · (shared authenticated shell)
> **Routes:** `/login` · `/dashboard` · `/history` · `/requests`
> **Audience:** activator (Setvision employee), **mobile-first**, JWT (all but `/login`), **EN/FR only — no Arabic/RTL** (matches the standing rule)
> **Inputs:** [SV-PAGE-002-005_activator_portal_spec.md](../../../../Stage-00-Conception/Pages-Requirements/SV-PAGE-002-005_activator_portal_spec.md) · [front-end-rules.md](../../../front-end-rules.md) · [front-end-test-rules.md](../../../front-end-test-rules.md) · `@my-app/contract` · existing `Apps/web/src/{pages/{LoginPage,activator/*},components/{layout/Activator*,sections/activator},hooks,lib/realtime.ts}`
> **Governance:** rules = HOW · phase = WHAT/WHEN · contract = WHICH. HOW conflicts resolved toward the rules and noted in §B/§F. **No genuine three-way conflict found** — the spec aligns with the established conventions; the gaps below are the standing "plan against what exists" kind.

---

## A. Session decisions (applied under standing governance — nothing escalated)

Unlike the client portal, this spec agrees with the rules (EN/FR, no RTL, JWT, mobile-first), so no question needed escalation. The judgment calls, all covered by the universal "plan against what exists" decision (used in every prior part):

| # | Point | Decision |
|---|-------|----------|
| 1 | Output granularity | One combined set-level `plan.md`, folder `activator-portal`. |
| 2 | **Already-built MVP** | `pages/activator/*` + `components/sections/activator/*` + `ActivatorLayout/Sidebar/Header` + the Dashboard sparkline exist (Sub-01/Sub-02). **This plan completes them to spec**, not greenfield. |
| 3 | Reduced-fidelity DTOs / realtime | Plan against what exists; log every deviation (§E/§F): Global-Recent columns (E-1), invalidation-only socket → deferred named toasts/bell feed (E-2). |
| 4 | Sound toggle | `useNotificationSound` doesn't exist → small **net-new** hook (localStorage mute + a chime asset) (E-3). |
| 5 | Login redirect | `LoginPage.tsx:35` hardcodes `nav("/dashboard")` with no role check — fold in the **role-based redirect** (activator→`/dashboard`, admin→`/admin`) now that Login is in scope (E-4). |

**Audit headline:** **every data + write hook exists and the core contract DTOs are full-fidelity** — `ActivatorDashboardDTO` matches the Dashboard's 8 stats **exactly**; `ActiveRequestDTO` carries every Active-card field (distributor block, client, account fields, OTP, freeze reason); `ActivatorHistoryItemDTO` + `GetActivatorHistoryQuery` cover Section B fully. The only shortfalls are the **Global-Recent DTO** (2 missing columns), the **invalidation-only socket** (named toasts/bell feed deferred), and a **missing sound hook** — all documented, none blocking. Routes already registered. No new libraries.

---

## B. Cross-cutting resolutions

### B1. Hook-name reconciliation (spec name → real export) — one net-new (`useNotificationSound`)
| Spec calls it | Real export | Note |
|---|---|---|
| `useAuth.login` | `useLogin()` + `AuthProvider`/`useSession()`/`useLogout()` | `LoginCommand { username, password }` |
| `useActivatorStats` | `useMyStats()` → `ActivatorDashboardDTO` | `/activators/me/stats` — full-fidelity (§B3) |
| `useGlobalRecent` | `useRecentActivations()` → `RecentActivationDTO` | **reduced** — no `activatorName`/`activationEmail` (E-1) |
| `useActivatorHistory` | `useMyHistory({ page, limit, status, sortBy, dateFrom, dateTo, search })` → `PaginatedActivatorHistory` | full-fidelity |
| `useActiveRequests` / `usePendingRequests` | `useActiveRequests()` / `usePendingActivations()` | `ActiveRequestDTO[]` (0–3) / `PendingActivationDTO[]` |
| `useTakeRequest` | `useTakeActivation()` | `mutate(id)`; 409 if already taken (§B5) |
| `useFlagWrongInfo` / `useRequestAdditionalInfo` | same names | `{ fields: AccountInformation[] }` |
| `useActivateRequest` / `useCancelRequest` / `useFreezeRequest` | `useActivateRequest()` / `useCancelActivation()` / `useFreezeActivation()` | freeze → `FreezeRequestCommand { reason }` |
| `useActivatorWebSocket` | `connectRoleSocket(UserRole.ACTIVATORS)` + `useRealtimeStatus()` (`lib/realtime.ts`) | **invalidation-only** (§B5, E-2) |
| `useNotificationSound` | **none → net-new** | localStorage mute flag + chime play helper (E-3) |
| `useTheme` / `useLanguage` | `next-themes` / `LanguageProvider` (`ThemeToggle`/`LanguageToggle`) | EN/FR |

### B2. Notation (spec → contract) — resolved toward the contract
- camelCase, `paginated()` `{ items, meta:{page,limit,total,totalPages} }` with **`limit`** (not `per_page`/`records`); `activationId`; account fields are `{ field: AccountInformation, value }` on commands, `{ fieldLabel, value }` on read DTOs.
- **Take race:** `POST /requests/{id}/take` returns **409** when already taken — surface "This request was taken by another activator." + let the socket-driven invalidation drop the row (§B5).
- Auth: `/auth/login` · `/auth/refresh` · `/auth/logout` exist; `VITE_API_URL`/`VITE_WS_URL` carry origins.

### B3. Dashboard stats come from one resolved DTO
`useMyStats()` → **`ActivatorDashboardDTO`** = `{ totalEarnings, earningsTrendPercent, creditsBalance, totalActivations, activationsToday, avgActivationTimeSeconds, activeSlotsUsed, weekly:[{date,count}] }` — maps **1:1** to the four cards + trend% + "+N today" + avg-time tier + slot indicator + 7-day sparkline. **Full fidelity, no summary/list split needed.** Slot count + today stay live via socket invalidation of `qk.activators.myStats()`.

### B4. Forms: co-located schemas
- **`login.schema.ts` → `LoginCommand`** (username required, password required; "Please fill in all fields." on empty). Reuse/align whatever `LoginPage` has today.
- **`freeze-request.schema.ts` → `FreezeRequestCommand`** (`reason` min 1, textarea).
- **Wrong-Info / Request-OTP** are checkbox→array selections, not RHF text forms: a checkbox group over the plan's account fields → `{ fields: AccountInformation[] }` (nonempty). Optional tiny `flag-wrong-info.schema.ts` guard, else inline-validated. Each with a compile-time `AssertAssignable` to its command.
- **Genericity (spec principle):** the account-field set (copyable list, Wrong-Info checkboxes, Request-additional options) is **per-plan**, keyed by the request's plan. Snapchat today = USERNAME/EMAIL/PHONE_NUMBER/PASSWORD (+ OTP requestable). A plan-fields registry drives the Active card's field list + the Wrong-Info/Request-additional pickers.

### B5. Mutations, realtime, toasts (uniform + the invalidation-only reality)
- Global `mutationCache.onError → toast`; pages add step-specific inline errors only where the spec dictates (login 401/429, take 409). Success paths close modals / animate card exit; a failed action leaves the card state unchanged (spec).
- **Realtime is owned globally** (`AuthProvider` connects `connectRoleSocket(ACTIVATORS)` on login / disconnects on logout — pages never manage the socket, per the Part-1 correction). The `/activators` socket handlers **invalidate only** (rules §2): `activation:created`→pending, `:taken`→pending, `:client-updated`→active, `:resolved`→active+myHistory+recent+myStats, `:frozen`→all. So **cards/pool/stats auto-refresh live** ✓.
- **What invalidation-only can't do (E-2):** the payloads carry no client name / event type to the UI, so the spec's **named toasts** ("Client {name} updated their information.", "OTP received from {name}.", "Admin resolved your frozen request.") and the **bell's session-scoped event list** can't be built as written — **deferred** (Part-1 F-6 precedent). Achievable now: the **new-request chime/glow/badge** via a client-side **pending-list diff** (a new id appears → glow + chime-if-unmuted + sidebar badge), and the connection indicator via `useRealtimeStatus()`.

### B6. i18n, theme, mobile-first (no RTL)
- All copy via `useTranslation()`; extend `activator.*` (+ reuse `common.*`, `enums.activationStat.*`). `en`/`fr` real, `ar:""` (reserved — the activator portal is **EN/FR only**, spec-confirmed; **no RTL work**, consistent with the rules).
- Theme dark/light via `next-themes` (reuse `ThemeToggle`). **Mobile-first** (activators work on phones): sidebar → hamburger slide-over with backdrop, auto-close on nav; cards stack full-width; tap-to-call phones; 44×44 touch targets.

### B7. Shared-component reuse map (mostly extend what exists)
| Need | Reuse / status |
|---|---|
| Auth shell | `ActivatorLayout`/`ActivatorSidebar`/`ActivatorHeader` — **exist, extend** (bell, sound toggle, sign-out confirm, pending badge) |
| Pages | `pages/activator/{DashboardPage,HistoryPage,RequestsPage}.tsx` + `components/sections/activator/*` — **exist, complete to spec** |
| Stat cards + loader | `StatCard` + `StatCardSkeleton` |
| 7-day sparkline / charts | the **existing Dashboard chart** (`recharts`) — reuse |
| Tables (desktop) / card lists (mobile) | `DataTable` + its `renderMobileRow` |
| Live timers + speed-tier color | `LiveTimer` + `lib/duration-tone.ts` (`durationToneClass`) — the active-card count-up tiers and pending "waiting" tiers both reuse this |
| Status badges | `StatusBadge` (ActivationStat) |
| Copy-to-clipboard | `CopyButton` (📋 on client phone, key, account fields, OTP) |
| Empty / error+retry | `EmptyState` · `NotFoundState` |
| Pagination / Load-More | `SimplePagination` (desktop) + a mobile "Load More" |
| Debounced search | `useDebouncedValue` |
| Toaster / connection status | `sonner` · `useRealtimeStatus` |

### B8. Optimization
- Routes already lazy (existing setup). `useMemo`: history `ColumnDef[]`, the plan-fields registry lookup, the pending-diff for new-request detection. **Debounce** the history search (~300 ms). Live timers tick locally (no refetch). Realtime is a freshness signal only.

### B9. Net-new artifacts (small)
- **`useNotificationSound`** — `{ muted, toggleMute, playChime }`, `muted` persisted to localStorage; a short chime asset under `public/` (E-3).
- **Login role-based redirect** — replace `nav("/dashboard")` with a role switch (activator→`/dashboard`, admin→`/admin`) reading `session.role` (E-4).
- **Plan-fields registry** for the per-plan account-field set (Active card + Wrong-Info/Request-additional pickers).

---

## C. Auth & authenticated shell (complete to spec)

- **Login (`/login`, public-only):** existing `LoginPage` + `PublicHeader` (EN|FR, dark toggle, logo). Complete: `login.schema.ts`, show/hide password, disabled+spinner in-flight, 401 generic "Incorrect username or password.", **429 lockout "Too many failed attempts. Try again in 5 minutes."**, empty "Please fill in all fields.", network error; **role-based redirect on success** (E-4); no Forgot-Password / Register. CSRF token attached via the existing axios instance if the backend issues one (backend-owned).
- **Authenticated shell (`ActivatorLayout`):** `ActivatorHeader` (logo `<Link>` `/dashboard`, **notification bell**, **sound toggle** (`useNotificationSound`), EN|FR, dark, user menu **Sign Out** = confirm → `useLogout` → socket disconnect (AuthProvider) → `<Link>` `/login`); `ActivatorSidebar` (Dashboard · Active Requests **[pending badge]** · History; active route purple; mobile slide-over + backdrop + auto-close). **Bell = reduced fidelity (E-2):** chrome + `useRealtimeStatus` connection indicator now; live named-event list deferred. Session resolving → spinner; expired → `/login` "Session expired…"; socket drop → "Connection lost. Reconnecting…" toast + backoff, active+pending re-fetched on reconnect (invalidation already wired).

---

## D. Page plans

### D1 — Login · `/login` (SV-PAGE-002)
**Hooks/Forms** — `useLogin()` (`login.schema.ts` → `LoginCommand`); on success role-based redirect (E-4). **Components** — extend existing `LoginPage`: logo, "Activator Login", username, password + show/hide, Log In (disabled+spinner). **States** — loading: spinner + fields disabled; error: 401 generic under form, 429 lockout window, empty fields, network. **Tests** — empty ⇒ inline error, no mutate; 401/429/network branches; valid ⇒ `useLogin.mutate(command)`; success ⇒ redirect by role.

### D2 — Dashboard · `/dashboard` (SV-PAGE-003)
**Hooks** — `useMyStats()` → `ActivatorDashboardDTO`; live via socket-invalidation of `qk.activators.myStats()`. **Components** — *complete existing* `DashboardPage`: 4 `StatCard`s (Total Earnings + `earningsTrendPercent`; Balance Owed = `creditsBalance`; Total Activations + "+`activationsToday` today"; Avg Time mm:ss with green`<5m`/amber`5–10m`/red`>10m` via `durationToneClass`); **"Go to Active Requests"** `<Link>` `/requests`; **7-day sparkline** (reuse existing chart, `weekly[]`); **slot indicator** ("`activeSlotsUsed`/3"). **States** — loading: 4 skeletons + sparkline shimmer; empty (new activator): 0/"—" + "No activity yet" + emphasised quick action; error: section retry. **Tests** — skeletons; values + trend/today/tier from mocked DTO; empty state; retry ⇒ refetch; quick-action link.

### D3 — Activation History · `/history` (SV-PAGE-004)
**Section A — Global Recent (last 10)** — `useRecentActivations()` → `RecentActivationDTO`. **Reduced (E-1):** render Subscription + masked Key + Completed; **`activatorName` + `activationEmail` columns dropped** (not in DTO). Desktop table / mobile cards; live via socket + on-focus; no pagination.
**Section B — Personal History (paginated)** — `useMyHistory({ status, sortBy, dateFrom, dateTo, search, page, limit })` → `ActivatorHistoryItemDTO`. Filters: Status chips (All/Activated/Cancelled-by-me/Removed/Frozen-or-admin-resolved), Sort (newest/oldest/highest-lowest earning/fastest-slowest), date range, **debounced search** (client/key/phone). Columns: Subscription · Client · tap-to-call Phone · Key · State badge · Time (mm:ss) · Earning (backend-computed, not recomputed). Desktop prev/next + "Page N of M"; mobile "Load More".
**States** — A skeleton rows/cards, empty "No activations yet."; B skeleton cards, empty "You haven't completed any activations yet…" + `<Link>` `/requests`, no-match "No activations match your filters." + Clear; per-section retry. **Tests** — A renders 3 present columns (documents E-1 dropped columns); B filters/sort/search mutate query; empty vs no-match+Clear; pagination/Load-More; earning rendered as-is.

### D4 — Active Requests · `/requests` (SV-PAGE-005) — primary working page
**Hooks** — `useActiveRequests()` (0–3 `ActiveRequestDTO`), `usePendingActivations()` (`PendingActivationDTO[]`); writes `useTakeActivation`, `useFlagWrongInfo`, `useRequestAdditionalInfo`, `useActivateRequest`, `useCancelActivation`, `useFreezeActivation`; realtime via the global socket (§B5).
**Section A — My Active Requests (0–3):** *complete existing* — slot indicator (3 blocks from `useActiveRequests().length`; 3/3 + 0/3 messages); **live count-up timer** from `takenAt`, speed-tier colored (`durationToneClass`, green top / amber next / red beyond); status badge (`PROCESSING`→In Progress purple, `WRONG_INFORMATION`→Awaiting Correction red, `ADDITIONAL_INFORMATION`→Awaiting OTP amber-pulse, `FREEZE`→Frozen orange); card body (subscription+key, collapsible distributor block, tap-to-call client 📋, per-plan account fields each 📋, OTP 📋 once `otpValue` present). **Actions** (enabled while `PROCESSING/WRONG_INFORMATION/ADDITIONAL_INFORMATION`; all disabled on `FREEZE`): **Wrong Info** (modal, checkbox per plan account field → `useFlagWrongInfo({fields})`), **Request OTP** (→ `useRequestAdditionalInfo({fields:[OTP]})`; future plans = field picker), **Activate** (→ `useActivateRequest`, exit anim), **Cancel** (confirm → `useCancelActivation`, exit anim), **Freeze** (modal reason → `useFreezeActivation({reason})`, locks card).
**Section B — Pending pool (FIFO):** columns Subscription · masked Key · **live waiting time** (green`<5m`/amber`5–15m`/red`>15m` via `durationToneClass`) · **Activate** (disabled at 3/3); mobile full-width card. **Take race:** `useTakeActivation.mutate(id)`; 409 → toast "This request was taken by another activator." + socket removes the row.
**Realtime (§B5):** cards refresh on `:client-updated`/`:resolved`; pool on `:created`/`:taken`. **New-request** chime+glow+badge via pending-diff (chime gated by `useNotificationSound`). **Deferred (E-2):** the named toasts + cross-page "New request" toast-with-navigate + bell event list.
**States** — loading: slot + active-card skeletons, pool skeletons; empty active → 0/3 "Pick one…"; empty pool → reassuring "😌 No pending requests right now…" + pulsing live dots (never an error); take 409 / action fail → toast, state unchanged; socket drop → shell reconnecting toast + re-fetch on reconnect.
**Tests** — action gating by state (all disabled on FREEZE); each action ⇒ correct mutate (Wrong-Info checkboxes → `{fields}`; Freeze reason → `{reason}`); take ⇒ `useTakeActivation.mutate(id)`, 409 toast; slot-full disables pool Activate; timer tier classes; empty-pool reassuring (not error); a mocked invalidation refreshes cards/pool.

---

## E. Missing hooks / contract DTOs to resolve first (Expected Output)

| # | Gap | Where | Type | Current handling | Recommended upstream fix | Severity |
|---|-----|-------|------|------------------|--------------------------|----------|
| E-1 | `RecentActivationDTO` lacks `activatorName` + `activationEmail` | D3 Section A | contract DTO | render Subscription/Key/Completed; **drop the Activator-Name + Activation-Email columns** | enrich `RecentActivationResponseSchema` with `activatorName` + `activationEmail` | Med |
| E-2 | The `/activators` socket is **invalidation-only** (no event payload/type surfaced) — spec wants named toasts + a session-scoped bell event list | Shell bell + D4 realtime | realtime | live card/pool/stats refresh **works**; **named toasts + bell feed deferred**; new-request chime/glow/badge derived from a pending-diff | add an activator event-feed store (payloads: client name, event type) or `client_updated_info`/`client_submitted_otp`/`admin_resolved_freeze` UI events (Part-1 F-6 sibling) | Med |
| E-3 | No `useNotificationSound` / chime asset | Shell sound toggle | hook + asset | build a small `useNotificationSound` (localStorage mute + play) + add a chime file under `public/` | keep it local (no upstream needed) | Low (net-new) |
| E-4 | `LoginPage.tsx:35` hardcodes `nav("/dashboard")` (no role check) — admins land on the activator dashboard | D1 | existing bug | fix to a **role-based redirect** (activator→`/dashboard`, admin→`/admin`) via `session.role` | none — this is the fix | Med (in scope now) |
| E-5 | Token storage: spec wants httpOnly cookies, but `lib/realtime.ts` passes `?token={jwt}` (needs JS-readable token) | infra | existing infra | out of scope — Sub-02 token infra already built; note only | reconcile cookie-vs-query-token upstream if httpOnly is enforced | Low (existing infra) |

---

## F. Deviations ledger

- **Global Recent** shows 3 columns (Subscription/Key/Completed); **Activator-Name + Activation-Email dropped** (E-1).
- **Realtime cosmetics:** live refresh is full; **named toasts + bell event list deferred** (E-2); new-request chime/glow/badge derived client-side from a pending-diff.
- **Sound toggle** is a small net-new hook + chime asset (E-3).
- **Login redirect** upgraded to role-based (E-4) — folds in the long-flagged bug.
- **Notation:** camelCase `{items,meta}`/`limit`, `AccountInformation` field keys, 409 take-race (§B2) — reconciliations, not reductions.

Everything else in SV-PAGE-002→005 is planned at **full fidelity** against existing hooks + DTOs (Login, the 8 Dashboard stats + sparkline + slots, personal history filters/sort/search/pagination, the full Active-Requests work queue with all six actions + FIFO pool + live timers + take-race).

---

## G. Net-new / extend inventory (for the sprint/execute phase)

- **Net-new:** `useNotificationSound` + chime asset (E-3); `login.schema.ts`, `freeze-request.schema.ts` (+ optional `flag-wrong-info.schema.ts`), each `AssertAssignable`; plan-fields registry (per-plan account-field set); role-based login redirect (E-4).
- **Extend (complete to spec):** `LoginPage` (429/network/redirect); `ActivatorLayout/Sidebar/Header` (bell reduced-fidelity, sound toggle, sign-out confirm, pending badge, mobile slide-over); `DashboardPage` (stats + sparkline + slots + quick action + empty state); `HistoryPage` (Section A reduced + Section B filters/sort/search/pagination + empty/no-match); `RequestsPage` (active cards + all six actions + modals + FIFO pool + live timers + realtime chime/glow).
- **i18n:** extend `activator.*` (shell, login, dashboard, history, requests, action modals, notices) — en/fr real, `ar:""`.
- **Tests:** `/tests/unit/pages/activator/{login,dashboard,history,requests}/*.test.tsx` (hooks + `useTranslation` mocked; `.test.tsx`).
- **Reused (build nothing new):** every hook in §B1, `lib/realtime.ts`, `lib/duration-tone.ts`, `LiveTimer`, `StatCard(Skeleton)`, `DataTable`, `StatusBadge`, `CopyButton`, `EmptyState`/`NotFoundState`, `SimplePagination`, `useDebouncedValue`, `ThemeToggle`/`LanguageToggle`, the existing Dashboard chart, `sonner`, `lib/query-keys.ts`, the `tests/fixtures/wrappers` infra.

---

*End of Activator Portal plan (SV-PAGE-002→005). With this, the full re-spec set is planned at Phase-01: Admin Parts 1–3, the Client portal, and the Activator portal.*
