---
sprint: 1
title: Foundation — Schemas, sound hook, i18n & role-based login redirect
status: ✅ Done
commit: f186269
---

# Sprint 1 Report — Foundation

## Work done

### Schemas (new)
| File | Notes |
|---|---|
| `pages/login.schema.ts` | `username`/`password` both `.min(1, t("auth.login.emptyFields"))` — the contract's own `LoginSchema` is unconstrained (`z.string()`), so this wrapper adds the "Please fill in all fields." validation the spec wants. |
| `components/sections/activator/freeze-request.schema.ts` | `reason: z.string().min(1, t("common.validation.required"))` → `FreezeRequestCommand`. |
| `components/sections/activator/flag-wrong-info.schema.ts` | `fields: z.array(z.enum(AccountInformation)).nonempty(t("activator.requests.card.selectAtLeastOne"))` → `FlagWrongInfoCommand` — built even though the plan called it optional, for consistency with every other co-located schema in this codebase. |

All 3 export a compile-time-only `AssertAssignable<FormValues extends Command ? true : false>` guard, following the established pattern from Admin Parts 1–3 exactly.

### Plan-fields registry
`components/sections/activator/plan-fields.ts` — `correctableFields(subscriptionLabel)` and `requestableFields(subscriptionLabel)`, keyed by **subscription label** rather than a `planKey`/id, since that's the only plan identifier `ActiveRequestDTO`/`PendingActivationDTO` actually carry. Snapchat+ = collected `{USERNAME, EMAIL, PHONE_NUMBER, PASSWORD}`, requestable `{OTP}` (OTP is never in the "collected" set — it's requestable-only, corrected from an earlier draft that conflated the two).

### `useNotificationSound` (net-new hook)
`hooks/useNotificationSound.ts` — `{muted, toggleMute, playChime}`. `muted` persists to `localStorage` under `sv_notif_muted`. `playChime()` synthesizes a short two-tone beep via the Web Audio API (two sine oscillators, 660Hz→880Hz, ~0.3s total) rather than playing a shipped audio file — see Decisions below.

### i18n
7 new keys: `auth.login.{emptyFields,lockout,network}` (login validation/429/network-error copy) and `activator.shell.{soundOn,soundOff,connectionLost,sessionExpired}` (shell sound-toggle labels + connection/session copy for Sprint 2). See Decisions for why this sprint's i18n additions are narrower than Admin Part 3's Sprint 1.

### Login redirect (E-4)
- **`components/layout/ProtectedRoute.tsx`**: `PublicOnlyRoute` now reads `useSession()` directly (same reasoning as `AdminGuard`'s existing comment — `AuthCtx` deliberately doesn't expose `role`) and redirects to `/admin` or `/dashboard` based on `session.role`, instead of an unconditional hardcoded `/dashboard`.
- **`pages/LoginPage.tsx`**: removed the explicit `nav("/dashboard")` entirely. Post-login, `useLogin`'s `onSuccess` already invalidates `qk.auth.me()`; the resulting refetch updates the session cache that `PublicOnlyRoute` is already subscribed to (it's rendering this very page), so the guard's own `<Navigate>` fires reactively — no page-level navigation code needed at all. Also added: `loginSchema` validation (replacing native `required` attributes with translated inline errors), and a `loginErrorKey()` helper branching 429→lockout, no-response→network, else→existing generic 401 copy.

## Validation results
- `npm run check` (both `tsconfig.json` and `tsconfig.test.json`) ✅ clean.
- `npx vitest run` ✅ 54/54 files, 393/393 tests green (unchanged baseline — Foundation adds no test files).
- `npx eslint` on every touched/new file: 6 pure-Prettier findings (mostly pre-existing unformatted lines in the ported MVP `LoginPage.tsx`, now flagged because the file was touched), fixed via scoped `--fix`; 0 errors after.
- **Live-verified** (not just read-through) via Playwright against the running dev server + live API, since this sprint edits shared root-level auth-routing code with app-wide blast radius: created a fresh test activator through the Admin UI, then confirmed all four redirect paths —
  1. Admin login → `/admin` ✅
  2. Authenticated admin hitting `/login` directly → stays on `/admin` (previously would have wrongly sent to `/dashboard`) ✅
  3. Activator login → `/dashboard` ✅
  4. Authenticated activator hitting `/login` directly → stays on `/dashboard` ✅

## Decisions & deviations

- **Chime is synthesized (Web Audio API), not a shipped asset** — asked the user: no `public/` directory exists yet in this app, and there was no audio asset to source. User chose Web Audio synthesis over generating a binary WAV file, for zero bundle weight and no asset-sourcing/licensing surface. `useNotificationSound.ts` documents this choice inline.
- **Login redirect uses guard-only architecture, not an explicit page-level `nav()`** — asked the user: since `PublicOnlyRoute` needed the identical role-based fix as `LoginPage`'s own redirect (found while investigating E-4), there were two valid designs (explicit nav in both places vs. fix the guard only and let it react declaratively). User chose guard-only, matching `ProtectedRoute.tsx`'s own pre-existing stated philosophy ("declarative `<Navigate>` gates rather than the MVP's imperative `useEffect`+`navigate()` redirects").
- **`PublicOnlyRoute`'s identical hardcoded-`/dashboard` bug fixed alongside `LoginPage`'s** — not explicitly named in the plan's E-4 row (which only cites `LoginPage.tsx:35`), but it's the same bug class and blocks the exact same scenario (an admin ending up on the activator dashboard), so fixing it now closes the gap the plan's E-4 was actually trying to close.
- **i18n scoped narrower than the task's literal wording** — added only login/shell copy this sprint, not dashboard/history/requests/action-modal copy. Reasoning: this portal's pages are already ~80% built (unlike Admin Part 3's from-scratch Sprint 1), and several existing keys (`activator.requests.card.done*`, `release*`) are slated for replacement, not extension, once Sprint 2 rebuilds the Active-card actions to match the spec's real Activate/Cancel semantics. Naming their final replacements now, before that rebuild, risked keys that don't fit the eventual component shape.
- **Found a real bug for Sprint 4, not fixed now**: `ActiveRequestCard.tsx`'s "Cancel" button calls `useReleaseActivation` (endpoint `RELEASE`, returns the card to the pending pool) instead of `useCancelActivation` (endpoint `CANCEL`, terminal `CANCELLED_BY_ACTIVATOR` state) — confirmed against both the spec doc and the sprint plan's own D4 hook naming. Out of Foundation's scope; flagged in this file's Risks section for Sprint 4.
- No architecture shift — `plan.md` untouched beyond the two user-approved implementation choices above.
