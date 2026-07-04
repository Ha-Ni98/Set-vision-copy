---
sprint: 6
title: Unit Tests — verify dispatch · form variants · OTP · realtime
status: ✅ Done
commit: f3b5f9f
---

# Sprint 6 Report — Unit Tests (final sprint)

## Work done

### Shared harness
New `tests/unit/pages/client-portal/support/{mockHooks,renderLandingPage,testHelpers}.ts` — the four test files all exercise the same `LandingPage` tree from different angles, so the `vi.mock()` registrations (all five client-portal hooks + `lib/realtime`), the `<ActivationProvider><LandingPage/></ActivationProvider>` render wrapper, and small `mutationMock()`/`statusQueryMock()` helpers are centralized once, following the same "shared side-effect import" pattern `tests/fixtures/wrappers/mockTranslation.ts` already established.

### Four test files, 34 new tests
- **`ClientPortal.verify.test.tsx`**: client-side empty/bad-format errors never reach the mutation; loading disables the field; network vs. 5xx error copy; all 9 `ClientActivationStatus` values routing correctly via one `it.each`, plus INVALID specifically confirmed to stay on Step 1 (not a full-screen replacement).
- **`ClientPortal.form.test.tsx`**: Ready's empty-submit Zod errors (scoped per-field by `id`, since several fields collapse to an identical mocked-translation string); a valid submit's exact `accountFields` payload with `confirmPassword` absent; password mismatch; Clear-Fields confirm/cancel; Submitted's masked password + Update Information re-opening it blank; Processing's genuinely zero actions; Needs-correction's prefill + flagged indicator + the exact `useUpdateActivation` payload.
- **`ClientPortal.step3.test.tsx`**: OTP's exact mutate payload; a network failure preserving the code without counting as an attempt; full 5-attempt lockout; the 60s resend cooldown; Under-review/Activated/Failed's read-only content and links.
- **`ClientPortal.realtime.test.tsx`**: a mocked `useActivationStatus` change re-dispatches the view with zero clicks; "Check Another Key" unsubscribes the *current* activationId (and no-ops safely when nothing was ever verified); the stats section never shows an error block.

## Three real bugs found while writing these tests
1. **Step 1's 5xx/Invalid views were missing their spec-mandated WhatsApp link.** The plan explicitly lists these views alongside Under-review/Failed (which already had one, from Sprint 2) — Step 1 itself never did. A plain Sprint 3 oversight, fixed in `LandingPage.tsx`.
2. **The Step 1 key input was never disabled while verifying** — only the submit button was. Spec: "field disabled" during loading. Fixed.
3. **The most significant one**: `AccountForm`'s inputs all carried the native HTML `required` attribute alongside RHF+Zod validation. Browsers (and JSDOM) block a form's submit event via native constraint validation *before* React's own `onSubmit` handler runs, whenever a `required` field is empty — meaning a real user submitting a totally blank Ready form would see the **browser's own unstyled, un-translated tooltip**, never this app's carefully worded, localized Zod error. This app's own established convention (`LoginPage`, built without RHF+`required`) already avoids this exact trap; `AccountForm`'s use of `required` was a leftover MVP artifact never reconciled. Removed all 6 occurrences — Zod/RHF is now the sole, working source of validation feedback, matching the rest of the app.

## One test moved to the correct layer instead of forced into the page
"Window-focus triggers a refetch" (this sprint's own task, for `ClientPortal.realtime.test.tsx`) can't actually be observed through a page test that fully mocks `useActivationStatus` — the `refetchOnWindowFocus: true` option lives *inside* that hook, invisible once the hook itself is replaced. Added a proper test to `tests/integration/hooks/keys.test.tsx` instead (real `QueryClient` + MSW): dispatching a `visibilitychange` event on `window` — TanStack Query v5's `FocusManager` listens for exactly that event, on that target, not a `focus` event and not on `document` (confirmed by reading `@tanstack/query-core`'s own source) — and asserting a second network call fires.

## Two new JSDOM gaps, added to the shared `setup.ts`
Every one of these page tests renders the full `LandingPage`, which includes `StatsRow` (an `IntersectionObserver`-driven counter) unconditionally. JSDOM has no `IntersectionObserver` — added a no-op stub, matching the file's own existing precedent for `ResizeObserver`. Separately, typing into the OTP digit boxes hit `document.elementFromPoint is not a function` — the `input-otp` library polls it for internal caret tracking — stubbed the same way.

## Fake timers + the full page don't mix
The OTP resend-cooldown test originally rendered the *entire* `LandingPage` under `vi.useFakeTimers()`, which reliably hung the test run (something in React's scheduler and/or `StatsRow`'s `requestAnimationFrame` loop fighting the faked clock — never resolved cleanly even scoping `toFake` to just `setTimeout`/`clearTimeout`). Fixed by mounting `OtpStep` directly for that one test instead of going through the full page — the cooldown timer is entirely `OtpStep`'s own concern, so this is a better-scoped test, not merely a workaround for the hang.

## Validation results
- `npm run check` (both tsconfigs) ✅ clean.
- `npx vitest run` ✅ 63/63 files, 475/475 tests (439 baseline through Sprint 5 + 34 new page tests + 1 new hook-level focus-refetch test + 1 net-new file for that hook test = the existing `keys.test.tsx`).
- `npx eslint`/`prettier` scoped to all 12 touched/new files — 0 errors after one scoped `--fix`.

## Sprint plan status
**Client Portal: 6/6 sprints done — complete.** All 9 `ClientActivationStatus` values, both write flows (submit/update), OTP, realtime re-sync, and the full polish pass are built, wired, and tested. This closes out the last of the three re-spec builds tracked under Stage 03 Sub-03 (Admin Parts 1–3, Activator Portal, Client Portal all now complete).
