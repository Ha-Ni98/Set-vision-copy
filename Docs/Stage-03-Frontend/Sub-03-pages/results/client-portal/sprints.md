# Client Activation Portal — Page Assembly Sprint Plan (SV-PAGE-001)

> **Stage 03 · Sub-03 · Phase 02 (Sprint Planning).** No code yet — a build playbook.
> **Source plan:** [results/client-portal/plan.md](./plan.md) · **Phase file:** [stage-03-sub-03-phase-02-sprints.md](../../stage-03-sub-03-phase-02-sprints.md) · **Rules:** [front-end-rules.md](../../../front-end-rules.md), [front-end-test-rules.md](../../../front-end-test-rules.md) · **Contract:** `@my-app/contract`
> **Governance:** rules = HOW · phase = WHAT/WHEN · contract = WHICH. HOW conflicts resolved toward the rules/explicit instruction and noted.

---

## Ordering & program shape

Required global order: **Foundation → Primitives & States → Assembly & Wiring → Polish → Tests**. This is a **single public page** (route `/`, the existing `LandingPage`) but a **stateful multi-step flow** (9 client statuses, 5 form variants, realtime re-sync, per-plan genericity) that is **already partially built** — so much of the work is *extend*, not *create*. Assembly splits in two around the two hard concerns (the verify-dispatch + 5-variant form; and Step 3 + realtime). **Six sprints, five phases:**

| Phase | Sprints | Scope |
|-------|---------|-------|
| 1 · Foundation | **S1** | schema alignment · i18n extension · RTL-ready infra · public 401-exempt |
| 2 · Primitives & States | **S2** | `ActivationContext` + plan-forms registry + all region dumb-components (extend existing) |
| 3 · Assembly & Wiring | **S3** Steps 1 & 2 · **S4** Step 3 + Realtime + Sections | verify-dispatch, form mutations, OTP, realtime re-sync |
| 4 · Polish | **S5** | **mobile-first** responsive, RTL-readiness audit, a11y, dark mode, anims |
| 5 · Tests | **S6** | `/tests/unit/pages/client-portal/**` with `vi.mock` on hooks |

**Dependency spine:** S1 → S2 → S3 → S4 → S5 → S6 (mostly linear — S4's realtime re-sync reuses S3's status→view dispatch map). Assembly split by concern: **S3** owns the verify→9-status dispatch and the Step-2 form's five variants (the heaviest UI logic); **S4** owns Step 3 (OTP/completion) + the realtime backbone (subscribe, reconnect/refocus re-verify, polling fallback, teardown) + the light informational sections.

> Smaller than the admin parts (one page, partially built). Lever if wanted: merge S3+S4 into one assembly sprint for ~5 (only if the realtime work proves light).

