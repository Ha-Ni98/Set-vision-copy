# Set 12 — Client form support banner + client correction — Execution Report

**Implemented exactly per** `Docs/Stage-04-fix/plan/set-12-plan.md`. Order: contract → backend → frontend.
**Date:** 2026-08-11 · **Branch:** `version-02-01`

User decisions on the plan's open questions:
- **Q1 (call/WhatsApp numbers):** confirmed as two genuinely different, intentional numbers.
  Copy names both explicitly ("call us on {phone} or contact us on WhatsApp on {whatsappPhone}").
- **Q6 (Darija script):** Arabic script, not Latin-script Darija — the banner renders a
  `dir="rtl" lang="ar"` line.
- Banner scope: hidden on `activated` only (shown on `form`, `otp`, `review`, `failed`).
- The R19 authorization gap (§6 of the plan) is **accepted and documented, not fixed** — per your
  instruction, no `key` field was added to `UpdateActivationSchema`/`SubmitAdditionalInfoSchema`.
  The one in-scope mitigation the plan recommended (rate limiting the public key router) **was**
  implemented — see below.

---

## Files created

**`Apps/web`**
- `src/components/sections/landing/SupportBanner.tsx` — the banner: Darija (RTL) + French copy,
  `tel:`/`wa.me` action buttons, both numbers named explicitly

## Files modified

**`Apps/contract`**
- `src/modules/activation/activation.command.ts` — `UpdateActivationSchema` += optional
  `fullName`, `phone`

**`Apps/api`**
- `src/modules/activation/activation.service.ts` — `update()`: added the
  `UPDATE_BLOCKED_MESSAGE` status-aware rejection table (module-level constant, next to the
  existing `*_STATS` constants); the 409 thrown when neither `isCorrection` nor
  `isPreDispatchEdit` now looks up a per-status message instead of always saying "not awaiting
  correction"; the `PENDING`-branch transaction now also writes `clientFullName`/`clientPhone`
  when either is present on the command, guarded so it never runs during a
  `WRONG_INFORMATION` correction
- `src/common/middlewares/rate-limit.middleware.ts` — += `publicKeyRateLimiter` (5-minute
  window, 30 requests, per-IP — mirrors `loginRateLimiter`'s shape but keys on IP alone, since
  none of the three routes it guards has a stable per-target field the way login has `username`)
- `src/modules/activation/activation.routes.ts` — `publicKeyRateLimiter` applied to `VERIFY`,
  `UPDATE`, `ADDITIONAL`; left off `SUBMIT` (already gated by requiring a real active card key)
  and `STATUS` (leaks nothing — `{activationId, status}` only)

**`Apps/web`**
- `src/config/social-links.ts` — added `SUPPORT_CONTACT` (`callDisplay`/`callHref`/
  `whatsappDisplay`/`whatsappHref`, derived from two `E164` literals); `SOCIAL_LINKS.whatsapp`
  and `.callcenter` now derive from it instead of holding their own literals — `PublicHeader`,
  `PublicFooter`, `AccountForm`, `LandingPage`'s existing WhatsApp links needed no changes
- `src/pages/LandingPage.tsx` — `showSupportBanner` predicate (`activation !== null && !isInvalid
  && view !== "activated"`) and one render site, placed after the step card and before
  "Check another key"
- `src/components/sections/landing/account-form.schema.ts` — `toUpdateCommand()` now sends
  `fullName`/`phone` alongside `accountFields` on every update (the server decides whether to
  write them)
- `src/config/translations.json` — 6 new keys under `public.landing.support.*`
  (`lineDarija`, `lineFrench`, `callAction`, `callAria`, `whatsappAction`, `whatsappAria`),
  identical string under `en`/`fr` per the set description's requirement, `ar: ""`

## Migration: none

`schema.prisma` is untouched — `Activation.clientFullName`/`clientPhone` already existed;
this set only makes an existing write path reachable for them.

---

## Deviations from the plan

None. The banner placement, predicate, copy structure, link-format derivation, correction
field/status table, and the accepted-risk decision on R19 all match the plan as written and as
amended by your answers above.

---

## Definition of done

- `npx tsc --noEmit` — clean in `Apps/contract`, `Apps/api` (pre-existing errors confined to
  `test/`, unrelated to this set), `Apps/web` (fully clean, including `Apps/web/tests/`)
