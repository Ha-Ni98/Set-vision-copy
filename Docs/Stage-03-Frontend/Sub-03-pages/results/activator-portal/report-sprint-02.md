---
sprint: 2
title: Primitives & States — shell + all four pages
status: ✅ Done
commit: a9198d0
---

# Sprint 2 Report — Primitives & States

## Work done

### Shell (`ActivatorHeader`/`ActivatorSidebar`/`ActivatorLayout`)
Added the sound-toggle button (`useNotificationSound`, `Volume2`/`VolumeX` swap). Bell chrome, EN|FR, dark mode, and Sign-Out confirm were already complete — untouched. `ActivatorSidebar`'s active-route highlight, mobile slide-over, and pending badge were already built; kept the badge showing the activator's own active-request count rather than the global pending-pool count, respecting the codebase's own pre-existing `§8.Q5` decision (found no evidence in this sprint's scope to override it). `ActivatorLayout` needed no changes.

**Connection indicator deliberately deferred to Sprint 4** — the plan's own task lists split this precisely: Sprint 2 gets a "connection-indicator slot," Sprint 4 gets "connection indicator via `useRealtimeStatus`." Wiring the live hook now would blur that split for no benefit.

### Login
Already fully satisfied by Sprint 1's redirect-fix work (429/network/empty validation, show/hide, disabled+spinner). No Sprint 2 changes needed — noted in the sprint doc rather than silently skipped.

### Dashboard
Added the missing empty/new-activator state: when `totalActivations === 0`, the weekly-chart slot swaps to an `EmptyState` ("No activity yet"), and the "Go to Active Requests" button becomes filled (not outline) — the plan's "emphasised quick action."

### History
- Section A: added its missing empty state ("No activations yet.") — previously had none at all.
- Section B: split the single "no match" message into two real states — a true first-time-empty ("You haven't completed any activations yet…" + a `<Link>` to `/requests`) and a filtered-no-match (existing message + a new **Clear** button, which was also missing).
- Added the missing date-range filter (`dateFrom`/`dateTo`), wired straight into `GetActivatorHistoryQuery`.
- Added the missing Fastest/Slowest sort options alongside the existing three.
- Added retry actions to both sections' error states (previously silent dead ends).
- Added tap-to-call to Section B's phone column.

### Active Requests (`ActiveRequestCard` rewrite)
- Added the collapsible distributor block (was always-expanded).
- Added tap-to-call for the client phone.
- Added the missing OTP row — `otpValue` is a field separate from `accountFields` on `ActiveRequestDTO` and was never rendered at all before.
- `WrongInfoModal`/`FreezeModal` now use Sprint 1's schemas (`flagWrongInfoSchema`/`freezeRequestSchema`) and the plan-fields registry (`correctableFields()`) instead of a hardcoded field array.
- **Two action bindings replaced** — see Decisions below, this is the sprint's most consequential change.
- Added the missing "3/3 slots full" notice and retry actions to `RequestsPage`'s error states.

## Decisions & deviations

