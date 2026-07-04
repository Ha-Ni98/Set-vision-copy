# Activator Portal — Page Assembly Sprint Plan (SV-PAGE-002 → 005)

> **Stage 03 · Sub-03 · Phase 02 (Sprint Planning).** No code yet — a build playbook.
> **Source plan:** [results/activator-portal/plan.md](./plan.md) · **Phase file:** [stage-03-sub-03-phase-02-sprints.md](../../stage-03-sub-03-phase-02-sprints.md) · **Rules:** [front-end-rules.md](../../../front-end-rules.md), [front-end-test-rules.md](../../../front-end-test-rules.md) · **Contract:** `@my-app/contract`
> **Governance:** rules = HOW · phase = WHAT/WHEN · contract = WHICH. HOW conflicts resolved toward the rules/explicit instruction and noted.

---

## Ordering & program shape

Required global order: **Foundation → Primitives & States → Assembly & Wiring → Polish → Tests**. This is **4 pages + a shared authenticated shell**, **already largely built** (Sub-01/Sub-02 MVP) — so most work is *complete-to-spec*, not create. Assembly splits in two around the one heavy page (**Active Requests** — 6 actions + modals + live timers + FIFO pool + take-race + realtime), leaving the three lighter pages together. **Six sprints, five phases:**

| Phase | Sprints | Scope |
|-------|---------|-------|
| 1 · Foundation | **S1** | schemas · plan-fields registry · `useNotificationSound` (net-new) · i18n · role-based login redirect |
| 2 · Primitives & States | **S2** shell + all 4 pages | complete/extend dumb components, skeletons, empty/error, action modals |
| 3 · Assembly & Wiring | **S3** Login + Dashboard + History · **S4** Active Requests | page components, `useQuery`/`useMutation`, realtime |
| 4 · Polish | **S5** | **mobile-first** responsive, a11y, dark mode, animations |
| 5 · Tests | **S6** | all 4 pages, `/tests/unit/pages/activator/**` with `vi.mock` on hooks |

**Dependency spine:** S1 → S2 → {S3, S4} → S5 → S6. Assembly split by weight — **Active Requests** (the primary working page: `useTake/Flag/RequestAdditional/Activate/Cancel/Freeze`, two modals, 0–3 slot queue, FIFO pool, 409 take-race, realtime chime/glow) earns **S4** alone; **Login + Dashboard + History** (one form, one stats DTO, two history sections) share **S3**.

> Smaller than the admin parts (mostly complete-to-spec). Lever if wanted: merge S3+S4 for ~5 (only if Active Requests proves light — unlikely).

