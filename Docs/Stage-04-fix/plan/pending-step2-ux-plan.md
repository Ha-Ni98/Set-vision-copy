# Step 2 pending-state UX — scrim overlay with animated progress

**Touches:** web only · **Contract change:** none · **Backend change:** none · **Migration:** none
**Date:** 2026-08-11 · **Branch:** `version-02-01`

**Confirmed decisions (this session):**
- **No timestamp, no real timer.** `KeyVerificationDTO` stays as it is. The moving element is an
  *indeterminate* progress indicator — it signals "work is happening", never an elapsed count.
- **Scrim overlay + "Show my information" toggle.** Fields hidden behind a scrim by default, one
  tap to reveal.
- **The 1-hour contact line is static copy**, always shown — no conditional threshold.
- **`SUBMITTED` and `PROCESSING` get identical treatment.**

---

## 1. What the client sees today

`ClientActivationStatus.SUBMITTED` (⇐ `ActivationStat.PENDING`) and `PROCESSING` both route to
`view === "form"` → [`AccountForm`](Apps/web/src/components/sections/landing/AccountForm.tsx),
which renders:

- the full form with every input `disabled` (`readonly = !editing`, and `editing` starts `false`
  for both statuses via `READONLY_STATUSES`),
- a small amber warning box near the bottom ([:291-314](Apps/web/src/components/sections/landing/AccountForm.tsx#L291-L314)) carrying
  `pendingBanner` ("…If not contacted within **15 minutes**, reach out via WhatsApp") or
  `processingNotice` ("Your information is being processed. Please wait."),
- an "Update Information" button, `SUBMITTED` only (`canEdit = status === SUBMITTED`).

**Problems:** the pending state reads as "a greyed-out form" rather than "we're working on it";
the only status signal is a small box *below* six fields; and nothing moves, so a client with no
feedback assumes the page is stuck.

---

## 2. The design

### 2.1 One new component

**`Apps/web/src/components/sections/landing/PendingOverlay.tsx`** — presentational only. It owns
no state; `AccountForm` owns `showInfo` and passes `onReveal`.

### 2.2 Structure inside `AccountForm`

The two existing `<fieldset>`s get wrapped in one `relative` container. The overlay is
`absolute inset-0`, rendered only when `isReadonlyStatus && !editing && !showInfo`.

```
{isPending && !showInfo && <PendingOverlay onReveal={() => setShowInfo(true)} />}
```

where `isPending = isReadonlyStatus && !editing` — one derived boolean, true for **both**
`SUBMITTED` and `PROCESSING` (identical treatment, per decision).

### 2.3 Default state — scrim covering the fields

```
┌───────────────────────────────────────────┐
│                                           │
│              ╭─────────╮                  │
│              │    ⏱    │   ← ring spins   │
│              ╰─────────╯     clock static │
│                                           │
│         راهنا نخدمو على طلبك               │  bold, dir=rtl
│   Votre demande est en cours de traitement │
│                                           │
│   ▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░     │  ← loops L→R
│                                           │
│   ما تسكرش الصفحة، راح تتبدل وحدها كي نكملو │  xs, muted, rtl
│   Ne fermez pas la page, elle se met à     │
│   jour automatiquement.                    │
│   ───────────────────────────────────      │
│   إذا فات ساعة وما تبدل والو، عيّط لنا       │  xs, rtl
│   Si rien ne change après une heure,       │
│   contactez-nous.                          │
│                                           │
│        [ Show my information ]            │
└───────────────────────────────────────────┘
```

Backdrop: `bg-card/85 backdrop-blur-sm` + `rounded-lg`. The fields stay *faintly perceptible*
behind the blur — that communicates "your data is there and locked", not "your data is gone" —
but are not readable.

### 2.4 Revealed state

Overlay unmounts. A compact strip renders **above** the fieldsets instead, so the status signal
never disappears entirely:

```
┌──────────────────────────────────────────────────┐
│ ⏱(pulse)  راهنا نخدمو على طلبك · Votre demande…   │
│                                       [ Hide ]   │
└──────────────────────────────────────────────────┘
```

Fields render normally — still `disabled`, since the server still refuses writes in `PROCESSING`
and only `SUBMITTED` has an edit path.

### 2.5 Motion — the "something that moves" requirement

Two moving elements, no more (a third reads as noise):

| Element | Implementation | Notes |
|---|---|---|
| **Rotating ring** around the clock badge | `motion-safe:animate-spin` on a `border-2 border-primary/30 border-t-primary rounded-full` circle; the `Clock` icon sits static in the centre | `animate-spin` is a Tailwind built-in — no config needed |
| **Indeterminate bar** | `overflow-hidden` track + inner `w-1/4` bar with a new `motion-safe:animate-indeterminate-bar` | Needs **one** custom keyframe (§3.2) |
| Revealed-state strip | `motion-safe:animate-pulse` on the clock icon only | Lighter; the strip is secondary |

**`prefers-reduced-motion` is respected** — every animation uses the `motion-safe:` variant, so a
reduced-motion user gets a static ring and a static bar segment rather than a spinning/looping
one. This is a hard requirement, not a nicety.

### 2.6 Accessibility

- The **text block** carries `role="status"` + `aria-live="polite"` so a screen reader announces
  the pending message once. The spinner and the bar are `aria-hidden="true"` — decorative, and
  putting them in a live region would cause repeat announcements.
- The concealed fieldsets need **no focus management**: every input is already `disabled`, which
  removes it from the tab order. Add `aria-hidden={!showInfo}` on the fieldset wrapper so screen
  readers don't read out fields the sighted user can't see.
- The toggle is `<button type="button">` — it lives inside a `<form>`, so omitting `type` would
  submit it.
- Title uses `text-foreground` (not `text-muted-foreground`) for contrast against the
  translucent, blurred backdrop.

### 2.7 Two deliberate omissions

1. **No call/WhatsApp buttons inside the overlay.** `SupportBanner` (Set 12) already renders
   directly below this card on both `SUBMITTED` and `PROCESSING`, with real `tel:`/`wa.me` tap
   targets and both numbers. The overlay states the 1-hour rule in words; the banner immediately
   below provides the actions. Duplicating them would put four phone affordances on one screen.
2. **The `StepIndicator` stays on step 2.** Not part of this request; changing it is a separate
   decision.

---

## 3. Files to change

### 3.1 New

- `Apps/web/src/components/sections/landing/PendingOverlay.tsx` — the overlay and the compact
  revealed-state strip (both exported from one file; they share the copy keys)

### 3.2 `Apps/web/tailwind.config.ts`

Add a `keyframes`/`animation` pair to the existing `theme.extend` (which currently has only
`borderRadius` and `colors`):

```ts
keyframes: {
  "indeterminate-bar": {
    "0%":   { transform: "translateX(-100%)" },
    "100%": { transform: "translateX(400%)" },
  },
},
animation: {
  "indeterminate-bar": "indeterminate-bar 1.6s ease-in-out infinite",
},
```

Config edit only — `tailwindcss-animate` is already a plugin and no package is added.

### 3.3 `Apps/web/src/components/sections/landing/AccountForm.tsx`

- `const [showInfo, setShowInfo] = useState(false)`
- `const isPending = isReadonlyStatus && !editing` (replaces the two inline uses of that condition)
- Wrap the two `<fieldset>`s in `<div className="relative">`, with `aria-hidden={isPending && !showInfo}`
- Render `<PendingOverlay onReveal={…} />` inside that wrapper when `isPending && !showInfo`
- Render the compact strip above the wrapper when `isPending && showInfo`
- **Delete** the old amber warning box ([:291-314](Apps/web/src/components/sections/landing/AccountForm.tsx#L291-L314)) — the overlay replaces it. This also removes the
  in-box WhatsApp link, which `SupportBanner` already covers.
- The "Update Information" button and the whole footer stay exactly where they are — **outside**
  the `relative` wrapper, so the scrim never covers the client's only edit path.

### 3.4 `Apps/web/src/config/translations.json`

New, under `public.landing.pending.*`:

| Key | en **and** fr (identical — narrative copy, matching `SupportBanner`) |
|---|---|
| `titleDarija` | `راهنا نخدمو على طلبك` |
| `titleFrench` | `Votre demande est en cours de traitement.` |
| `holdDarija` | `ما تسكرش الصفحة، راح تتبدل وحدها كي نكملو.` |
| `holdFrench` | `Ne fermez pas la page, elle se met à jour automatiquement.` |
| `contactDarija` | `إذا فات ساعة وما تبدل والو، عيّط لنا.` |
| `contactFrench` | `Si rien ne change après une heure, contactez-nous.` |

Plus two **normally translated** action labels (en ≠ fr — these are UI actions, not the
Darija/French narrative block):

| Key | en | fr |
|---|---|---|
| `showInfo` | Show my information | Afficher mes informations |
| `hideInfo` | Hide my information | Masquer mes informations |

`ar: ""` on all eight, per front-end-rules §6.B.

**Retire two now-dead keys:** `public.landing.form.pendingBanner` and
`public.landing.form.processingNotice`. Their only call site is the box being deleted (verify with
grep before removing). Removing `pendingBanner` also **resolves the 15-minute vs 1-hour
contradiction** — the 1-hour line becomes the single statement on screen.

---

## 4. Risks / edge cases

1. **Overlay taller than the fieldsets at 360px.** The fieldsets are ~6 inputs (≈400px+) and the
   overlay content is ≈300px, so it fits — but guard anyway: `overflow-y-auto` on the overlay and
   `min-h-[22rem]` on the `relative` wrapper.
2. **`showInfo` resets on a status change.** `LandingPage` keys the form on
   `` `${activation.key}-${activation.status}` ``, so `SUBMITTED → PROCESSING` remounts and
   re-asserts the scrim. That is the wanted behaviour, not a bug — a real transition should
   re-show the status.
3. **"Update Information" path is unaffected.** Clicking it sets `editing = true` → `isPending`
   goes false → overlay unmounts and the form becomes editable. Falls out of the existing logic
   with no extra wiring.
4. **`NEEDS_CORRECTION` / `READY` are untouched** — `isReadonlyStatus` is false for both, so no
   overlay ever renders there.

---

## 5. Manual test checklist

1. **Pending shows the scrim.** Submit a fresh activation. The fields are covered by a blurred
   scrim with a spinning ring, the Darija + French title, a looping bar, and the 1-hour line.
2. **The bar and ring actually move.** Both animate continuously; the clock icon itself stays
   upright (only the ring rotates).
3. **Reveal works.** Tap "Show my information" → scrim disappears, the submitted values are
   readable, and the compact pending strip appears above them. Tap "Hide" → scrim returns.
4. **Fields stay locked when revealed.** After revealing, every input is still disabled; typing
   does nothing.
5. **Edit path survives.** In `SUBMITTED`, "Update Information" is visible and reachable *without*
   revealing first (it sits below the scrim area). Clicking it removes the overlay and enables the
   form; the values are prefilled.
6. **`PROCESSING` looks identical.** Have an activator take the request. The client's view shows
   the same overlay — and has no "Update Information" button (unchanged, `canEdit` is
   `SUBMITTED`-only).
7. **Reduced motion.** Enable "reduce motion" in the OS/devtools. The ring and bar render statically —
   no spin, no loop — and everything is still legible.
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

---

## 6. Definition of done

- `npx tsc --noEmit` clean in `Apps/web` (contract and api untouched by this change)
- eslint clean on every touched file
- No test file created, modified, deleted or run — verify with `git status`
- No new dependency in `package.json` — one Tailwind config keyframe, `animate-spin`/`animate-pulse`
  built-ins, no animation or virtualization library
- No inline strings in JSX; all eight new keys in `translations.json` with `ar: ""`
- Every animation behind `motion-safe:`
- `pendingBanner` / `processingNotice` removed only after grep confirms no remaining call site