### Replaced the email-collecting "Done" modal with a direct Activate button
The original card's Activate flow opened a modal asking for an "activation email," then called `useActivateRequest.mutate(req.id)` — the email was never sent anywhere (the mutation takes only an id; the code's own prior comment admitted this was a "typed no-op"). Cross-checked the original spec doc (`SV-PAGE-002-005_activator_portal_spec.md` line 235: *"Activate → state ACTIVATED, card → ACTIVATED, card leaves the queue (exit anim)"* — no confirm, no fields, contrasted explicitly with Cancel's *"confirm →"* wording two lines below). Removed the modal entirely; Activate is now a single button calling the mutation directly.

### Fixed Cancel to call the correct endpoint
Per Sprint 1's flagged finding: the card's "Cancel" button called `useReleaseActivation` (endpoint `RELEASE`) instead of `useCancelActivation` (endpoint `CANCEL`, terminal `CANCELLED_BY_ACTIVATOR` state). Fixed now — `useReleaseActivation.ts` is deleted (confirmed fully orphaned: no other consumer, and the spec's "release" is a backend-only auto-timeout mechanism, never a manual action), `useCancelActivation` gained the toast it was missing (reusing the existing `"Request cancelled."` copy, which already fit), and the confirm dialog's copy changed from "Release this request?" to "Cancel this activation?" with copy describing the real terminal-state consequence.

### Gating derived from `req.state`, not a local flag
The original card tracked freeze-lock via a `useState(false)` flag set only inside the Freeze mutation's `onSuccess` — a card that mounts already `FREEZE` (e.g. a page refresh mid-freeze) would show every action as enabled until the admin resolved it, since the local flag never got set in that scenario. Replaced with `isFrozen = req.state === ActivationStat.FREEZE`, computed fresh every render from the DTO itself. This is also the "gating prop" the plan's own risk note asked this sprint to expose for Sprint 4.

### Kept existing hook wiring in place — didn't strip to fully static
This portal's pages already call real data/mutation hooks directly (unlike Admin Parts 1–3's from-scratch Sprint 2s, which built genuinely prop-driven dumb components before any hook existed). Re-architecting already-working, already-tested wiring into a stripped-down static shape just to re-wire it in Sprint 3/4 would be pure churn with no behavioral benefit, so "Primitives & States" here means *complete the presentation and states*, not *remove hooks*. `ActiveRequestCard` keeps its self-contained-hooks shape (each card owns its own mutation instances) — this is also the *correct* shape for a 0–3 list of independently-actionable cards: a page-level single mutation instance shared across cards would incorrectly couple their `isPending` states together.

### `useReleaseActivation.ts` deleted, not just unwired
Confirmed zero remaining consumers (including its own service function `activationsService.release`, which stays — kept per this codebase's "services stay complete regardless of current UI consumption" convention already established across Admin's hooks). A test (`tests/integration/hooks/activations.test.tsx`) exercised the now-deleted hook; removed that one case and its import, leaving the file's other hook-invalidation tests untouched.

## Validation results
- `npm run check` (both `tsconfig.json` and `tsconfig.test.json`) ✅ clean.
- `npx vitest run` ✅ 54/54 files, 392/392 tests green (356+37 baseline minus the one removed `useReleaseActivation` case).
- `npx eslint` scoped to this sprint's 9 touched files: ~84 findings, the overwhelming majority pure-Prettier reflow of pre-existing unformatted MVP code (same pattern as Sprint 1's `LoginPage.tsx`), fixed via scoped `--fix`; a handful of pre-existing `@typescript-eslint/no-explicit-any` findings (unnecessary `ColumnDef<T, any>` second type params, and untyped Radix `onValueChange` callbacks) were cleaned up too since the surrounding lines were already being touched; one `react-hooks/exhaustive-deps` warning fixed by inlining the array-derivation into its `useMemo` instead of depending on a fresh-reference variable computed outside it. 0 errors after.
- **Light browser verification** via Playwright (not a full sweep, but proportionate to this sprint's real functional changes — modal removal, gating rewrite): logged in as the test activator created in Sprint 1, screenshotted Dashboard/History/Requests. Confirmed: Dashboard's new empty state + emphasized CTA render correctly; History's Section A empty state, Section B's proper first-time-empty message, and the new date-range inputs all render correctly; Requests' 0/3 empty states and the sound-toggle button (icon + aria-label swap on click) all work. Did **not** visually verify the rewritten `ActiveRequestCard` itself — there was no live active request to render one against, and manufacturing a full client-submission-to-taken flow just to look at the card wasn't a proportionate use of time given the card's logic is already verified at the code level (every field checked against the DTO schema) and will be exercised directly by Sprint 6's unit tests.

## Sprint plan status
Admin work is untouched this sprint (out of scope). Activator Portal: 2/6 sprints done. Next = S3 (Assembly & Wiring — Login + Dashboard + History) — though Login/Dashboard/History's core wiring already exists from the MVP, so S3 will mostly be a verification + gap-filling pass (e.g. whether History's new date-range filters actually need any query-shape changes beyond what's already built).
