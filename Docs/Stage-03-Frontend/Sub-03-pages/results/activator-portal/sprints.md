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

### Sprint 1: Foundation — Schemas, sound hook, i18n & role-based login redirect   — Status: ⬜ Pending

**Goals**
- The login/freeze schemas + plan-fields registry exist; `useNotificationSound` (net-new) works; all activator copy present (`en`/`fr` real, `ar:""`); the login redirect is role-based. `tsc` + existing suite green.

**Tasks**
- [ ] Schemas (#schema), each `AssertAssignable` to its command: `login.schema.ts` (→ `LoginCommand`, username + password required); `freeze-request.schema.ts` (→ `FreezeRequestCommand`, `reason` min 1); optional `flag-wrong-info.schema.ts` (→ `{ fields: AccountInformation[] }` nonempty).
- [ ] Plan-fields registry (#ui): `planKey → AccountInformation[]` (copyable card fields + Wrong-Info checkboxes + Request-additional options). Snapchat = USERNAME/EMAIL/PHONE_NUMBER/PASSWORD (+ OTP requestable).
- [ ] `useNotificationSound` (#state, net-new): `{ muted, toggleMute, playChime }`, `muted` persisted to localStorage; add a short chime asset under `public/`.
- [ ] i18n (#i18n): extend `activator.*` (shell, login incl. 429 lockout, dashboard, history, requests, action modals, notices); reuse `common.*`/`enums.activationStat.*`. `en`/`fr` real, `ar:""`.
- [ ] Login redirect (#infra, E-4): replace `LoginPage.tsx:35` `nav("/dashboard")` with a **role-based** switch (`session.role` → activator `/dashboard`, admin `/admin`).

**Validation**
- [ ] No inline strings. / [ ] `tsc` clean (both configs). / [ ] Schemas assignable to their commands. / [ ] `useNotificationSound` persists mute; chime asset present. / [ ] Role-based redirect resolves correctly for both roles. / [ ] Existing Vitest green; no `/src` tests. / [ ] Committed on green (scoped add).

**Risks**
- Touching `LoginPage`'s redirect — confirm both roles route correctly and the `PublicOnlyRoute` guard still bounces authed users off `/login`.

---

## PHASE 2 — PRIMITIVES & STATES

### Sprint 2: Primitives & States — shell + all four pages   — Status: ⬜ Pending

**Goals**
- Every shell + page dumb-component renders from props with loaders + localized empty/error; action modals exist statically; no hooks/mutations/realtime wiring yet. `tsc` + existing suite green.

**Tasks** *(all #ui; complete/extend existing, test-ready)*
- [ ] Shell: `ActivatorHeader` (notification bell **chrome + connection-indicator slot** — no live feed, E-2; sound-toggle button; EN|FR; dark; user menu Sign-Out confirm), `ActivatorSidebar` (Dashboard · Active Requests **[pending badge slot]** · History; active=purple; **mobile slide-over + backdrop + auto-close**), `ActivatorLayout` (session-resolving spinner slot).
- [ ] Login: complete `LoginPage` — logo, "Activator Login", username, password + show/hide, Log In (disabled+spinner), error slots (401 generic / 429 lockout / empty / network).
- [ ] Dashboard: 4 `StatCard`s (earnings+trend, credits, activations+today, avg-time tier via `durationToneClass`), 7-day sparkline (reuse existing chart), slot indicator, "Go to Active Requests" `<Link>`; skeletons + empty ("No activity yet") .
- [ ] History: Section A table/cards (Subscription/Key/Completed — **3 cols**, E-1); Section B table/cards + filters (Status chips, Sort, date range, search), pagination/Load-More; skeletons + empty/no-match.
- [ ] Active Requests: active card (slot indicator, live-timer slot, status badge PROCESSING/WRONG/ADDITIONAL/FREEZE, collapsible distributor block, tap-to-call client + 📋 fields via `CopyButton`, OTP 📋 slot), action buttons row, **WrongInfoModal** (checkbox per plan field) + **FreezeModal** (reason textarea) statics; pending-pool rows (Subscription/masked Key/waiting-slot/Activate); skeletons + empties (0/3 "Pick one…", reassuring empty pool "😌 …").

**Validation**
- [ ] Every region renders from props; all states present + localized. / [ ] Bell shows chrome + connection slot only (no fabricated feed). / [ ] No inline strings; no fetching. / [ ] `tsc` clean; existing Vitest green; no `/src` tests. / [ ] Committed on green.

**Risks**
- Active-card action buttons must expose a gating prop (by state) for S4; name the modal fields now.
- `DataTable` renders desktop+mobile together in JSDOM (S6 disambiguation).

---

## PHASE 3 — ASSEMBLY & WIRING

### Sprint 3: Assembly & Wiring — Login + Dashboard + History   — Status: ⬜ Pending

**Goals**
- Login authenticates + redirects by role; Dashboard renders live stats; History Sections A & B fully live with filters/sort/search/pagination. Layout survives loading/error. `tsc` + existing suite green.

**Tasks**
- [ ] Login (#wiring #forms): `useLogin` (`login.schema.ts`) → role-based redirect (E-4); 401 generic / 429 lockout / empty / network inline errors; disabled+spinner in-flight.
- [ ] Dashboard (#wiring): `useMyStats()` → `ActivatorDashboardDTO` → 4 cards + trend/today/tier + slot indicator + sparkline (`weekly[]`); live via socket-invalidation of `qk.activators.myStats()`; empty/new-activator state; section retry.
- [ ] History Section A (#wiring): `useRecentActivations()` → 3 columns (E-1); live via invalidation + on-focus.
- [ ] History Section B (#wiring): `useMyHistory({ status, sortBy, dateFrom, dateTo, search, page, limit })` with `useDebouncedValue` search; Status chips / Sort / date-range / pagination (desktop prev-next + "Page N of M", mobile Load-More); empty vs no-match+Clear; earning rendered as-is (not recomputed).
- [ ] `useMemo` history `ColumnDef[]`.

**Validation**
- [ ] Login: empty ⇒ no mutate; 401/429/network branches; valid ⇒ `useLogin.mutate` + role redirect. / [ ] Dashboard values/tier/sparkline from mocked DTO; retry ⇒ refetch. / [ ] History filters/sort/search mutate query; empty/no-match. / [ ] No `useEffect` fetching. / [ ] `tsc` clean; existing Vitest green. / [ ] Committed on green.

**Risks**
- Status-chip → `GetActivatorHistoryQuery.status` mapping (All = no param; Frozen/Admin-resolved may fold multiple states — map per contract enum).

---

### Sprint 4: Assembly & Wiring — Active Requests (primary page)   — Status: ⬜ Pending

**Goals**
- The work queue fully live: 0–3 active cards with all six actions + modals + live speed-tier timers, the FIFO pending pool with take-race handling, and realtime refresh + new-request chime/glow. Layout survives loading/error. `tsc` + existing suite green.

**Tasks**
- [ ] Active cards (#wiring): `useActiveRequests()` → cards; slot indicator from length; **live count-up timer** from `takenAt`, speed-tier colored (`durationToneClass`); status badges; plan-fields registry drives the copyable field list + OTP (once `otpValue`).
- [ ] Actions (#wiring #forms): gated to `PROCESSING/WRONG_INFORMATION/ADDITIONAL_INFORMATION` (all disabled on `FREEZE`): **Wrong Info** (WrongInfoModal checkboxes → `useFlagWrongInfo({fields})`), **Request OTP** (→ `useRequestAdditionalInfo({fields:[OTP]})`), **Activate** (→ `useActivateRequest`, exit anim), **Cancel** (confirm → `useCancelActivation`, exit anim), **Freeze** (FreezeModal reason → `useFreezeActivation({reason})`, locks card).
- [ ] Pending pool (#wiring): `usePendingActivations()` FIFO; **live waiting timer** (green`<5m`/amber`5–15m`/red`>15m`); **Activate** disabled at 3/3; `useTakeActivation.mutate(id)`; **409 take-race** → toast "This request was taken by another activator." + socket removes row.
- [ ] Realtime (#wiring, E-2): cards/pool/stats auto-refresh via the global socket invalidation (`AuthProvider`-owned); **new-request chime/glow/badge** via a **pending-list diff** (chime gated by `useNotificationSound`); connection indicator via `useRealtimeStatus`. **Do not** build the deferred named toasts / bell feed.

**Validation**
- [ ] Action gating correct (all disabled on FREEZE); each action ⇒ correct mutate (Wrong-Info `{fields}`, Freeze `{reason}`, Request-OTP `{fields:[OTP]}`). / [ ] Take ⇒ `useTakeActivation.mutate(id)`; 409 toast + row removed; pool Activate disabled at 3/3. / [ ] Timers show tier classes; new-request chime respects mute. / [ ] Empty pool is reassuring (not error). / [ ] No `useEffect` fetching. / [ ] `tsc` clean; existing Vitest green. / [ ] Committed on green.

**Risks**
- Pending-diff for new-request detection — track prior ids; avoid chiming on the initial load or on refetch churn.
- Card exit animation vs invalidation-driven list change — coordinate so a removed card animates out cleanly.

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