- eslint — `Apps/contract` clean. `Apps/web`: `SupportBanner.tsx`, `social-links.ts`, and
  `account-form.schema.ts` are clean as written. `LandingPage.tsx` carries 3 pre-existing
  formatting errors (confirmed via `git stash` — identical errors, same content, present before
  this session's edits, only shifted by line number) — left untouched, no broad `--fix`.
  **`Apps/api` has no eslint installed** — pre-existing gap, flagged in every prior set's report
  since Set 1, not fixed here
- `npx madge --circular --extensions ts src` in `Apps/contract` — clean
- `git status` confirms no test file was created, modified, or deleted
- No new route, no new service method, no new event, no new DTO — `update()` is the only write
  path, exactly as the plan's audit concluded
- Banner copy lives only in `translations.json`, `{phone}`/`{whatsappPhone}` interpolated, `ar: ""`
- Exactly one literal per phone number in `Apps/web/src` (`CALL_E164`/`WHATSAPP_E164` in
  `social-links.ts`); `SOCIAL_LINKS.whatsapp`/`.callcenter` are derived, not duplicated
- No new dependency — `publicKeyRateLimiter` reuses `express-rate-limit`, already a dependency
  via `loginRateLimiter`
- R19 recorded below for you to fold into `v2-decisions.md`'s risk register if you want it there
  permanently (the plan draft already contains it at set-12-plan.md §6.5)

---

## R19 — accepted risk (restated for the record)

`activationId` is an unauthenticated, non-expiring bearer capability for `KEY_ROUTES.UPDATE` /
`ADDITIONAL`: possession of the UUID alone — not the card key — is sufficient to rewrite an
activation's account credentials while it's `PENDING` or `WRONG_INFORMATION`. Mitigated in this
set by `publicKeyRateLimiter` (blocks spraying/guessing) and by the UUID's own entropy (~122
bits, not enumerable). **Not mitigated:** an id leaked through logs, a shared device, or a
screenshot still grants write access for the activation's writable life. The declined fix (adding
`key` to `UpdateActivationSchema`/`SubmitAdditionalInfoSchema` and checking it against
`activation.card.key`) is ~20 lines across three packages if you want it later.

---

## Not done this session

**The UI was not exercised in a browser**, including the RTL rendering of the Darija line and the
`tel:`/`wa.me` link behaviour on a real mobile device — both flagged as the highest-value manual
checks below (items 8–10). Verification here is `tsc` + `eslint` + `madge` + reading the diff
against the plan's status/field table.

---

## Manual test checklist

**Banner**

1. **No key → no banner.** Load `/` fresh. No banner above "Check another key".
2. **Bad key → no banner.** Enter a key that doesn't exist → invalid message appears, no banner
   (this is the `status !== INVALID` term, not just `activation !== null`).
3. **Valid key → banner.** Enter a valid `READY` key → the form appears and the banner appears
   below the card.
4. **Banner on every non-Finish view.** Confirm it's present on: the form (`READY`), the
   read-only form (`SUBMITTED`), the correction form (`NEEDS_CORRECTION`), the OTP step
   (`NEEDS_OTP`), the under-review step (frozen), and the failed step (cancelled).
5. **Finish step → no banner.** Activate the request. The completed view renders, banner is gone.
6. **Reset clears it.** With the banner showing, click "Check another key" (and separately the
   header logo) → back to key entry, banner gone.
7. **EN↔FR toggle changes nothing in the banner.** Toggle the language. The Darija line, the
   French line, and both phone numbers are identical before and after.
8. **Mobile, 360px.** At 360×640: the banner sits fully inside the column, no horizontal
   scrollbar, doesn't overlap or push any input, the two actions stack full-width. Scroll the long
   form — the submit button is never covered.
9. **Dialer opens.** Tap the phone number → dialer opens pre-filled with `+213554813850`, not
   `0554 81 38 50`.
10. **WhatsApp opens with the correct (different) number.** Tap the WhatsApp action → opens a
    chat with `0556 71 54 28` (not the call number), new tab on desktop, no `+` and no leading `0`
    in the URL.

**Client correction**

11. **`PENDING` pre-pickup edit works and persists — including name/phone.** Submit a fresh
    activation, don't let an activator take it. Use "Update Information", change the username
    **and** the full name/phone, resubmit → success, no 409. `ActivationInformation.USERNAME`,
    `Activation.clientFullName`, and `Activation.clientPhone` all hold the new values in the DB;
    the activation is still `PENDING`. *(Before this set, name/phone were silently discarded.)*
    Nothing is expected to move on any activator screen for this case — the pending pool carries
    no account fields.
12. **`WRONG_INFORMATION` correction updates the activator live.** With the activator's Requests
    page open in a second profile: take the request, flag USERNAME. The client's tab flips to the
    correction form on its own. Correct USERNAME and resubmit → the activator's card shows the
    new value without a manual refresh, badge goes to `PROCESSING`.
13. **Unflagged fields still ignored during a correction.** In test 12, also change EMAIL in the
    same submission. `ActivationInformation.EMAIL` is unchanged (Set 3's guard, regression check).
14. **`fullName`/`phone` are ignored during a correction.** In test 12, also change the phone.
    `Activation.clientPhone` is unchanged.
15. **Blocked after activation, with a clear message.** Complete an activation, replay an update
    request for it → 409, message says the activation is already complete, not "not awaiting
    correction".
16. **Blocked in every other status, each with its own message.** Repeat test 15 against
    `PROCESSING`, a frozen activation, and a cancelled one.
17. **Rate limiting.** Fire ~30 rapid `VERIFY` requests from one IP with a script → later ones get
    rejected (429), and a normal single verification from a fresh session still works.
18. **Nothing leaks over the socket.** With devtools open during test 12, inspect the
    `activation:status-changed` frame: `{activationId, status, timestamp}` only. Same check on
    the activator's `activation:client-updated` frame.
