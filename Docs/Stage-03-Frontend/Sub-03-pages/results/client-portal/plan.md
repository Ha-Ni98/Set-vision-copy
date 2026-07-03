# Client Activation Portal — Page Assembly Plan (SV-PAGE-001)

> **Stage 03 · Sub-03 · Phase 01 (Planning).** No code — audit + plan only.
> **Page:** Public client activation portal (single page, multi-step flow) · **Route:** `/` (existing `LandingPage`; `/activate` may alias)
> **Audience:** end client (scratch-card holder), **mobile-first**, public (no auth)
> **Inputs:** [SV-PAGE-001_client_portal_spec.md](../../../../Stage-00-Conception/Pages-Requirements/SV-PAGE-001_client_portal_spec.md) · [front-end-rules.md](../../../front-end-rules.md) · [front-end-test-rules.md](../../../front-end-test-rules.md) · `@my-app/contract` · existing `Apps/web/src/{pages/LandingPage.tsx,components/sections/landing,hooks,services/keys.service.ts,lib/realtime.ts}`
> **Governance:** rules = HOW · phase = WHAT/WHEN · contract = WHICH. HOW conflicts resolved toward the rules and noted in §B/§F; two genuine conflicts (AR/RTL, CAPTCHA) were escalated and answered (§A).

---

## A. Session decisions (answered before planning)

| # | Question | Decision |
|---|----------|----------|
| 1 | **AR + full RTL** — spec mandates it; rules defer all AR/RTL (`ar` reserved-empty, `components.json rtl:false`, no `dir` handling) | **RTL-ready scaffold.** Ship **EN/FR LTR now**, but build the portal RTL-safe — logical CSS properties, a plumbed `dir` toggle, `ar` keys stubbed — so activating Arabic later is cheap. No full AR copy / `rtl:true` flip yet (§B6, §F). |
| 2 | **CAPTCHA on verify** — spec requires it; needs a new library (rules: ask first) | **No CAPTCHA.** Treat the spec as if it weren't mentioned — no provider, no library, no slot. Backend rate-limiting stands alone (§F). |

**This page is already partially built.** `pages/LandingPage.tsx` + `components/sections/landing/*` (`StepIndicator`, `AccountForm` + `account-form.schema.ts`, `OtpStep`, `CompletedStep`, `StatsRow`, `WhoWeAre`), a `types/key-flow.ts` `KeyFlowView` state model, ~56 `public.landing.*` i18n keys, `services/keys.service.ts`, and all four client mutation hooks exist from the Sub-01/Sub-02 MVP. **This plan completes that MVP to the full spec** (all 9 client statuses, per-plan genericity, realtime re-sync, update/correct flows, RTL-ready shell) — it is not greenfield.

