# Step 2 pending-state UX — Execution Report

**Implemented exactly per** `Docs/Stage-04-fix/plan/pending-step2-ux-plan.md`.
**Date:** 2026-08-11 · **Branch:** `version-02-01`

Not part of the numbered Stage-04-fix set sequence — a standalone UX request. Web only, as
scoped: no contract change, no backend change, no migration.

---

## Files created

**`Apps/web`**
- `src/components/sections/landing/PendingOverlay.tsx` — `PendingOverlay` (the default scrim:
  spinning ring, Darija+French title, looping indeterminate bar, hold/contact lines, "Show my
  information" button) and `PendingRevealedStrip` (the compact status strip shown once revealed)

## Files modified

**`Apps/web`**
- `tailwind.config.ts` — `theme.extend` += `keyframes["indeterminate-bar"]` and
  `animation["indeterminate-bar"]` (1.6s linear loop, `translateX(-100%)` → `translateX(400%)`)
- `src/components/sections/landing/AccountForm.tsx`:
  - added `showInfo` state and the derived `isPending = isReadonlyStatus && !editing`
  - wrapped the two `<fieldset>`s in a `relative min-h-[22rem]` container
    (`aria-hidden={isPending && !showInfo}`)
  - renders `<PendingRevealedStrip>` above the wrapper when `isPending && showInfo`, and
    `<PendingOverlay>` inside the wrapper when `isPending && !showInfo`
  - **deleted** the old amber warning box (the `pendingBanner`/`processingNotice` text + inline
    WhatsApp link) — replaced by the overlay/strip
  - removed the now-unused `SOCIAL_LINKS` and `MessageCircle` imports
  - `isReadonlyStatus && !editing` (two call sites) replaced by the new `isPending` constant
- `src/config/translations.json`:
  - **added** 8 keys under `public.landing.pending.*` (`titleDarija`, `titleFrench`,
    `holdDarija`, `holdFrench`, `contactDarija`, `contactFrench`, `showInfo`, `hideInfo`) — the
    narrative pairs identical under `en`/`fr`, the two action labels normally translated, `ar: ""`
    throughout
  - **removed** `public.landing.form.pendingBanner` and `public.landing.form.processingNotice`
    (confirmed no remaining call site by grep before deletion) — this also removes the
    contradiction between the old "15 minutes" promise and the new 1-hour line, since the
    1-hour line is now the only timing statement on screen

## Migration: none

---

## Deviations from the plan

None. The scrim/reveal structure, the two-animation motion budget
(`motion-safe:animate-spin` ring + custom `motion-safe:animate-indeterminate-bar`), the
`aria-live="polite"` text regions with `aria-hidden` decoration, the omission of call/WhatsApp
buttons inside the overlay (the Set 12 `SupportBanner` already covers that directly below), and
the identical `SUBMITTED`/`PROCESSING` treatment all match the plan as written.

---

## Definition of done

- `npx tsc --noEmit` — clean in `Apps/web` (contract/api untouched, not re-checked for this
  web-only change)
- eslint — `PendingOverlay.tsx` needed a prettier `--fix` scoped to itself (two JSX-wrapping
  formatting fixes, no logic change); `AccountForm.tsx`, `social-links.ts`, `tailwind.config.ts`
  clean as written
- `git status` confirms no test file was created, modified, or deleted
- No new dependency — `animate-spin`/`animate-pulse` are Tailwind built-ins,
  `indeterminate-bar` is one keyframe added to the existing config, no animation or
  virtualization library
- No inline strings in JSX — all 8 new keys live in `translations.json`, `ar: ""` throughout
- Every animation is behind `motion-safe:`
- `pendingBanner`/`processingNotice` removed only after confirming (grep) no remaining caller

---

## Not done this session

**The UI was not exercised in a browser.** No dev server was started; verification is `tsc` +
`eslint` only, plus reading the diff against the plan's worked layout. The manual checklist below
covers what a live check should confirm — items 2, 7, and 9 (the animations actually moving,
`prefers-reduced-motion` behavior, and screen-reader announcement) are the ones code review alone
cannot verify.

---

## Manual test checklist

1. **Pending shows the scrim.** Submit a fresh activation. The fields are covered by a blurred
   scrim with a spinning ring, the Darija + French title, a looping bar, and the 1-hour line.
2. **The bar and ring actually move.** Both animate continuously; the clock icon itself stays
   upright (only the ring around it rotates).
3. **Reveal works.** Tap "Show my information" → scrim disappears, the submitted values are
   readable, and the compact pending strip appears above them. Tap "Hide" → scrim returns.
4. **Fields stay locked when revealed.** After revealing, every input is still disabled; typing
   does nothing.
5. **Edit path survives.** In `SUBMITTED`, "Update Information" is visible and reachable *without*
   revealing first (it sits below the scrim area, in the footer). Clicking it removes the overlay
   and enables the form; values are prefilled.
6. **`PROCESSING` looks identical.** Have an activator take the request. The client's view shows
   the same overlay — and still has no "Update Information" button (`canEdit` remains
   `SUBMITTED`-only, unchanged).
7. **Reduced motion.** Enable "reduce motion" in the OS/devtools. The ring and bar render
   statically — no spin, no loop — and everything stays legible.
8. **360px.** At 360×640 nothing overflows horizontally, the overlay covers exactly the fieldset
   area, and the toggle button is a comfortable tap target.
9. **Screen reader.** With VoiceOver/NVDA, the pending message is announced once; the concealed
   fields are not read out; the animation is not announced repeatedly.
10. **The 15-minute promise is gone.** Search the rendered page — no "15 minutes" text remains in
    either language; the only timing statement is the 1-hour line.
11. **Language toggle.** EN↔FR: the Darija and French narrative lines are identical in both; only
    "Show/Hide my information" switches language.
12. **Live transition still works.** With the client's tab open, have the activator flag a field →
    the view flips to the correction form (overlay gone, fields editable) without a reload.