### Execution protocol (applies to every sprint)
- **Per-sprint gates (non-negotiable, in each Validation block):** ① no inline JSX strings — all copy via `useTranslation` (plan §B6); ② `tsc --noEmit` clean (both configs); ③ no `useEffect` for fetching (rules §2 — realtime is invalidation via the query layer, not fetch-in-effect); ④ layout survives loading/error with a **localized** fallback (the shell never crashes; session-resolving spinner is the only full-screen state); ⑤ existing Vitest suite stays green; ⑥ no test files under `/src`.
- **Tests-last:** page `.test.tsx` files are authored in **S6**; S2–S5 keep the existing suite green plus gates ①–④. Build test-ready (props-driven, hooks isolable).
- **Commit convention (project memory):** on green, `git add` **the touched paths only** then commit `Sprint N: <Title>` — no co-author trailer; update docs (this file's Status + the sprint report) first. **Never `git add .`** (keep the untracked `Docs/Stage-00-Conception/react-algeria-map` unstaged).
- **Guardrails from the plan (the §F deviations are intentional — do NOT "fix" them):**
  - **Complete/extend the existing MVP** (`pages/activator/*`, `components/sections/activator/*`, `ActivatorLayout/Sidebar/Header`, the Dashboard sparkline) — do not rebuild from scratch.
  - **Realtime is invalidation-only and `AuthProvider`-owned** — pages never manage the socket. Live card/pool/stats refresh via invalidation is the mechanism; **do not fabricate** the deferred named toasts / bell event-list (E-2). The new-request chime/glow/badge is derived client-side from a **pending-list diff**.
  - **Global Recent** renders 3 columns; **do not invent** `activatorName`/`activationEmail` (E-1, not in the DTO).
  - **EN/FR only, no RTL** (spec-confirmed) — `ar:""` stays; no `dir` work.
  - Missing contract data is an upstream fix (plan §E), never a local patch (rules §2).
- **Naming reconciliations locked (plan §B1/§B2):** `useMyStats`/`useRecentActivations`/`usePendingActivations`/`useTakeActivation`/`useCancelActivation`/`useFreezeActivation` (not the spec's `useActivatorStats`/`useGlobalRecent`/`usePendingRequests`/`useTake|Cancel|FreezeRequest`); `useActivatorWebSocket` = `connectRoleSocket(ACTIVATORS)` + `useRealtimeStatus`; camelCase `{items,meta}`/`limit`; `AccountInformation` field keys; test files `.test.tsx`.
- **Page-specific:** **mobile-first** (activators work on phones); JWT (all but `/login`).
- **Status legend:** ⬜ Pending · 🟨 In progress · ✅ Done.

---

## PHASE 1 — FOUNDATION

### Sprint 1: Foundation — Schemas, sound hook, i18n & role-based login redirect   — Status: ✅ Done

**Goals**
- The login/freeze schemas + plan-fields registry exist; `useNotificationSound` (net-new) works; all activator copy present (`en`/`fr` real, `ar:""`); the login redirect is role-based. `tsc` + existing suite green.

**Tasks**
- [x] Schemas (#schema), each `AssertAssignable` to its command: `login.schema.ts` (→ `LoginCommand`, `pages/login.schema.ts`); `freeze-request.schema.ts` (→ `FreezeRequestCommand`, `components/sections/activator/`); `flag-wrong-info.schema.ts` (→ `FlagWrongInfoCommand`, `{fields}` nonempty, same dir) — built (not left optional), matching the established co-located-schema convention.
- [x] Plan-fields registry (#ui): `components/sections/activator/plan-fields.ts` — `correctableFields(subscriptionLabel)` / `requestableFields(subscriptionLabel)`, keyed by subscription label (the only plan identifier the DTOs carry, not a `planKey`/id). Snapchat+ = collected USERNAME/EMAIL/PHONE_NUMBER/PASSWORD, requestable OTP.
- [x] `useNotificationSound` (#state, net-new): `{muted, toggleMute, playChime}`, `muted` persisted to localStorage (`sv_notif_muted`). **Chime synthesized via Web Audio API** (two-tone oscillator beep), not a shipped asset file — user-approved deviation from "asset under `public/`" (no `public/` dir existed yet; avoids sourcing/licensing a binary asset for a 0.4s beep).
- [x] i18n (#i18n): added `auth.login.{emptyFields,lockout,network}` (3 keys) and `activator.shell.{soundOn,soundOff,connectionLost,sessionExpired}` (4 keys) — the concrete, unambiguous additions Sprint 1's own scope needs (login validation/lockout/network, shell sound-toggle/connection). **Scoping note**: dashboard/history/requests/action-modal copy is intentionally deferred to Sprint 2 (Primitives) rather than front-loaded here — unlike Admin Part 3's greenfield Sprint 1 (nothing existed, so all copy had to be invented upfront), this portal's pages are already 80%+ built; several existing keys (`activator.requests.card.done*`/`release*`) will be *replaced*, not just supplemented, once Sprint 2 rebuilds the Active-card actions to match the spec's real Activate/Cancel semantics (see Sprint 4 risk note below) — inventing their final replacement copy now, before that rebuild, risked producing keys that don't fit.
- [x] Login redirect (#infra, E-4) — **user-decided architecture**: rather than adding an explicit role-based `nav()` call in `LoginPage.tsx` (the plan's literal wording), fixed `PublicOnlyRoute` (`ProtectedRoute.tsx`) to branch on `session.role` and **removed** `LoginPage`'s `nav("/dashboard")` entirely — the guard's reactive `<Navigate>` now handles both "already authenticated, hit `/login` directly" and "just logged in" cases from one place, matching this codebase's own documented preference for declarative route guards over imperative `useEffect`+`navigate()` (`ProtectedRoute.tsx`'s existing top comment). **Found the identical bug in `PublicOnlyRoute` itself** (hardcoded `<Navigate to="/dashboard">` for any authenticated user hitting `/login`, no role check) while investigating E-4 — not explicitly named in the plan's E-4 gap (which only cited `LoginPage.tsx:35`), fixed as the same class of bug.

**Validation**
- [x] No inline strings. / [x] `tsc` clean (both configs). / [x] Schemas assignable to their commands (compiles). / [x] `useNotificationSound` persists mute (localStorage); chime plays via Web Audio synthesis (approved deviation, no asset file). / [x] Role-based redirect verified via Playwright against the live dev API for **both** roles and **both** trigger paths (post-login redirect + already-authenticated direct `/login` hit): activator → `/dashboard`, admin → `/admin` in all four cases. / [x] Existing Vitest green (54/54 files, 393/393 tests); no `/src` tests. / [x] Committed on green (scoped add).

**Risks**
- Touching `LoginPage`'s redirect — confirmed both roles route correctly and `PublicOnlyRoute` still bounces authed users off `/login` (to their own role's home, not just `/dashboard`) — verified live, not just by reading the code.
- **Carried forward to Sprint 4**: `ActiveRequestCard.tsx`'s existing "Cancel" button actually calls `useReleaseActivation` (`RELEASE` endpoint, puts the card back in the pending pool) instead of `useCancelActivation` (`CANCEL` endpoint, terminal `CANCELLED_BY_ACTIVATOR` state) — confirmed against the spec doc (`SV-PAGE-002-005_activator_portal_spec.md` line 272: `POST /api/requests/{id}/cancel` → `CANCELLED_BY_ACTIVATOR`) and the sprint plan's own D4 wording (`useCancelActivation`). A real bug, not touched this sprint (out of Foundation's scope) — flagged for Sprint 4's Active-card rewiring.

---

## PHASE 2 — PRIMITIVES & STATES

### Sprint 2: Primitives & States — shell + all four pages   — Status: ✅ Done

**Goals**
- Every shell + page dumb-component renders from props with loaders + localized empty/error; action modals exist statically; no hooks/mutations/realtime wiring yet. `tsc` + existing suite green.

**Tasks** *(all #ui; complete/extend existing, test-ready)*
- [x] Shell: `ActivatorHeader` — added the **sound-toggle button** (`useNotificationSound`, `Volume2`/`VolumeX` icon swap, aria-label reflects state); notification bell chrome, EN|FR, dark, user-menu Sign-Out confirm were all already complete, untouched. **Connection-indicator deliberately not added here** — the plan's own Sprint 4 task list explicitly owns "connection indicator via `useRealtimeStatus`" separately from Sprint 2's "connection-indicator slot" wording; wiring a live hook into the shell now would preempt that split, so the bell's chrome alone is this sprint's "slot." `ActivatorSidebar`'s active-route purple highlight, mobile slide-over+backdrop+auto-close, and pending badge were all already present — **kept the badge showing the activator's own active-request count** (not the global pending-pool count) per the existing `§8.Q5` decision already documented in that file's own comment; reconsidered but found no evidence in this sprint's scope that overrides it. `ActivatorLayout` needed no changes (the session-resolving spinner is already `ProtectedRoute`'s job, not the layout's).
- [x] Login: **already fully satisfied by Sprint 1's work** (429/network/empty error branches, translated inline validation, show/hide password, disabled+spinner submit were all built while fixing the E-4 redirect) — no additional Sprint 2 changes needed.
- [x] Dashboard: added the missing empty/new-activator state (`isNewActivator = totalActivations === 0` → `EmptyState` swapped in for the weekly chart, "No activity yet" + emphasized **filled** (not outline) "Go to Active Requests" button). The 4 stat cards, sparkline, and slot indicator were already complete.
- [x] History: added Section A's missing empty state ("No activations yet."); split Section B's single "no match" message into two — a true first-time-empty state ("You haven't completed any activations yet…" + `<Link>` to `/requests`) vs. a filtered-no-match state (existing message + new **Clear** button); added the missing **date-range filter** (`dateFrom`/`dateTo`, wired into `GetActivatorHistoryQuery`); added the missing **Fastest/Slowest** sort options (client-side, alongside the existing Newest/Oldest/Highest-Earning — §8.Q3's client-side-sort-over-the-page approach carries over, since the contract's `sortBy` has no separate asc/desc direction field); added retry actions to both sections' error states (previously had none); tap-to-call added to Section B's phone column.
- [x] Active Requests: rewrote `ActiveRequestCard` — added the **collapsible distributor block** (was always-expanded), **tap-to-call** client phone, and the missing **OTP row** (was entirely absent — `otpValue` is a separate DTO field from `accountFields`, never rendered before). **Replaced two wrong action bindings** (see Decisions): the email-collecting "Done" modal → a direct single-click Activate button (no modal, matching the spec's terse "no confirm" wording exactly); "Release" (wrong endpoint) → real Cancel (confirm dialog, `CANCELLED_BY_ACTIVATOR` semantics). `WrongInfoModal`/`FreezeModal` now use the Sprint 1 schemas and the plan-fields registry instead of a hardcoded field list. Added the missing "3/3 full" slot notice and retry actions to `RequestsPage`'s error states.

**Validation**
- [x] Every region renders from props (existing hook-driven pages kept their real wiring — see Decisions on why this sprint didn't strip hooks back to fully static); all states present + localized. / [x] Bell shows chrome only, no fabricated feed (connection indicator explicitly deferred to S4). / [x] No inline strings; no *new* fetching introduced (existing hook calls untouched). / [x] `tsc` clean (both configs); existing Vitest green (54/54, 392/392 — one fewer than baseline from deleting the now-dead `useReleaseActivation` test case). / [x] Committed on green (scoped add, per this portal's own "never `git add .`" convention).

**Risks**
- Active-card action buttons must expose a gating prop (by state) for S4; name the modal fields now. → **Resolved**: `isFrozen = req.state === ActivationStat.FREEZE`, computed directly from the DTO's own state (not a one-way local flag), gates every action button — ready for S4 to build on without further restructuring.
- `DataTable` renders desktop+mobile together in JSDOM (S6 disambiguation). → Unchanged, noted for S6.

---

## PHASE 3 — ASSEMBLY & WIRING

### Sprint 3: Assembly & Wiring — Login + Dashboard + History   — Status: ✅ Done

**Goals**
- Login authenticates + redirects by role; Dashboard renders live stats; History Sections A & B fully live with filters/sort/search/pagination. Layout survives loading/error. `tsc` + existing suite green.

**Tasks**
- [x] Login (#wiring #forms): `useLogin` (`login.schema.ts`) → role-based redirect (E-4); 401 generic / 429 lockout / empty / network inline errors; disabled+spinner in-flight. **Already fully wired since Sprint 1** — verified live (bad-password ⇒ inline error, no navigation; valid ⇒ redirect to `/dashboard`), no changes needed this sprint.
- [x] Dashboard (#wiring): `useMyStats()` → `ActivatorDashboardDTO` → cards + trend/today/tier + slot indicator + sparkline (`weekly[]`); live via socket-invalidation of `qk.activators.myStats()` (already wired in `lib/realtime.ts`); empty/new-activator state (Sprint 2); section retry. **Gap found and fixed**: the DTO's `creditsBalance` field (plan D2's "Balance Owed" 4th stat card) was never rendered at all — only 3 of the spec's 4 cards existed. Added the missing `StatCard` (Wallet icon, `formatDZD`), regridded `md:grid-cols-3` → `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` (skeleton grid too), added the retry action to the error state (`NotFoundState` had no `action` prop at all before — every other page's error state already had one).
- [x] History Section A (#wiring): `useRecentActivations()` → 3 columns (E-1); live via invalidation + on-focus. **Gap found and fixed**: socket-invalidation already existed, but "on-focus" (plan D3's explicit wording) didn't — the query client's global default is `refetchOnWindowFocus: false`. Added `refetchOnWindowFocus: true` directly on this one hook (the only query in the codebase that needs it, since it has no per-viewer filter to go stale against).
- [x] History Section B (#wiring): `useMyHistory({ status, sortBy, dateFrom, dateTo, search, page, limit })` with `useDebouncedValue` search; Status chips / Sort / date-range / pagination (desktop prev-next + "Page N of M", mobile Load-More); empty vs no-match+Clear; earning rendered as-is (not recomputed). **Gap found and fixed**: `q` was going straight into the query's `useMemo` on every keystroke (a request per character) — Sprint 2 had wired the search box but never applied `useDebouncedValue`, despite the plan naming it explicitly. Fixed by debouncing the value before it reaches the query (live-verified: typing 3 fast characters now fires exactly 1 request, not 3); `hasFilters`/Clear still read the raw (non-debounced) input, matching the existing Admin-page convention (`ActivationsPage.tsx`) for that distinction.
- [x] `useMemo` history `ColumnDef[]` — already done in Sprint 2 (unchanged).

**Validation**
- [x] Login: empty ⇒ no mutate; 401/429/network branches; valid ⇒ `useLogin.mutate` + role redirect — live-verified (bad password → inline error, url unchanged; valid → `/dashboard`). / [x] Dashboard values/tier/sparkline from mocked DTO; retry ⇒ refetch — live-verified, all 4 cards render (Balance Owed included) + retry button present. / [x] History filters/sort/search mutate query; empty/no-match — live-verified, debounce confirmed via request-count. / [x] No `useEffect` fetching (the one `useEffect` touched, `useDebouncedValue`, is a value-debounce, not a fetch — pre-existing codebase-wide pattern). / [x] `tsc` clean (both configs); existing Vitest green (54/54, 392/392, unchanged). / [x] Committed on green.

**Risks**
- Status-chip → `GetActivatorHistoryQuery.status` mapping (All = no param; Frozen/Admin-resolved may fold multiple states — map per contract enum). **Resolved by inspection, not by asking**: the contract's `status` param takes exactly one `ActivationStat` value with no array/OR support, so a spec-literal "Frozen-or-admin-resolved" folded chip can't be expressed as a single server-side filter without either dropping fidelity (silently missing some of the folded states) or client-side re-filtering across pages (breaks the server's own pagination/total). The pre-existing implementation (inherited from the MVP, untouched by Sprint 2 or this sprint) instead exposes the 10 raw `ActivationStat` values 1:1 via a dropdown — less "friendly" than 5 grouped chips, but exactly and transparently what the contract can support. Documented here as a carried-forward deviation rather than raised as a blocking question, since the underlying constraint (single-value filter param) isn't a judgment call — no chip-grouping choice would change what the backend can actually filter by.

---

### Sprint 4: Assembly & Wiring — Active Requests (primary page)   — Status: ✅ Done

**Goals**
- The work queue fully live: 0–3 active cards with all six actions + modals + live speed-tier timers, the FIFO pending pool with take-race handling, and realtime refresh + new-request chime/glow. Layout survives loading/error. `tsc` + existing suite green.

**Tasks**
- [x] Active cards (#wiring): `useActiveRequests()` → cards; slot indicator from length; **live count-up timer** from `takenAt`, speed-tier colored (`durationToneClass`); status badges; plan-fields registry drives the copyable field list + OTP. **Already fully wired since Sprint 2** — `LiveTimer` already applies `toneClass` for both card modes. **Gap found and fixed**: `useActivateRequest`'s success toast referenced a stale i18n key (`activator.requests.card.doneToast`) removed in Sprint 2's rename to `activateToast` — the toast would have literally rendered the raw key string. Also wired the Request-OTP button through `requestableFields(req.subscriptionLabel)` (the plan-fields registry) instead of a hardcoded `[AccountInformation.OTP]` literal — same value today, but now genuinely "registry-driven" per the task wording, and no longer dead code.
- [x] Actions (#wiring #forms): gating + all 5 card-level mutations already correctly wired since Sprint 2 (`isFrozen` derived from `req.state`; Wrong-Info/Freeze/Request-OTP/Activate/Cancel all bound to the right hooks with the right payload shapes) — verified against the task's own payload checklist, no changes needed.
- [x] Pending pool (#wiring): `usePendingActivations()` FIFO + live waiting timer + 3/3-disable were already wired since Sprint 2. **Gap found and fixed — 409 take-race**: `useTakeActivation` had no `onError` at all, so a take-race would have surfaced the backend's raw `"Activation is no longer pending"` via the global generic-toast, not the spec's specific wording. Added a local `onError` (409 → `activator.requests.takeRaceToast` = "This request was taken by another activator."; anything else → the same generic message the global toast would have shown) plus `meta: { silentErrorToast: true }` so only one toast fires, not two. Row removal was **already correct** with no change needed — the winner's successful take broadcasts `activation:taken`, which every connected activator's socket (including the loser) already invalidates `qk.activations.pending()` on.
- [x] Realtime (#wiring, E-2): cards/pool/stats auto-refresh via the global socket invalidation — already wired. **Gaps found and fixed**: (1) new-request **chime + a functional highlight** via a pending-id diff, added to `RequestsPage.tsx` (tracks the previous id set in a ref, only fires on a genuine arrival, not initial load or refetch churn per the plan's own risk note; chime via `useNotificationSound().playChime()`, which already no-ops while muted) — the full "purple glow" **animation polish + reduced-motion handling is explicitly Sprint 5's job** (the plan splits chime/glow/badge *detection* from glow *animation polish* across S4/S5), so this sprint's highlight is a plain, functional `bg-primary-light` fade via `DataTable`'s new optional `getRowClassName` prop, not the final animation. (2) **connection indicator via `useRealtimeStatus`**, added to `ActivatorHeader`'s bell (reconnecting dot + dropdown text), mirroring Admin's existing `NotificationBell` pattern exactly. (3) **reconnect toast + re-fetch on reconnect**, added to `lib/realtime.ts`'s `attachActivatorNamespaceListeners`: a `disconnect` handler shows `activator.shell.connectionLost` (skipped for an intentional logout disconnect, detected via socket.io's own disconnect reason), and a `connect` handler invalidates active+pending so a reconnect after a missed-events window is caught up. **Correction, not a new decision**: the sidebar's badge was showing the activator's **own active-request count** — Sprint 2's report justified this via a "pre-existing §8.Q5 decision" that, on inspection this sprint, **does not exist** (§8.Q5 in `codebase-map.md` is about the `/3` slot-cap constant, unrelated). The spec (line 61) is explicit: "badge = current pending-pool count." Fixed `ActivatorSidebarNav` to read `usePendingActivations()` instead of `useActiveRequests()` — this also is the "badge" Sprint 4's own task list means by "chime/glow/**badge** via a pending-list diff."

**Validation**
- [x] Action gating correct (all disabled on FREEZE); each action ⇒ correct mutate (Wrong-Info `{fields}`, Freeze `{reason}`, Request-OTP `{fields}` via registry). / [x] Take ⇒ `useTakeActivation.mutate(id)`; 409 → specific toast, row removed via existing socket invalidation; pool Activate disabled at 3/3 — unchanged, already correct. / [x] Timers show tier classes (unchanged, already correct) — new-request chime respects mute (`playChime()`'s own internal no-op-while-muted). / [x] Empty pool is reassuring, not an error (unchanged, already correct). / [x] No `useEffect` fetching (the pending-diff `useEffect` derives a side-effect from already-fetched data, same class as `LiveTimer`'s own interval effect — not a fetch). / [x] `tsc` clean (both configs); existing Vitest green (54/54, 392/392, unchanged — no page tests yet, that's S6). / [x] Committed on green.
- **Live Playwright verification**: bell shows "No notifications yet" / no badge while connected and idle (regression-checked after the badge-source change). Killed the live dev API mid-session to force a real socket drop: confirmed the toast **"Connection lost. Reconnecting…"** appears, the bell shows its reconnecting dot + "Reconnecting…" text, then restarted the API and confirmed the socket auto-reconnects (default socket.io backoff, no code needed). Did **not** attempt a live end-to-end take-race or new-arrival chime/glow test — manufacturing two simultaneous activators taking the same real seeded pending activation is disproportionate for this sprint's verification (mirrors Sprint 2's own judgment call on the Active-card visuals); that behavior is code-reviewed here and will be exercised deterministically via mocked hooks in Sprint 6.

**Risks**
- Pending-diff for new-request detection — track prior ids; avoid chiming on the initial load or on refetch churn. → **Resolved**: the ref starts `null` and the first effect run only seeds it (no comparison), so the initial load never chimes; the diff is by id-set membership, so a refetch returning the identical set (churn) produces an empty `arrived` list and no chime.
- Card exit animation vs invalidation-driven list change — coordinate so a removed card animates out cleanly. → Unchanged, still Sprint 5's job (no exit animation exists yet for Activate/Cancel — that's explicitly on Sprint 5's own task list).

---

## PHASE 4 — POLISH

### Sprint 5: Polish — mobile-first responsive, a11y, dark mode, animations   — Status: ⬜ Pending

**Goals**
- Mobile-first pass (the activator works on a phone), a11y on the work queue + forms, dark mode, and the card/pool animations. No behavior change. `tsc` + existing suite green.

**Tasks**
- [ ] Responsive (#responsive): sidebar → hamburger slide-over + backdrop, auto-close on nav; cards stack full-width with large numbers; **tap-to-call** phone links; **44×44** min touch targets; pending pool full-width Activate on mobile; no horizontal scroll.
- [ ] a11y (#a11y): `aria-label`s on icon-only actions (📋 copy, bell, sound toggle, action buttons), status badges announced, modal focus traps, form labels/aria-invalid; live-region for the reconnecting toast.
- [ ] Dark mode + anims (#theming): all views read in dark/light (semantic tokens); card **exit animation** (Activate/Cancel), new-request **purple glow**, OTP badge pulse — reduced-motion-safe.
- [ ] Memoization (#perf): history columns, plan-fields lookup, pending-diff — only where plan §B8 calls for it.

**Validation**
- [ ] No inline strings introduced. / [ ] `tsc` clean; existing Vitest green. / [ ] No behavior change; pre-existing out-of-scope issues untouched. / [ ] Committed on green.

**Risks**
- Scope creep — flag, don't fix, adjacent pre-existing issues.

---

## PHASE 5 — TESTS

### Sprint 6: Unit Tests — Login · Dashboard · History · Active Requests   — Status: ⬜ Pending

**Goals**
- One `.test.tsx` per page under `/tests/unit/pages/activator/**`, hooks + `useTranslation` mocked (no MSW). All green; both tsconfigs clean.

**Tasks**
- [ ] `login/LoginPage.test.tsx` (#testing): empty ⇒ inline error, no mutate; 401/429/network branches; valid ⇒ `useLogin.mutate(command)`; success ⇒ role-based redirect (activator vs admin).
- [ ] `dashboard/DashboardPage.test.tsx` (#testing): 4 skeletons; values + trend/today/avg-tier + slots + sparkline from mocked `ActivatorDashboardDTO`; empty/new-activator; retry ⇒ refetch.
- [ ] `history/HistoryPage.test.tsx` (#testing): Section A renders the 3 present columns (documents E-1); Section B filters/sort/search mutate the query; empty vs no-match+Clear; pagination/Load-More.
- [ ] `requests/RequestsPage.test.tsx` (#testing): action gating (all disabled on FREEZE); each action ⇒ correct mutate (Wrong-Info `{fields}`, Freeze `{reason}`, Request-OTP `{fields:[OTP]}`, Activate/Cancel `id`); take ⇒ `useTakeActivation.mutate(id)` + 409 toast; slot-full disables pool Activate; timer tier classes; empty-pool reassuring (not error); a mocked invalidation refreshes cards/pool.
- [ ] Reuse Part-1 shared infra (`mockTranslation`/`renderWithRouter`/`setup.ts`); mock `lib/realtime.ts`/`useNotificationSound`; assert view/mutate behavior, not socket internals.

**Validation**
- [ ] `vitest run` green (success/loading/error). / [ ] No `/src` tests; files `.test.tsx`. / [ ] Both tsconfigs clean. / [ ] Committed on green.

**Risks**
- Realtime + timers under JSDOM — mock the socket + `useNotificationSound`, use fake timers for the count-up; assert mutate/refresh, not socket wiring.
- Ambiguous mocked-key text — scope with `within()` (Part-1 discipline).

---

## Net-new / extend recap (from plan §G, sprint-mapped)

| Sprint | Work |
|--------|------|
| S1 | `login`/`freeze-request`(/`flag-wrong-info`) schemas; plan-fields registry; **`useNotificationSound`** + chime asset; `activator.*` i18n; role-based login redirect (E-4) |
| S2 | complete/extend shell (`ActivatorHeader/Sidebar/Layout`) + 4 pages' dumb components + action modals |
| S3 | wire `LoginPage` (+ redirect), `DashboardPage` (`useMyStats`), `HistoryPage` (`useRecentActivations` + `useMyHistory`) |
| S4 | wire `RequestsPage` (6 action mutations + modals + FIFO pool + 409 take-race + realtime chime/glow) |
| S5 | mobile-first responsive, a11y, dark mode, animations |
| S6 | `/tests/unit/pages/activator/{login,dashboard,history,requests}/*.test.tsx` |

**Reused (build nothing new):** every hook in plan §B1, `lib/realtime.ts`, `lib/duration-tone.ts`, `LiveTimer`, `StatCard(Skeleton)`, `DataTable`, `StatusBadge`, `CopyButton`, `EmptyState`/`NotFoundState`, `SimplePagination`, `useDebouncedValue`, `ThemeToggle`/`LanguageToggle`, the existing Dashboard chart, `sonner`, `lib/query-keys.ts`, the `tests/fixtures/wrappers` infra.
**Deferred/out of scope (do not build):** named realtime toasts + bell event-feed (E-2, needs upstream event store); Global-Recent activator-name/email columns (E-1, needs DTO enrichment).