**Audit headline:** **every read/write hook + contract DTO the portal needs exists** — `useVerifyKey`, `useSubmitActivation`, `useUpdateActivation`, `useSubmitAdditionalInfo`, `useActivationStatus`, and `lib/realtime.ts`'s `subscribeActivation`/`unsubscribeActivation` (a real `/client` socket namespace). The `ClientActivationStatus` enum matches the spec's 9 statuses **exactly**. The **only data gap is the public stats counters** (`/api/stats` / `usePublicStats` don't exist — §E-1), which the spec already says to degrade silently.

---

## B. Cross-cutting resolutions

### B1. Hook & realtime reconciliation (spec name → real export) — no new hooks
| Spec calls it | Real export | Note |
|---|---|---|
| `useVerifyKey` | `useVerifyKey()` — mutation | on success auto-`subscribeActivation(activationId)` when one is returned |
| `useSubmitActivation` | `useSubmitActivation()` | toast + `subscribeActivation`; `SubmitActivationCommand { key, fullName, phone, accountFields }` |
| `useUpdateActivation` | `useUpdateActivation()` | `mutate({ activationId, command })`; invalidates `qk.keys.status(activationId)` |
| `useSubmitAdditionalInfo` | `useSubmitAdditionalInfo()` | `mutate({ activationId, command })`; invalidates status |
| `useActivationRealtime` | **composition:** `subscribeActivation`/`unsubscribeActivation` (`lib/realtime.ts`, `/client` ns) + `useActivationStatus(activationId, enabled)` (STATUS query) | socket invalidates `qk.keys.status` → the status query refetches → view updates; `useActivationStatus` also backs the **polling fallback** (§D5) |
| `usePublicStats` | **none** (§E-1) | stats section degrades silently |
| `useLanguage` | `useLanguage()` / `useTranslation()` — `LanguageProvider` | EN/FR now; `dir` plumbing added RTL-ready (§B6) |

### B2. Endpoint / field notation (spec → contract) — resolved toward the contract
- **Submit is key-in-body, not ref-in-path:** contract `KEY_ROUTES.SUBMIT = '/submit'` with `SubmitActivationCommand { key, … }` (services already do this) — **not** the spec's `/keys/{activation_ref}/submit`. Update/Additional/Status **do** use `/:activationId/...`.
- **`activation_ref` → `activationId`; `plan_key` → `planKey`; `field_key` → `field` (`AccountInformation` enum); `field_label`/`value` → `submittedFields[]`.** `KeyVerificationDTO` = `{ status, subscriptionLabel?, planKey?, activationId?, submittedFields?, flaggedFields?, requestedFields?, accountUsername? }`.
- **`update` verb:** the API registers `UPDATE` as **POST** (the service comment already corrects the Sub-01 stub's "PATCH" TODO). Follow the service.
- **`VITE_API_URL`/`VITE_WS_URL`** carry the base + ws origin; never hardcode.

### B3. Public-page infra (no auth)
- Verify/submit/update/additional/status/stats are **public** — no auth cookie is attached and a **401 must never redirect to `/login`.** Add these `KEY_ROUTES.*` (+ a future `/stats`) to the axios interceptor's **auth-exempt list** (same mechanism that already exempts token endpoints, `lib/axios.ts`) so a public error can't bounce the client to login. *(Small infra touch, not a new pattern.)*
- **CSRF:** if the backend issues a CSRF token for form POSTs, attach it via the existing axios instance (single instance, rules §3A); otherwise no-op. Backend-owned; no UI.

### B4. Forms: co-located schema refines the loose contract command
- Reuse/align **`components/sections/landing/account-form.schema.ts`** so its output feeds `SubmitActivationCommand`/`UpdateActivationCommand`. **Snapchat field rules (spec §Step 2):** `fullName` 3–100 letters/spaces/hyphens; `phone` `^(?:\+213|0)(5|6|7)\d{8}$` (activation columns); Snapchat `username` non-empty, `email` valid, `snapchatPhone` optional (defaults to `phone`; validated if set), `password` min 6, `confirmPassword` must match. **Mapping:** `fullName`/`phone` → command top-level; `username`/`email`/`snapchatPhone`/`password` → `accountFields: [{ field: AccountInformation.USERNAME|EMAIL|PHONE_NUMBER|PASSWORD, value }]`; **`confirmPassword` is client-only, never sent.** Compile-time `AssertAssignable` to the command (Part-1 pattern).
- **Genericity (spec principle):** a `plan-forms` registry keyed by `planKey` → `{ FormComponent, fieldSchema, additionalInfoComponent }`. Snapchat is the only entry today; the page renders `registry[verify.planKey]`. `AccountForm`/`OtpStep` become the Snapchat entry, not hard-wired into the page.

### B5. Mutations, toasts, error posture
- Global `mutationCache.onError → toast` handles unexpected failures; the portal adds **step-specific inline errors** where the spec dictates exact copy (verify network/5xx, submit fail with preserved data, wrong-OTP counter). Success toasts already fire in `useSubmitActivation`/`useUpdateActivation`.
- A failed mutation **preserves entered data** (form/OTP stays populated). WhatsApp support `<Link>` (external, new tab) appears on Invalid / Under-review / Failed / hard-5xx views.

### B6. i18n, theme, **RTL-ready scaffold** (decision #1)
- **All copy via `useTranslation()`**; extend the existing `public.landing.*` namespace to cover every status variant, security notices, OTP, header/footer, "Check Another Key". `en`/`fr` real copy; **`ar` stays `""`** (stubbed, not populated) — the switcher exposes **EN/FR only** for now (reuse `LanguageToggle`).
- **RTL-ready without shipping RTL:** author the portal's own layout with **logical CSS properties** (`ms-*/me-*/ps-*/pe-*`, `text-start/end`, `start-0/end-0`) instead of physical `ml/mr/pl/pr/left/right`; plumb `dir` through `LanguageProvider` (compute `dir = lang==='ar' ? 'rtl' : 'ltr'`, set `document.documentElement.dir` — resolves to `ltr` today since AR is inactive). **`components.json rtl` stays `false`** (flipping it + populating `ar` is the later full-AR activation step). Net effect: activating Arabic later = fill `ar` copy + expose AR in the toggle, with **minimal layout rework** because spacing/alignment are already logical.
- **Theme:** dark/light via `next-themes` persisted to localStorage (reuse `ThemeToggle`), no FOUC.

### B7. Shared-component reuse map
| Need | Reuse / status |
|---|---|
| Step flow scaffold | `StepIndicator`, `AccountForm`(+schema), `OtpStep`, `CompletedStep`, `StatsRow`, `WhoWeAre` — **exist, extend** (§C) |
| Key-flow state | `types/key-flow.ts` `KeyFlowView` — **exists**, promote into `ActivationContext` (§D1) |
| Header/footer chrome | `PublicLayout` + `Logo`, `LanguageToggle`, `ThemeToggle` — reuse/align to the spec header (logo · social · terms · lang · theme · hamburger<768); **no commerce chrome** (rules §6C) |
| Password reveal, copy | `ui/input` + a show/hide toggle; `CopyButton` if needed |
| Loading | inline button spinners + Shadcn `Skeleton`/shimmer — **never a full-page block after first paint** (spec) |
| Toaster | `sonner` (already global) |
| Realtime | `lib/realtime.ts` `subscribeActivation`/`unsubscribeActivation`/`useRealtimeStatus` — **exists** |

### B8. Optimization posture
- The page is a client component; **no `React.lazy` split needed** for the index route beyond the existing `withSuspense` (it's the first paint — code-splitting it would slow the primary flow; keep it eager or lightly suspended per current setup).
- `useMemo` the plan-forms registry lookup and the status→view mapping; debounce nothing (single key input, submit on click). OTP resend + lockout are local timers.
- Realtime is a **freshness signal, not a data source** — the view always derives from the latest verify/status payload (rules-consistent).

---

## C. Existing baseline vs. spec delta (what to complete)

| Area | Exists today | Delta to reach spec |
|---|---|---|
| Verify flow | `LandingPage` verifies + dispatches on `ClientActivationStatus` into `KeyFlowView` (IDLE/MESSAGE/FORM/OTP/COMPLETED) | promote state to `ActivationContext`; cover **all 9** statuses distinctly (Submitted vs Ready vs Processing vs Under-review vs Needs-correction) with the exact per-status UI |
| Step 2 form | `AccountForm` + schema (happy-path Ready) | add **Submitted (read-only + 15-min notice + Update Information)**, **Needs-correction (flagged fields highlighted + Update & Re-submit)**, **Processing/Under-review read-only**, security notice, Clear-Fields confirm, per-plan genericity |
| Step 3 | `OtpStep`, `CompletedStep` | OTP **digit boxes + 60s resend cooldown + attempt counter/lockout**; split **Activated** (green anim/username) vs **Failed** (red + WhatsApp); **Under-review** amber view |
| Realtime | `subscribeActivation` auto-called; `useActivationStatus` query built | wire **status→view** on socket invalidation; **reconnect backoff toast**; **re-verify on reconnect + window focus/visibility**; **polling fallback 5–10s**; multi-tab latest-wins; teardown on reset |
| Shell | step indicator + sections render | spec **header/footer** (social/terms/lang/theme/hamburger); **"Check Another Key"** always-visible with full teardown (unsubscribe) |
| Stats | `StatsRow` (static/placeholder) | wire to `usePublicStats` **when it exists**; until then static/hidden (§E-1) |
| i18n | ~56 `public.landing.*` keys, `ar:""` | extend to all variants; keep `ar` stubbed; RTL-ready logical CSS |

---

## D. Region plans

### D1 — Portal shell, `ActivationContext` & "Check Another Key"
**Hooks/State** — new `ActivationContext` (promote `KeyFlowView`): holds `{ key, status, planKey, activationId, subscriptionLabel, submittedFields, flaggedFields, requestedFields, accountUsername }` + `reset()`. Seeded by `useVerifyKey` success; consumed by every step + realtime.
**Components** — *Reuse/extend* `PublicLayout` header/footer (logo `<Link>` = reset-home, social Instagram/WhatsApp external new-tab, Terms/Privacy `<Link>`s, `LanguageToggle` EN/FR, `ThemeToggle`, hamburger <768), `StepIndicator` (1 Enter Key · 2 Account · 3 Activation; completed=green check, active=purple, future=gray non-clickable). *New* `ActivationProvider`, `CheckAnotherKeyButton` (always visible in MAIN; on click: `reset()` → Step 1, clear form + key + indicator, **`unsubscribeActivation(activationId)`**).
**States** — shell never blocks after first paint; step transitions inline.
**Tests** — `reset` clears context + calls `unsubscribeActivation`; step indicator reflects `currentStep`; hamburger toggles <768.

### D2 — Step 1 · Key entry & verification
**Hooks** — `useVerifyKey()` → `KeyVerificationDTO`; on success seed `ActivationContext` + (if `activationId`) `subscribeActivation`.
**Components** — *Extend* the Step-1 block: heading, `XXXX-XXXX-XXXX-XXXX` input, "Verify Key" button (purple, spinner + disabled in-flight, full-width mobile). Client validation: empty → "Please enter your activation key."; bad format → "Invalid key format…".
**Status→UI dispatch** (the 9 rows): `INVALID`→red generic "does not exist" + red border, field editable; `READY`→Step 2 empty form; `SUBMITTED`→Step 2 read-only + amber 15-min notice + Update Information; `PROCESSING`→Step 2/3 read-only "being processed"; `NEEDS_CORRECTION`→Step 2 flagged fields highlighted + Update & Re-submit; `NEEDS_OTP`→Step 3 OTP; `UNDER_REVIEW`→Step 3 amber review; `ACTIVATED`→Step 3 success; `FAILED`→Step 3 failure.
**States** — loading: button spinner, field disabled. Error: network → "Unable to verify your key…" + retry; 5xx → generic server error + WhatsApp.
**Tests** — each status routes to the right view; empty/bad-format inline errors; network/5xx branches; success seeds context + subscribes.

### D3 — Step 2 · Account information form (per-plan; Snapchat)
**Hooks** — reads `ActivationContext` (status, planKey, `submittedFields`, `flaggedFields`); writes `useSubmitActivation` (Ready) / `useUpdateActivation` (Submitted→edit / Needs-correction).
**Components** — *Extend* `AccountForm` into the plan-forms registry Snapchat entry (Group A: Full Name, Phone; Group B: Username, Email, Snapchat Phone optional, Password + show/hide, Confirm Password), amber **security notice** under passwords, **Save & Submit** / **Clear Fields** (confirm "Clear all fields?"). Variants: **A Ready** (empty editable), **B Submitted** (read-only, password masked, amber 15-min + WhatsApp, **Update Information** re-opens), **C Needs-correction** (prefilled, flagged fields red border + icon, top message, **Update & Re-submit**), **D Processing/Under-review** (read-only + notice).
**Forms & Mutations** — `account-form.schema.ts` (§B4) → `SubmitActivationCommand` (Ready) / `UpdateActivationCommand` (`accountFields` only, for correction/update). `confirmPassword` client-only. Server errors preserve form data.
**States** — loading: button spinner, fields disabled. Error: submit network → "Unable to submit your information." (data preserved); inline per-field Zod; 5xx → server error + WhatsApp.
**Tests** — Zod errors on invalid submit; valid Ready ⇒ `useSubmitActivation.mutate(command)`; Submitted read-only + Update Information re-opens; Needs-correction highlights `flaggedFields` + Update & Re-submit ⇒ `useUpdateActivation`; password confirm mismatch; Clear-Fields confirm.

### D4 — Step 3 · Activation (OTP · review · completion · failure)
**Hooks** — reads `ActivationContext` (status, `requestedFields`, `accountUsername`); writes `useSubmitAdditionalInfo` (OTP).
**Components** — *Extend* `OtpStep`: **A Needs-OTP** = "OTP Verification Required", digit boxes, **Submit OTP**, **Resend** (60s cooldown), attempt counter, lockout message; maps to `SubmitAdditionalInfoCommand { accountFields:[{ field: OTP, value }] }`. *Extend* `CompletedStep` into **C Activated** (green animated check, "Activation Complete!", change-password reminder, shows `accountUsername`) and **D Failed** (red/neutral card + WhatsApp). **B Under-review** = amber notice + WhatsApp, read-only, live-updates on admin resolve.
**States** — loading: Submit-OTP spinner, resend disabled during cooldown. Error: wrong OTP → "Incorrect code…" + attempt counter; lockout → "Too many attempts…"; network → retry, input preserved.
**Tests** — OTP submit ⇒ `useSubmitAdditionalInfo.mutate({ activationId, command })`; wrong-OTP counter; resend cooldown disables/re-enables; Activated shows username + reminder; Failed shows WhatsApp; Under-review read-only.

### D5 — Real-time sync
**Hooks** — `subscribeActivation(activationId)` (after verify/submit) + the `/client` socket invalidating `qk.keys.status(activationId)` → `useActivationStatus(activationId, enabled)` refetch → `ActivationContext` update → view re-dispatch (reuse D2's status→UI map). `useRealtimeStatus()` drives the connection indicator.
**Behavior** — events → UI: picked-up→Processing, flagged→Needs-correction (+fields), OTP→Needs-OTP, frozen→Under-review, completed→Activated, failed→Failed. **Drop** → non-intrusive "Connection lost. Reconnecting…" toast + exponential backoff. **On reconnect and on window focus/visibility change → re-verify (or refetch status) to re-sync** (`useActivationStatus` with `refetchOnWindowFocus`, plus a reconnect handler). **Polling fallback 5–10s** = `useActivationStatus` `refetchInterval` while the socket is down. **Multi-tab:** only the most recent submission is active (latest `activationId` wins in context). Teardown on "Check Another Key" (D1).
**Tests** — a mocked status change re-dispatches the view; focus/visibility triggers a refetch; teardown unsubscribes. (Mock the socket + `useActivationStatus`; assert view transitions, not socket internals.)

### D6 — Informational sections
**WhoWeAre** — *Reuse* `WhoWeAre` (static mission + "Marketing And Digital Services" tagline + optional illustration). No data.
**Recent Activity / Stats** — *Reuse* `StatsRow` (animated counters). **Data source is a gap (§E-1):** wire to `usePublicStats` **when `/api/stats` exists**; until then render static/placeholder or **hide** — the spec mandates the section **degrade silently** (never an error block on the public page).
**States** — loading: counters shimmer; empty/error: hide or neutral placeholder.
**Tests** — section hides/placeholders on absent stats (documents §E-1); no error block ever renders here.

---

## E. Missing hooks / contract DTOs to resolve first (Expected Output)

| # | Gap | Where | Type | Current handling | Recommended upstream fix | Severity |
|---|-----|-------|------|------------------|--------------------------|----------|
| E-1 | No `usePublicStats` / `GET /api/stats` public counters endpoint (contract has only `activator MY_STATS` + the admin statistics module) | D6 stats | contract route + hook | render `StatsRow` static/placeholder or **hidden** — spec already requires silent degradation | add a public `STATS_ROUTES` + `PublicStatsDTO` (`{ totalSuccessful, thisWeek, … }`) + `usePublicStats` | Low (spec-sanctioned degrade) |
| E-2 | `useActivationRealtime` isn't a single hook | D5 | resolved | composition of `subscribeActivation` + `useActivationStatus` + status invalidation (§B1) | optionally wrap the composition in a `useActivationRealtime(activationId)` convenience hook | Resolved |
| E-3 | Submit is `/keys/submit` (key in body), not `/keys/{ref}/submit`; `update` is POST not PATCH | D2/D3 | notation | follow the contract/service (§B2) | none — contract is source of truth | Resolved |
| E-4 | Public endpoints not in the axios 401 auth-exempt list | §B3 | infra | add `KEY_ROUTES.*` (+ future `/stats`) to the exempt list so a public 401 never redirects to `/login` | keep public paths exempt | Low |

---

## F. Deviations ledger

- **AR/RTL:** ship **EN/FR LTR, RTL-ready** (logical CSS, `dir` plumbed, `ar` stubbed) — **not** full Arabic + `rtl:true` (decision #1). Activating AR later is a copy-fill + toggle-expose step, deliberately low-cost.
- **CAPTCHA:** **omitted** entirely (decision #2) — not planned, no library, no slot; backend rate-limiting stands alone. *(Traceable divergence from the written spec's Security table.)*
- **Public stats section:** **deferred/degraded** pending `/api/stats` (E-1) — spec-sanctioned silent hide.
- **Notation:** key-in-body submit, `activationId`/`planKey` camelCase, POST update (§B2) — reconciliations, not functional reductions.

Everything else in SV-PAGE-001 is planned at **full fidelity** against existing hooks + DTOs (all 9 statuses, per-plan genericity, submit/update/correct/OTP flows, realtime re-sync, shell + Check-Another-Key).

---

## G. Net-new artifact inventory (for the sprint/execute phase)

- **Context:** `ActivationProvider` + `ActivationContext` (promote `types/key-flow.ts`).
- **Shell:** portal header/footer alignment on `PublicLayout` (social/terms/lang/theme/hamburger), `CheckAnotherKeyButton`.
- **Genericity:** `plan-forms` registry (planKey → form + field schema + additional-info component); Snapchat entry = the extended `AccountForm`/`OtpStep`.
- **Completed sections (extend existing):** `AccountForm` (5 status variants + security notice + Clear/Update/Re-submit), `OtpStep` (digit boxes + resend cooldown + lockout), `CompletedStep` (Activated vs Failed), `StepIndicator`, `StatsRow` (stats-gap aware), `WhoWeAre`.
- **Realtime wiring:** status→view dispatch, reconnect/refocus re-verify, polling fallback, teardown (over `lib/realtime.ts` + `useActivationStatus`).
- **Schema:** align `account-form.schema.ts` to `SubmitActivationCommand`/`UpdateActivationCommand` (+ `AssertAssignable`).
- **i18n:** extend `public.landing.*` (all variants, header/footer, OTP, notices) — en/fr real, `ar:""`; **logical CSS** throughout for RTL-readiness.
- **Infra:** add `KEY_ROUTES.*` (+ future `/stats`) to the axios 401 auth-exempt list.
- **Tests:** `/tests/unit/pages/client-portal/*` (verify dispatch, form variants, OTP, realtime re-sync, stats-degrade) — hooks + `useTranslation` mocked; `.test.tsx`.
- **Reused (build nothing new):** all four client mutation hooks, `useActivationStatus`, `lib/realtime.ts`, `keys.service.ts`, `LanguageToggle`/`ThemeToggle`/`Logo`, `sonner`, `lib/query-keys.ts`.
- **Explicitly out of scope:** CAPTCHA (decision #2); full Arabic copy + `rtl:true` (decision #1); `usePublicStats` until upstream adds `/api/stats` (E-1).

---

*End of Client Activation Portal plan (SV-PAGE-001). With this, the re-spec set is fully planned: Admin panel Parts 1–3 + the public client portal.*
