---
sprint: 5
title: Polish — mobile-first responsive, a11y, dark mode, animations
status: ✅ Done
commit: TBD
---

# Sprint 5 Report — Polish

## Work done

A large fraction of this sprint's own checklist was already correct from earlier sprints — sidebar slide-over, tap-to-call, dark-mode tokens, pending-pool full-width mobile Activate, and the OTP badge's amber pulse all pre-existed and were verified, not rebuilt. The real work was five gaps found by actually checking each task line against the live app, plus a couple of self-inflicted regressions caught and fixed before they ever reached a commit.

### 44×44 touch targets — and two regressions this same fix caused, fixed within the sprint
Bumped `CopyButton` (28px → 44px, reverting to 28px at the `sm:` breakpoint) and two mobile-only buttons (hamburger trigger, pending-pool's full-width mobile Activate) to 44px. A first attempt also bumped the header's bell and sound-toggle buttons — this **overflowed the header by 14px at a 375px viewport**, caught live via Playwright (`scrollWidth` vs `clientWidth`). Root-caused it to the header's tight `ml-auto` icon row (bell+sound+language+theme+avatar) having no slack left once two of its five icons grew. Reverted bell/sound to the shared 36px default (matching Theme/Language exactly — visual consistency across the row, not just a width fix) rather than trying to force-fit bigger targets by shrinking padding elsewhere. Separately, History's date-range filter (`Input type="date" className="w-40"` ×2, from Sprint 3) doesn't fit two fixed-160px inputs in a 343px mobile content area — an 8px overflow, also caught the same way. Fixed by making both inputs `flex-1 min-w-0` below the `sm:` breakpoint. Re-verified `scrollWidth === clientWidth` at 375px across Dashboard/Requests/History after both fixes.

### a11y gaps
`ActivatorHeader`'s bell button had no `aria-label` at all (its dropdown's *content* had a label, but the trigger button itself didn't) — same for the mobile hamburger trigger. Fixed both (new `activator.shell.openMenu` key, mirroring Admin's existing `admin.shell.openMenu`). Added `aria-invalid`/`aria-describedby`/`role="alert"` to this portal's own form fields — Login's username/password and the Freeze-reason textarea — plus an `aria-label` the Login password show/hide toggle was missing. Checked whether to extend this to Admin's forms too: grepped `pages/admin` for `aria-invalid` and found zero matches anywhere — this is a pre-existing, codebase-wide gap, not something introduced by this portal, so it's flagged here rather than retrofitted (this sprint's own risk note: "flag, don't fix, adjacent pre-existing issues"). The reconnecting toast's live-region requirement was already free — `sonner`'s `Toaster` ships its own `aria-live="polite"` region.

### Card exit animation (Activate/Cancel) — wired for the first time
The CSS for this (`@keyframes fade-out-up` / `.animate-fade-out`) already existed in `index.css` but was completely unused anywhere in the app — dead code built for exactly this purpose and never wired up. Built `useExitingActiveList` in `RequestsPage.tsx`: plain React state (no animation library — the plan's own audit explicitly says "no new libraries") that keeps a just-removed active request rendered for 400ms after it drops out of the `active` query result, long enough for the 350ms CSS fade to actually play instead of the card just vanishing the instant the list re-renders. `ActiveRequestCard` takes a new `exiting` prop that applies the animation class plus `pointer-events-none` and `aria-hidden` (the card's mutation already succeeded by the time it starts exiting, so there's nothing left to protect against a stray click on — the guard is just cleanliness).

### New-request glow — upgraded from Sprint 4's plain highlight
Sprint 4 shipped a plain `bg-primary-light` fade (functional, not the "purple glow" the plan/spec ask for). Considered a `box-shadow`-based glow first (the codebase already has a `--shadow-glow` CSS variable) but rejected it — `DataTable`'s outer wrapper has `overflow-hidden` for its rounded corners, which would clip a box-shadow at the row/container edges, especially for edge rows. Built a dedicated `@keyframes row-glow` (transparent → tinted → transparent, one-shot over 3s) instead, applied via a new `.animate-row-glow` class.

### Reduced motion
Added a `@media (prefers-reduced-motion: reduce)` block for exactly the two animations this sprint activates for the first time — `.animate-fade-out` (has real `translateY` motion, so it's fully disabled) and `.animate-row-glow` (color-only, so it's kept as a static tint rather than dropped, since a gradual background-color shift isn't the kind of motion this media query exists to guard against). Deliberately did **not** retrofit this onto `.animate-pop-in`/`.animate-pulse-soft`/`.animate-shake` — those are pre-existing, already shipped, and shared with other areas of the app (the public client portal, in `.animate-pop-in`'s case) outside this sprint's scope.

### Memoization
`useMemo`'d `HistoryPage`'s `recentColumns`/`historyColumns` — Sprint 2's own sprints.md claimed this was "already done," but it wasn't; both were plain re-created arrays on every render. Also memoized `ActiveRequestCard`'s `wrongInfoFields` plan-fields lookup. Left `RequestsPage`'s pending-pool columns un-memoized, since plan §B8 names only "history `ColumnDef[]`" specifically, not this one too.

## A note on a citation that turned out to be wrong (again)
While memoizing `HistoryPage`'s columns, I found the exact same class of issue as Sprint 4's sidebar-badge correction: a previous sprint's own notes asserted something was "already done" that, on direct inspection, wasn't. This is now the second time in this portal's execution that a prior sprint's self-report didn't match the actual code. Treating a prior sprint's own claims as ground truth without spot-checking against the live file is exactly the failure mode to keep watching for.

## Validation results
- `npm run check` (both tsconfigs) ✅ clean.
- `npx vitest run` ✅ 54/54 files, 392/392 tests green (unchanged — no page tests yet, that's Sprint 6).
- `npx eslint` scoped to all 7 touched files — 0 errors.
- **Live Playwright verification**: 375px-viewport pass across Dashboard/Requests/History confirmed `scrollWidth === clientWidth` (no horizontal scroll) after both fixes; the mobile hamburger sheet opens correctly with backdrop; dark-mode screenshots across all 3 authenticated pages render fully via semantic tokens; an empty-submit on `/login` confirmed `aria-invalid="true"` on the username field and 2 `role="alert"` nodes present. A stray ~9px overflow appeared in early diagnostics on every page — traced to `class="tsqd-open-btn"`, the TanStack Query Devtools' own floating toggle button (dev-only, never ships to production) — confirmed via its class name and left untouched, not a real bug. Did **not** attempt a live exit-animation/glow test — same proportionality call as Sprints 2 and 4 (no real active/pending item exists to exercise it against without disproportionate data-seeding); this logic is code-reviewed here, and Sprint 6 will cover it properly with mocked hooks and fake timers.

## Sprint plan status
Admin work untouched this sprint (out of scope). Activator Portal: 5/6 sprints done. Next = S6 (Unit Tests — Login, Dashboard, History, Requests), the final sprint for this portal.
