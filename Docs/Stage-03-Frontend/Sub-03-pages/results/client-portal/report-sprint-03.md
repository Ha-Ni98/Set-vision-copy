---
sprint: 3
title: Assembly & Wiring — Steps 1 & 2 (verify-dispatch + form)
status: ✅ Done
commit: TBD
---

# Sprint 3 Report — Assembly & Wiring (Steps 1 & 2)

## Work done

### `LandingPage.tsx` rewired onto `ActivationContext`
Replaced the old local `useState<KeyFlowView>` entirely with `useActivation()`. A new `viewForStatus()` is a total `switch` over all 9 `ClientActivationStatus` values (with a compile-time `never`-exhaustiveness guard in `default`, not just informal coverage) — this is the exact function Sprint 4's realtime re-dispatch will reuse, so it had to be a pure mapping of `status` alone: INVALID/READY/SUBMITTED/PROCESSING/NEEDS_CORRECTION → `"form"`; NEEDS_OTP → `"otp"`; UNDER_REVIEW → `"review"`; ACTIVATED → `"activated"`; FAILED → `"failed"`. `INVALID` intentionally still renders Step 1 (with a red border + inline message), not a full-screen replacement — the old MVP's `MESSAGE` view conflated "key not found" with "key deactivated" under `ClientActivationStatus.FAILED`, which is actually a different, later-lifecycle concept per the spec (`FAILED` = a fully-processed activation that failed, handled by Sprint 2's `FailedStep`). The three now-dead `message.failedTitle`/`failedBody`/`invalidTitle` i18n keys (only ever read by the code being replaced) were deleted rather than left as orphans; `message.invalidBody` stays, now used inline at Step 1. `getPlanForm()`'s registry lookup and the status→view mapping are both `useMemo`'d per the sprint's own task.

### Step 2 — `AccountForm` correctness fixes
Three real, spec-contradicting bugs found while wiring this in (not just "align," genuine fixes):
1. **Wrong post-submit status.** The pre-existing code moved straight to `PROCESSING` after `useSubmitActivation` succeeded. The spec's own API table says submit resolves to **`Submitted`** (`PENDING`) — `PROCESSING` is what the *update* endpoint returns. Fixed by branching on `status === READY` (→ submit) vs. everything else (→ update), and — since AccountForm's internal `useState(keyData.status)` had no way to know the mutation's real result — removed that duplicate state entirely. The component is now fully controlled by `keyData.status` (a prop), and the mutation's own returned `ClientActivationStatusDTO` is threaded back up through a new `onSubmitted(result)` callback into `ActivationContext`, keeping one single source of truth instead of two states that could drift.
2. **Wrong endpoint for a Submitted re-edit.** Clicking "Update Information" on an already-Submitted entry used to re-POST `/submit` (the fresh-creation endpoint) instead of using `/update` — only a `READY` key has never had an activation created, so only `READY` should ever hit `/submit`; Submitted-edit and Needs-correction now both correctly share the update path.
3. **Plaintext password left in a disabled field.** After a successful write, the password input kept whatever the user had just typed, now shown disabled — a real display leak, since the backend never returns a real password to redisplay on a genuine reload (verify's contract explicitly omits it). Fixed by force-masking the field back to dots (`setValue("password", MASKED_PASSWORD)`) on every successful write, and by blanking it (not leaving the mask) when "Update Information" re-opens the form — otherwise the mask string itself could be silently resubmitted as the literal new password.

Also: "Update Information" is now correctly gated to `SUBMITTED` only — Processing's "D) no edit" (spec §Step 2) was previously unenforced (the button silently appeared for Processing too).

### Two bugs found only by live-testing the wired flow, not by reading the code
1. **The empty-key validation was unreachable.** The Verify button was `disabled={verifyKey.isPending || !input.trim()}` — with an empty input the button is disabled, and a disabled default submit button also blocks a form's *implicit* submission on Enter. This sprint's own task ("empty → inline message") was dead on arrival until the disabled condition dropped `!input.trim()`.
2. **"Check Another Key" was a no-op from Step 1.** Spec: the button is "always visible," including before any key was ever verified. Clicking it while `activation` is already `null` (typed something, never verified, wants a fresh start) is a null→null context update — nothing re-renders, so an effect keyed on `activation` alone never re-fires to clear the page's own local input/error state. Fixed by adding a `resetToken` counter to `ActivationContext`, bumped on every `reset()` call regardless of the prior value; `LandingPage` keys its local-state-clearing effect on that instead, so both the header logo and this button reliably clear the page even from a still-null state.

### Smaller find: 3 WhatsApp links still pointed at `href="#"`
`AccountForm`'s pendingBanner, `FailedStep`, and `UnderReviewStep` (all built in Sprint 2, after `config/social-links.ts` already existed) never got switched to `SOCIAL_LINKS.whatsapp` — an oversight, now fixed, all three open the same placeholder WhatsApp URL in a new tab, consistent with the header/footer.

## A reasoned (not escalated) design call
A correct OTP submission resolves to `PROCESSING` (spec §Step 3A: "activation returns to `PROCESSING`"), which under the pure status→view map above revisits Step 2's `AccountForm` read-only view rather than staying on a Step-3-style card — visually a step backward in the indicator. This wasn't escalated: the dispatch must be a pure, total function of `status` alone (Sprint 4 reuses this exact map), so `PROCESSING` can only ever mean one view regardless of which path reached it. Sprint 2 already made and documented the equivalent call — Processing stays Step-2-anchored, Under-review moved to Step 3 — and the spec's own "Step 2/Step 3" hedge for this specific status reads as the spec authors leaving this open deliberately. Re-litigating it now would make Sprint 2's already-validated `AccountForm` D-variant dead code without new evidence it was wrong.

## Validation results
- `npm run check` (both tsconfigs) ✅ clean.
- `npx vitest run` ✅ 59/59 files, 439/439 tests (unchanged — page tests are Sprint 6).
- `npx eslint` scoped to all 7 touched files — 0 errors (1 pre-existing `react-refresh/only-export-components` warning on `ActivationProvider.tsx`, same established pattern as `AuthProvider`/`LanguageProvider`).
- **Live Playwright verification**, backend mocked via route interception (no real API running): all 9 `ClientActivationStatus` values confirmed routing to their correct view; a real Ready→fill-form→Save & Submit round-trip confirmed transitioning client-side to the Submitted read-only view with the password re-masked and the correct `accountFields` payload (`PHONE_NUMBER` defaulting to the Group-A phone since Snapchat-phone was left blank, matching Sprint 1's `toAccountFields()`); Update Information confirmed blanking the password field; empty/bad-format/network Step-1 error paths and the "Check Another Key" reset-from-Step-1 fix all confirmed.

## Sprint plan status
Client Portal: 3/6 sprints done. Next = S4 (Assembly & Wiring — Step 3 + Realtime + Sections): OTP wiring is already functionally in place from Sprint 2/3 (this sprint renamed its callback to thread the mutation result into context, matching the AccountForm pattern), so S4's real remaining work is the realtime backbone (subscribe/reconnect/refocus/polling/teardown) and the stats-gap-aware sections.
