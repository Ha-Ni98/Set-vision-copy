---
sprint: 2
title: Primitives & States — Context, registry & all region components
status: ✅ Done
commit: 0bbcbff
---

# Sprint 2 Report — Primitives & States

## Work done

### `ActivationContext` — a deliberate design choice
Built `ActivationProvider`/`useActivation()` holding the flow's raw verification data (`{key, status, planKey, activationId, subscriptionLabel, submittedFields, flaggedFields, requestedFields, accountUsername} | null`) plus `reset()`. This is **not** a straight port of the old `KeyFlowView` union — that type baked "which screen to show" directly into the state (`{name: "FORM"} | {name: "OTP"} | ...`), which is exactly the thing that couldn't distinguish Submitted from Ready from Processing from Needs-correction (all collapsed into `"FORM"`). The new context holds only what the backend said; deciding which view a given `status` maps to is kept as a separate concern for Sprint 3's status→view dispatch to own.

Wraps `PublicLayout` at the router level — in **both** places it's used (the real `/` route, and the standalone `PublicLayout` the catch-all-404 renders for unauthenticated users) — so `PublicHeader`'s logo can call `reset()` on click. Found the second usage by grepping for `PublicLayout` after wiring the first; missing it would have crashed the 404 page for a logged-out visitor the first time `useActivation()` ran outside a provider. `LandingPage.tsx` itself doesn't consume the context yet — it's still on its pre-existing local `useState<KeyFlowView>`, unchanged. That's Sprint 3, when the context and the real dispatch land together.

### Plan-forms registry
`getPlanForm(planKey)` → `{ FormComponent, fieldSchema, AdditionalInfoComponent }`, one Snapchat entry. Kept intentionally simple — no abstract multi-plan type machinery for a system that has exactly one plan today; a second plan gets its own entry (and whatever prop adjustments it needs) when it actually exists.

### Shell — two real inline-string bugs fixed
`PublicHeader`'s social icons had `aria-label="Instagram"`/`aria-label="WhatsApp"` hardcoded as raw English, and the mobile hamburger sheet's equivalent links had literal **visible** "Instagram"/"WhatsApp" text — not just an aria-label problem, actual on-screen inline strings. Both fixed with the `common.social.*` keys added in Sprint 1. Logo is now a real `<Link to="/">` that also calls `reset()`. Social links now use real (placeholder) URLs with `target="_blank" rel="noopener noreferrer"`. `StepIndicator` needed no changes — its completed/active/future treatment already matched spec exactly. New `CheckAnotherKeyButton` component (visibility logic deferred to Sprint 3, since that's `LandingPage`'s call).

**Placeholder URLs, per your answer**: added `config/social-links.ts` with obviously-placeholder Instagram/WhatsApp/Facebook URLs and `"#"` for Terms/Privacy (no real page exists at all for those) — one file to swap in real values later.

### Step 2 — `AccountForm` gaps
Most of the 4 variants (Ready/Submitted/Needs-correction/Processing) already existed from the pre-existing MVP. Concrete gaps closed:
- **Removed `UNDER_REVIEW`** from the component's own read-only-status handling entirely — the status→view dispatch table sends that status to a dedicated Step-3 view, never to Step 2. (The plan's own D3 wording lists "Processing/Under-review" as one variant name, which reads as shorthand for "the read-only bucket," not a literal second Step-2 destination for Under-review specifically.)
- **Split the shared "pending" banner**: Submitted now shows the existing 15-minute-notice-and-WhatsApp copy; Processing shows a new, separate `processingNotice` with no WhatsApp link — previously both statuses showed identical text.
- **Added the missing Clear-Fields confirmation** — the button used to clear the form immediately with zero confirmation; now behind an `AlertDialog`.
- **Added a visible icon next to flagged/error fields** — previously text-only despite the spec wanting "red border + error icon."
- **Renamed `phoneNumber` → `snapchatPhone`** (Sprint 1's deferred rename) and switched the submit/update mapping to Sprint 1's `toSubmitCommand`/`toUpdateCommand` helpers, which fixes the real bug those helpers existed for: the optional Snapchat-phone field used to be silently dropped from the submitted data when left blank, instead of defaulting to the Group-A phone.

### Step 3 — `OtpStep` + the Completed-step split
`OtpStep` gained a 5-attempt counter with lockout (disables input/resend/submit), and distinguishes a wrong-code response (counts against the limit) from a network/5xx failure (doesn't — spec: "network fail → retry with preserved input"). `CompletedStep.tsx` needed no changes at all — it already correctly implements the spec's "Activated" view precisely, so it's kept as exactly that (not renamed, not restructured). Added two new sibling components, `FailedStep.tsx` and `UnderReviewStep.tsx` — the old code only had one generic `message.failed*` pair built for the MVP's simpler single-view-type model, not the spec's dedicated completion-style failure card or the Under-review amber notice.

### Sections
`StatsRow`/`WhoWeAre` needed no changes — both are already fully static with no data hook and therefore no possible loading/error state, and already document the §E-1 stats gap in an existing code comment.

## Validation results
- `npm run check` (both tsconfigs) ✅ clean.
- `npx vitest run` ✅ 59/59 files, 439/439 tests (unchanged — no page tests yet, that's Sprint 6).
- `npx eslint` scoped to all 12 touched/new files — a handful of Prettier-only findings, fixed; 0 errors after (one pre-existing `react-refresh/only-export-components` warning on the new `ActivationProvider.tsx`, matching the same pattern `AuthProvider.tsx`/`LanguageProvider.tsx` already have — not something to restructure for this sprint).
- **Live Playwright verification**: confirmed the logo is a real `<a href="/">`, the Instagram link's `href`/`target="_blank"` are correct, the mobile sheet renders all links with translated text (not the old hardcoded English), and — the one genuine regression risk this sprint introduced — the unauthenticated 404 catch-all route renders correctly now that its own separate `PublicLayout` usage is wrapped in `ActivationProvider` too.

## Sprint plan status
Client Portal: 2/6 sprints done. Next = S3 (Assembly & Wiring — Steps 1 & 2), where `LandingPage.tsx` actually gets rewired onto `ActivationContext` and the full 9-status dispatch replaces the old 5-bucket `KeyFlowView` switch.