### Execution protocol (applies to every sprint)
- **Per-sprint gates (non-negotiable, in each Validation block):** ① no inline JSX strings — all copy via `useTranslation` (plan §B6); ② `tsc --noEmit` clean (both configs); ③ no `useEffect` for *fetching* (rules §2 — realtime subscribe/status is a freshness signal via the query layer, not a fetch-in-effect); ④ layout survives loading/error with a **localized** fallback — **never a full-page block after first paint** (spec); ⑤ existing Vitest suite stays green; ⑥ no test files under `/src`.
- **Tests-last:** page `.test.tsx` files are authored in **S6**; S2–S5 keep the existing suite green plus gates ①–④. Build test-ready (props-driven, hooks isolable).
- **Commit convention (project memory):** on green, `git add` **the touched paths only** then commit `Sprint N: <Title>` — no co-author trailer; update docs (this file's Status + the sprint report) first. **Never `git add .`** (keep the untracked `Docs/Stage-00-Conception/react-algeria-map` unstaged).
- **Guardrails from the plan (the §F deviations are intentional — do NOT "fix" them):**
  - **RTL-ready, not full-AR (decision #1):** use **logical CSS properties** (`ms/me/ps/pe`, `text-start/end`) and plumb the `dir` toggle, but **do not** populate `ar` copy (`ar:""` stays) or flip `components.json rtl` (stays `false`). Activating Arabic is a later copy-fill + toggle-expose step.
  - **No CAPTCHA (decision #2):** do not add a provider, library, or even a slot.
  - **Public stats degrade silently (§E-1):** `usePublicStats`/`/api/stats` don't exist — `StatsRow` renders static/placeholder or **hidden**; **never** an error block on the public page.
  - **Reuse/extend the existing MVP** (`LandingPage` + `components/sections/landing/*`, `types/key-flow.ts`) — do not rebuild from scratch.
  - Missing contract data is an upstream fix (plan §E), never a local patch (rules §2).
- **Naming reconciliations locked (plan §B1/§B2):** submit is **key-in-body** `/keys/submit`; `update` is **POST**; `activationId`/`planKey` camelCase; `field: AccountInformation` enum in `accountFields`; test files `.test.tsx`.
- **Page-specific:** this page is **mobile-first** (unlike the desktop-first admin) and **public** (no auth).
- **Status legend:** ⬜ Pending · 🟨 In progress · ✅ Done.

---

## PHASE 1 — FOUNDATION

### Sprint 1: Foundation — Schema, i18n, RTL-ready infra & public 401-exempt   — Status: ⬜ Pending

**Goals**
- The account-form schema's output is assignable to `SubmitActivationCommand`/`UpdateActivationCommand`; all portal copy present (`en`/`fr` real, `ar:""`); RTL `dir` plumbing + logical-CSS convention in place (LTR-resolving); public key endpoints exempt from the 401 redirect. `tsc` + existing suite green.

**Tasks**
- [ ] Align `components/sections/landing/account-form.schema.ts` (#schema): Snapchat rules (plan §B4) — `fullName` 3–100 letters/spaces/hyphens; `phone` `^(?:\+213|0)(5|6|7)\d{8}$`; `username` non-empty; `email` valid; `snapchatPhone` optional (defaults to `phone`); `password` min 6; `confirmPassword` matches (client-only, not sent). Add mapping helpers to `accountFields:[{field:AccountInformation,value}]` + a compile-time `AssertAssignable` to both commands.
- [ ] i18n extension (#i18n): extend `public.landing.*` to every status variant, security notices, OTP (heading/resend/lockout), header/footer (social/terms/lang/theme), "Check Another Key", verify/submit/network/5xx errors. `en`/`fr` real, **`ar:""` stubbed**.
- [ ] RTL-ready infra (#infra): plumb `dir` through `LanguageProvider` (`dir = lang==='ar' ? 'rtl' : 'ltr'` → `document.documentElement.dir`; resolves `ltr` today); adopt **logical CSS** as the portal convention. **Do not** populate `ar` or flip `components.json rtl` (stays `false`).
- [ ] Public 401-exempt (#infra): add `KEY_ROUTES.*` (+ a future `/stats`) to the axios interceptor's auth-exempt list so a public error never redirects to `/login` (plan §B3/§E-4).

**Validation**
- [ ] No inline strings. / [ ] `tsc` clean (both configs). / [ ] Schema output assignable to both commands (assertion compiles). / [ ] `dir` resolves `ltr`; `components.json rtl` still `false`; `ar` still `""`. / [ ] Public endpoints don't trigger the 401 redirect. / [ ] Existing Vitest green; no `/src` tests. / [ ] Committed on green (scoped add).

**Risks**
- Touching the shared axios interceptor — keep the exempt-list change additive; don't regress token-endpoint handling.
- Logical-CSS discipline — establish it now so S2–S3 don't backslide into physical props.

---

## PHASE 2 — PRIMITIVES & STATES

### Sprint 2: Primitives & States — Context, registry & all region components   — Status: ⬜ Pending

**Goals**
- `ActivationContext` (promoted from `KeyFlowView`) holds the flow state with a `reset()`; the plan-forms genericity registry exists (Snapchat entry); every region's dumb component renders from props/context with loaders + localized error/empty. No mutations, no realtime wiring yet. `tsc` + existing suite green.

**Tasks** *(all #ui; extend existing where noted)*
- [ ] `ActivationProvider` + `ActivationContext` (#state): promote `types/key-flow.ts` `KeyFlowView` — `{ key, status, planKey, activationId, subscriptionLabel, submittedFields, flaggedFields, requestedFields, accountUsername }` + `reset()`. Container only (seeding logic lands in S3).
- [ ] Plan-forms registry (#ui): `planKey → { FormComponent, fieldSchema, additionalInfoComponent }`; Snapchat entry = the extended `AccountForm`/`OtpStep`. Page renders `registry[planKey]`.
- [ ] Shell (#ui): align `PublicLayout` header/footer to spec (logo `<Link>`=reset, Instagram/WhatsApp external-new-tab, Terms/Privacy, `LanguageToggle` EN/FR, `ThemeToggle`, hamburger<768, **no commerce chrome**); extend `StepIndicator` (completed=green check / active=purple / future=gray non-clickable); `CheckAnotherKeyButton` (always visible).
- [ ] Step 2 form variants (#ui): extend `AccountForm` to render **Ready** (empty editable), **Submitted** (read-only, password masked, 15-min amber + WhatsApp, Update Information), **Needs-correction** (prefilled, flagged fields red+icon, Update & Re-submit), **Processing/Under-review** (read-only + notice); amber security notice; Clear-Fields confirm.
- [ ] Step 3 (#ui): extend `OtpStep` (digit boxes + Resend + attempt-counter/lockout chrome), split `CompletedStep` into **Activated** (green animated check, username, change-pw reminder) and **Failed** (red + WhatsApp); **Under-review** amber view.
- [ ] Sections (#ui): `StatsRow` (gap-aware — static/placeholder/hidden), `WhoWeAre` (static). Wire each region's loading (inline spinner/shimmer) + error/empty.

**Validation**
- [ ] Every region renders from props/context; all 5 form variants + 4 Step-3 views present. / [ ] Logical CSS throughout; no inline strings; no fetching. / [ ] `StatsRow` never shows an error block. / [ ] `tsc` clean; existing Vitest green; no `/src` tests. / [ ] Committed on green.

**Risks**
- Form-variant prop contract must anticipate S3's RHF/mutation wiring (name controlled fields now).
- Password-masking for the Submitted read-only view (never render the real password).

---

## PHASE 3 — ASSEMBLY & WIRING

### Sprint 3: Assembly & Wiring — Steps 1 & 2 (verify-dispatch + form)   — Status: ⬜ Pending

**Goals**
- Verify fully live: `useVerifyKey` seeds `ActivationContext` and dispatches to the correct view for **all 9 `ClientActivationStatus` values**; Step 2 submit/update/correct flows wired with RHF + Zod. Layout survives loading/error. `tsc` + existing suite green.

**Tasks**
- [ ] Verify (#wiring): Step-1 input + client validation (empty / bad-format); `useVerifyKey.mutate({key})` → seed context → subscribe (auto, if `activationId`) → **status→view dispatch** map covering INVALID/READY/SUBMITTED/PROCESSING/NEEDS_CORRECTION/NEEDS_OTP/UNDER_REVIEW/ACTIVATED/FAILED. Loading spinner + disabled field; network/5xx inline errors + WhatsApp.
- [ ] Step 2 Ready (#wiring #forms): `AccountForm` (RHF + aligned schema) → `useSubmitActivation.mutate(command)` (fullName/phone top-level, Snapchat fields → `accountFields`, `confirmPassword` client-only). Success → Submitted view (toast already in-hook).
- [ ] Step 2 Submitted/Correction (#wiring): Update Information re-opens editable; Needs-correction highlights `flaggedFields` + **Update & Re-submit** → `useUpdateActivation.mutate({activationId, {accountFields}})`. Server errors preserve form data.
- [ ] `useMemo` the registry lookup + status→view map.

**Validation**
- [ ] Every status routes to the right view. / [ ] No `useEffect` fetching; failed writes preserve data + global toast. / [ ] Zod errors inline; `confirmPassword` never sent. / [ ] `tsc` clean; existing Vitest green. / [ ] Committed on green.

**Risks**
- The 9-status dispatch is the page's spine — get it exhaustive (switch is total over the enum).
- `accountFields` mapping (which UI field → which `AccountInformation` key).

---

### Sprint 4: Assembly & Wiring — Step 3 + Realtime + Sections   — Status: ⬜ Pending

**Goals**
- Step 3 fully live (OTP submit + completion/failure/review); the realtime backbone re-syncs the view on activator/admin events with reconnect/refocus/polling resilience; informational sections wired (stats gap-aware). `tsc` + existing suite green.

**Tasks**
- [ ] Step 3 OTP (#wiring #forms): digit-box input → `useSubmitAdditionalInfo.mutate({activationId, {accountFields:[{field:OTP,value}]}})`; **Resend** 60s cooldown timer; wrong-OTP attempt counter + lockout message from the error; input preserved on network fail.
- [ ] Completion views (#wiring): Activated (username + change-pw reminder), Failed (WhatsApp), Under-review (amber, read-only) — all driven by the context status.
- [ ] Realtime (#wiring): `subscribeActivation` on verify/submit; the `/client` socket invalidates `qk.keys.status` → `useActivationStatus(activationId, enabled)` refetch → context update → **re-dispatch via S3's status→view map** (events: picked-up→Processing, flagged→Needs-correction, OTP→Needs-OTP, frozen→Under-review, completed→Activated, failed→Failed). `useRealtimeStatus()` → "Connection lost. Reconnecting…" toast + backoff. **Re-verify/refetch on reconnect + window focus/visibility** (`refetchOnWindowFocus` + reconnect handler). **Polling fallback 5–10s** (`refetchInterval` while socket down). Multi-tab latest-wins. **"Check Another Key" → `unsubscribeActivation` + `reset()`** teardown.
- [ ] Sections (#wiring): `WhoWeAre` static; `StatsRow` wire to `usePublicStats` **only if it exists** — else static/placeholder/hidden (§E-1), never an error block.

**Validation**
- [ ] OTP submit ⇒ `useSubmitAdditionalInfo` with the OTP `accountField`; resend cooldown + lockout behave. / [ ] A mocked status change re-dispatches the view; focus/reconnect refetch; teardown unsubscribes. / [ ] Stats section degrades silently. / [ ] No `useEffect` fetching (realtime via the query layer). / [ ] `tsc` clean; existing Vitest green. / [ ] Committed on green.

**Risks**
- Realtime resilience (reconnect vs refocus vs polling) — keep the query layer the single source; the socket only invalidates.
- Multi-tab latest-wins — the newest `activationId` in context must win.

---

## PHASE 4 — POLISH

### Sprint 5: Polish — mobile-first responsive, RTL-readiness, a11y, dark mode   — Status: ⬜ Pending

**Goals**
- Mobile-first responsive pass, verified RTL-readiness (logical CSS, `dir` resolves LTR), a11y on the interactive flow, dark mode, and the success animation. No behavior change. `tsc` + existing suite green.

**Tasks**
- [ ] Responsive (#responsive): mobile 320–576 primary (stacked full-width forms), tablet 577–992, desktop 993+; **44×44** min touch targets; step indicator horizontal-compact on mobile; **header→hamburger <768**; no horizontal scroll.
- [ ] RTL-readiness audit (#infra): grep the portal for physical CSS props (`ml/mr/pl/pr/left/right/text-left/right`) → replace with logical; confirm `dir` plumbing resolves `ltr` and nothing hard-codes direction. (`ar` stays `""`; `rtl:false` stays.)
- [ ] a11y (#a11y): labelled OTP digit boxes (grouped input), step-indicator state announced, form field labels/aria-invalid on errors, WhatsApp/social links have accessible names, focus management on step transitions.
- [ ] Dark mode + anim (#theming): all views read in dark/light (semantic tokens); the Activated green check animation is smooth and reduced-motion-safe.
- [ ] Memoization (#perf): registry lookup + status→view map memoized (only where plan §B8 calls for it).

**Validation**
- [ ] No inline strings introduced. / [ ] `tsc` clean; existing Vitest green. / [ ] No behavior change; no physical-direction CSS left. / [ ] Committed on green.

**Risks**
- Scope creep — flag, don't fix, adjacent pre-existing issues.

---

## PHASE 5 — TESTS

### Sprint 6: Unit Tests — verify dispatch · form variants · OTP · realtime   — Status: ⬜ Pending

**Goals**
- `/tests/unit/pages/client-portal/**` covers the flow with hooks + `useTranslation` mocked (no MSW). All green; both tsconfigs clean.

**Tasks**
- [ ] `ClientPortal.verify.test.tsx` (#testing): empty/bad-format inline errors; each of the 9 `ClientActivationStatus` values routes to the correct view; verify network/5xx branches + WhatsApp; success seeds context + subscribes.
- [ ] `ClientPortal.form.test.tsx` (#testing): Ready Zod errors; valid ⇒ `useSubmitActivation.mutate(command)` with correct `accountFields` + no `confirmPassword`; Submitted read-only + Update Information re-opens; Needs-correction highlights `flaggedFields` + Update & Re-submit ⇒ `useUpdateActivation`; password mismatch; Clear-Fields confirm.
- [ ] `ClientPortal.step3.test.tsx` (#testing): OTP submit ⇒ `useSubmitAdditionalInfo` with OTP `accountField`; wrong-OTP counter; resend cooldown disables/re-enables; Activated shows username + reminder; Failed shows WhatsApp; Under-review read-only.
- [ ] `ClientPortal.realtime.test.tsx` (#testing): a mocked status change re-dispatches the view; window-focus triggers a refetch; "Check Another Key" ⇒ `unsubscribeActivation` + reset; stats section hides/placeholders on absent stats (documents §E-1).
- [ ] Reuse Part-1 shared infra (`mockTranslation`/`renderWithRouter`/`setup.ts`); mock `lib/realtime.ts` + `useActivationStatus`; assert view transitions, not socket internals.

**Validation**
- [ ] `vitest run` green (success/loading/error). / [ ] No `/src` tests; files `.test.tsx`. / [ ] Both tsconfigs clean. / [ ] Committed on green.

**Risks**
- Realtime under JSDOM — mock the socket + status query; assert dispatched views, never socket wiring.
- Ambiguous mocked-key text matches — scope with `within()` (Part-1 discipline).

---

## Net-new / extend recap (from plan §G, sprint-mapped)

| Sprint | Work |
|--------|------|
| S1 | align `account-form.schema.ts`; extend `public.landing.*` i18n; `dir` plumbing + logical-CSS convention; axios 401 auth-exempt for `KEY_ROUTES.*` |
| S2 | `ActivationProvider`/`ActivationContext` (promote `KeyFlowView`); plan-forms registry; extend all region components (shell/StepIndicator/AccountForm 5 variants/OtpStep/CompletedStep split/Under-review/CheckAnotherKeyButton/StatsRow/WhoWeAre) |
| S3 | wire verify → 9-status dispatch; Step-2 submit/update/correct mutations |
| S4 | wire Step-3 OTP + completion/failure/review; realtime re-sync (reconnect/refocus/polling/teardown); sections |
| S5 | mobile-first responsive, RTL-readiness audit, a11y, dark mode, anims |
| S6 | `/tests/unit/pages/client-portal/*.test.tsx` |

**Reused (build nothing new):** `useVerifyKey`/`useSubmitActivation`/`useUpdateActivation`/`useSubmitAdditionalInfo`/`useActivationStatus`, `lib/realtime.ts`, `keys.service.ts`, `LanguageToggle`/`ThemeToggle`/`Logo`, `sonner`, `lib/query-keys.ts`, the `tests/fixtures/wrappers` infra.
**Explicitly out of scope:** CAPTCHA (decision #2); full Arabic copy + `rtl:true` (decision #1); `usePublicStats` until `/api/stats` lands (§E-1).
