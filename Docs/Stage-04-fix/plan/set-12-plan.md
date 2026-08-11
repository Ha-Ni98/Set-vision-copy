# Set 12 — Support-contact banner on the public activation form + client self-correction

**Depends on:** Set 3 · **Touches:** web (mostly), contract (one command field), api (two small changes)
**Schema change:** none · **Migration:** none
**Date:** 2026-08-10 · **Branch:** `version-02-01`

**Confirmed decisions (this session):**
- Banner copy is **two visible lines: Arabic-script Darija, then French** (§2).
- The banner is hidden on the **`activated` view only**; it shows on `failed` and `review` (§1.3).
- The public-route authorization hole is **accepted and documented, not fixed** in this set (§5).

> **Headline finding:** Set 3 already built most of the correction backend, including the Q1 fix.
> `ActivationService.update()` today accepts **both** a `PENDING` pre-pickup edit and a
> `WRONG_INFORMATION` correction. Set 12's correction half is therefore small and specific —
> see §4.4 for exactly what is left, and §4.6 for one requirement in the set description that the
> data model cannot satisfy.

---

## 1. Audit — the public activation flow

### 1.1 It is one page, not a wizard

[`Apps/web/src/pages/LandingPage.tsx`](Apps/web/src/pages/LandingPage.tsx) is the whole flow.
There is **no router-driven step, no step index in state, and no "next/back"**. A single derived
value decides what renders:

```ts
// LandingPage.tsx:28-37, 54-76, 86-90
type StepView = "keyEntry" | "form" | "otp" | "review" | "activated" | "failed";
const view = activation ? viewForStatus(activation.status) : "keyEntry";
const currentStep = STEP_FOR_VIEW[view];   // 1 | 2 | 3, feeds StepIndicator only
```

`viewForStatus` is a **pure total function of `ClientActivationStatus`** with an exhaustive
`never` check. That is the only step state that exists.

| `view` | Component | `StepIndicator` | Reached from `ClientActivationStatus` |
|---|---|---|---|
| `keyEntry` | inline form in `LandingPage` | 1 | `null` (nothing verified) or `INVALID` |
| `form` | [`AccountForm`](Apps/web/src/components/sections/landing/AccountForm.tsx) via `getPlanForm()` | 2 | `READY`, `SUBMITTED`, `PROCESSING`, `NEEDS_CORRECTION` |
| `otp` | [`OtpStep`](Apps/web/src/components/sections/landing/OtpStep.tsx) | 3 | `NEEDS_OTP` |
| `review` | [`UnderReviewStep`](Apps/web/src/components/sections/landing/UnderReviewStep.tsx) | 3 | `UNDER_REVIEW` |
| **`activated`** | [`CompletedStep`](Apps/web/src/components/sections/landing/CompletedStep.tsx) | 3 | `ACTIVATED` |
| `failed` | [`FailedStep`](Apps/web/src/components/sections/landing/FailedStep.tsx) | 3 | `FAILED` |

### 1.2 Where "a valid card key was accepted" is known — exactly

State lives in [`ActivationProvider`](Apps/web/src/components/providers/ActivationProvider.tsx) —
plain React state, **not persisted**; a page refresh drops it back to `keyEntry`.

The trap: **`verify()` does not error on a bad key.** It returns `200` with
`status: INVALID` ([activation.service.ts:290-292](Apps/api/src/modules/activation/activation.service.ts#L290-L292)),
and `LandingPage` stores that result like any other
([:174](Apps/web/src/pages/LandingPage.tsx#L174)). So `activation !== null` is **not** proof of a
valid key — it only means "we asked the server something".

The single correct expression is therefore:

```ts
const hasValidKey = activation !== null && activation.status !== ClientActivationStatus.INVALID;
```

`isInvalid` already exists on the page for this reason ([:91](Apps/web/src/pages/LandingPage.tsx#L91)).

### 1.3 Which view is "Finish", and how it is identified

`view === "activated"` → `CompletedStep`. It is identified by the `StepView` union, not by an
index (`STEP_FOR_VIEW` maps four different views to `3`, so the step number cannot distinguish
them).

Per your decision, **`activated` is the only Finish view**. `failed` and `review` keep the banner —
a client whose activation was cancelled or frozen is precisely the one who needs to reach support,
and hiding it there would work against the feature.

### 1.4 Where the support phone and WhatsApp number live

Single source: [`Apps/web/src/config/social-links.ts`](Apps/web/src/config/social-links.ts),
consumed only by [`PublicHeader`](Apps/web/src/components/layout/PublicHeader.tsx) and
[`PublicFooter`](Apps/web/src/components/layout/PublicFooter.tsx). No env var, no backend.

```ts
export const SOCIAL_LINKS = {
  instagram:  "https://instagram.com/setvision.19",
  whatsapp:   "https://wa.me/213556715428",     // ← 0556 71 54 28
  facebook:   "https://facebook.com/profile.php?id=61550274938326",
  callcenter: "tel:+213554813850",              // ← 0554 81 38 50
} as const;
```

Two findings:
1. The file's own header comment states these are **deliberate placeholders**. (v2-decisions R14.)
2. **The WhatsApp number and the call-centre number are different numbers** — `…556715428` vs
   `…554813850`. Whether that is intentional (a WhatsApp line and a phone line) or a placeholder
   artefact decides whether §3 keeps one constant or two. See Q1.
3. The file stores **full URLs**, but the banner copy needs a **bare, human-formatted** number to
   interpolate. §3 fixes that without creating a second source of truth.

`AccountForm` and `LandingPage` already link `SOCIAL_LINKS.whatsapp` inline in two places
([AccountForm.tsx:304](Apps/web/src/components/sections/landing/AccountForm.tsx#L304),
[LandingPage.tsx:237](Apps/web/src/pages/LandingPage.tsx#L237)) — so a contact affordance already
exists conditionally. The banner is the unconditional version; those two stay as they are (they
are contextual to a specific error/waiting state, not the same element).

### 1.5 `KEY_ROUTES.UPDATE` / `ActivationService.update()` after Set 3

`POST /keys/:activationId/update`, body `UpdateActivationSchema = { accountFields }`, **public, no
auth middleware at all** ([activation.routes.ts:57-61](Apps/api/src/modules/activation/activation.routes.ts#L57-L61)).

Set 3 rewrote the method and, per its execution report, **implemented open question Q1**. The
current shape ([activation.service.ts:397-489](Apps/api/src/modules/activation/activation.service.ts#L397-L489)):

```
isCorrection      = activationStat === WRONG_INFORMATION
isPreDispatchEdit = activationStat === PENDING
if (!isCorrection && !isPreDispatchEdit) throw ConflictError('Activation is not awaiting correction')

applicable = isCorrection
  ? cmd.accountFields.filter(f => flaggedInLatestWrongStep.has(f.field))   // guarded
  : cmd.accountFields                                                      // client owns the whole form

$transaction:
  upsert ActivationInformation on [activationId, accountInform] for each applicable field
  if (isCorrection) { create ActivationStep(PROCESSING); set Activation.activationStat = PROCESSING }

if (isCorrection) emit activation:client-updated {kind: CORRECTION} + activation:status-changed
```

**Naming trap worth writing down:** `ActivationStat.PENDING` maps to
`ClientActivationStatus.SUBMITTED` ([activation.mapper.ts:44](Apps/api/src/modules/activation/activation.mapper.ts#L44)).
So the UI's "Submitted" state and the service's `PENDING` branch are **the same state under two
names**. `AccountForm`'s `canEdit = status === SUBMITTED`
([AccountForm.tsx:60](Apps/web/src/components/sections/landing/AccountForm.tsx#L60)) is what opens
the pre-pickup edit, and it now works because Set 3 added the `PENDING` branch. Anyone reading
either side alone will get this backwards.

### 1.6 **Does client self-correction extend `update()` or need its own method? — It extends it.**

Reasoning, in order:

1. **It is already the client self-correction endpoint.** `KEY_ROUTES.UPDATE` is public and its
   only caller is the public form's `useUpdateActivation`. There is no other audience to
   disambiguate from.
2. **Set 3's open question Q1 was resolved in the affirmative and shipped.** The pre-pickup
   re-edit that used to 409 now works. That was the one thing that would have justified a second
   method, and it is gone.
3. **There is no admin correction endpoint to reuse.** Set 3 withdrew it explicitly; the admin's
   only activation write is `SET_PRICE` / `SET_COST`. So "extend the existing one or build a new
   one" is genuinely a two-way choice, and there is no third path.
4. **A second method would duplicate the guard, not simplify it.** The two windows differ only in
   *which fields are writable* (`applicable`), and that branch is four lines. Splitting into
   `update()` + `correct()` would duplicate the load, the status gate, the upsert loop and the
   transaction to save one boolean, and would create two places for a future status rule to drift.
5. **The contract already fits.** `UpdateActivationSchema` is `{ accountFields }` and the client
   posts every field regardless of window; the server decides what it will honour. That is the
   right split and it does not need a new command.

**Conclusion: no new route, no new service method, no new contract command.** Set 12 adds one
optional field to the existing command (§4.2) and improves one error message (§4.5).

---

## 2. The banner

### 2.1 Component and placement

**New file: `Apps/web/src/components/sections/landing/SupportBanner.tsx`.**
It sits with the other landing step components — it is page-specific, not a reusable composite, so
`components/sections/` is right and `components/shared/` is not (front-end-rules §1).

**Placement: in `LandingPage`, immediately after the step card's closing `</div>` and before the
`CheckAnotherKeyButton` block** — i.e. it becomes the first child of the existing
`<div className="mt-6 …">` region, above the "Check another key" link, inside the same
`mx-auto max-w-3xl px-4` column.

```
  <div ref={cardRef} …>   ← the step card (keyEntry / form / otp / review / activated / failed)
  </div>

  {showSupportBanner && <SupportBanner />}        ← HERE

  <div className="mt-6 text-center"><CheckAnotherKeyButton /></div>
```

Why there:
- **It can never overlap an input**, at any width — it is in normal flow, below the card. That is
  the execute prompt's hard requirement ("must not shift or cover the form at ~360px").
- It is inside the existing max-width column, so it aligns with the card and inherits `px-4`.
- On the short views (`otp`, `review`, `failed`) it is visible without scrolling; on the long
  `form` view it lands directly under the submit button, which is where a stuck client looks.
- One render site, one predicate, six views covered — no per-step wiring.

**Rejected: a `fixed bottom-0` sticky bar.** It covers the form's submit button at 360px, which is
exactly what the set forbids.

**Rejected: putting it in `PublicLayout`.** The layout has no access to the activation context's
status and would apply to `/login` and the 404 too.

### 2.2 Visibility predicate — as a boolean expression over real state

In `LandingPage`, next to the existing `view` / `isInvalid` derivations:

```ts
// Shown once a REAL key is accepted, on every view except Finish (set-12-plan §1.2/§1.3).
//  · activation !== null        → nothing has been verified yet (first load, or after a reset)
//  · status !== INVALID         → verify() returns 200/INVALID for an unknown or inactive card,
//                                 so a non-null activation is NOT proof of a valid key
//  · view !== "activated"       → CompletedStep is the Finish step
const showSupportBanner =
  activation !== null &&
  activation.status !== ClientActivationStatus.INVALID &&
  view !== "activated";
```

- No new state, no new hook, no `useEffect`. `activation` and `view` already exist on the page.
- `keyEntry` is excluded for free: it is only reachable when `activation` is `null` or `INVALID`.
- **"Check another key" and the header logo both call `reset()`**, which sets `activation = null` →
  the banner disappears with no extra wiring.
- The `INVALID` term is what manual test 7 exercises.

### 2.3 Mobile behaviour

- **Static block, never `fixed`/`sticky`.** No layout shift, nothing to cover.
- Card-styled to match the page: `rounded-2xl border border-border bg-surface p-4 sm:p-5 mt-6`.
- Copy block stacks; the two actions are `flex-col gap-2 sm:flex-row`, each `w-full sm:w-auto` and
  `min-h-11` — 44px, matching the form's own `h-11` buttons, so both are comfortable tap targets.
- The phone number renders in a `<a href="tel:…">` styled as a button, so on mobile it opens the
  dialer and on desktop it is still selectable text.
- `break-words` on the copy; no fixed widths anywhere, so nothing overflows the `px-4` column at
  360px.
- **Bidi:** the Darija line gets its own `<p dir="rtl" lang="ar">`; the French line
  `<p dir="ltr" lang="fr">`. Both numbers appear **mid-sentence** in the Arabic line, never at the
  end — European digits inside RTL text are rendered LTR in place by the Unicode bidi algorithm,
  and keeping them away from a run boundary avoids the classic `+`/punctuation misplacement, which
  matters twice as much now that two separate numbers sit in the same RTL sentence. (This is also
  why §3 interpolates the **national** `0554 81 38 50` / `0556 71 54 28` forms, which have no
  leading `+`, rather than E.164.)
- This is the first `dir="rtl"` element in the app. It is a **local attribute on one `<p>`**, not
  the RTL layout work that project memory records as deferred — no `components.json` change, no
  logical-property sweep, no `LanguageProvider` involvement.

### 2.4 What the banner is not

Not an alert, not dismissible, not animated, no icon-only variant. It carries no activation data,
so it is safe on every view including `failed`.

---

## 3. The copy — for your approval or rewrite

### 3.1 Storage rule

Per the set description: the banner copy is **the same string under `en` and `fr`**, so the
EN↔FR toggle does not change it (manual test 4). `ar` stays `""` like every other key
(front-end-rules §6.B). The phone is interpolated as `{phone}` — `interpolate()` in
[`lib/i18n.ts:17-23`](Apps/web/src/lib/i18n.ts#L17-L23) uses `{name}` syntax.

Key names say **which line of copy**, not which language — because the app language does not
select between them; both render at once.

### 3.2 The strings

**Confirmed (this session): the call number and the WhatsApp number are two different,
intentional lines.** The copy names both explicitly — "call us on {phone} OR contact us on
WhatsApp on {whatsappPhone}" — rather than presenting a single number for both actions.

| Key | `en` **and** `fr` (identical) |
|---|---|
| `public.landing.support.lineDarija` | `عندك مشكل ولا ما فهمتش حاجة؟ عيّط لنا على {phone} ولا صيفط لنا رسالة في الواتساب على {whatsappPhone}، راهنا هنا باش نعاونوك.` |
| `public.landing.support.lineFrench` | `Un souci ou une question ? Appelez-nous au {phone} ou contactez-nous sur WhatsApp au {whatsappPhone}, on vous répond tout de suite.` |
| `public.landing.support.callAction` | `{phone}` |
| `public.landing.support.callAria` | `Appeler le support au {phone}` |
| `public.landing.support.whatsappAction` | `{whatsappPhone}` |
| `public.landing.support.whatsappAria` | `Contacter le support sur WhatsApp au {whatsappPhone}` |

Both `{phone}` and `{whatsappPhone}` are interpolated — `interpolate()` in
[`lib/i18n.ts:17-23`](Apps/web/src/lib/i18n.ts#L17-L23) already supports multiple named variables
in one string, so this needs no change there. The WhatsApp button's visible label reuses the
existing key **`common.social.whatsapp`** (`"WhatsApp"` in both languages already); the new
`whatsappAction`/`whatsappAria` keys carry the number, not a second "WhatsApp" label.

### 3.3 Notes on the wording

**Darija** — gloss: *"Got a problem or didn't understand something? Call us on {phone} or send us
a message on WhatsApp on {whatsappPhone}, we're here to help you."*
- `عندك مشكل` — "you have a problem", the everyday Algerian phrasing.
- `ما فهمتش حاجة` — "you didn't understand something"; covers the confused client, not just the
  broken one. This matters: most support calls on a form like this are confusion, not failure.
- `عيّط لنا على {phone}` — "call us on {phone}" (Algerian `عيّط`; *not* Levantine `اتصل بنا`, which
  reads as MSA on a poster).
- `صيفط لنا رسالة في الواتساب على {whatsappPhone}` — "send us a message on WhatsApp on
  {whatsappPhone}"; `صيفط` is the Algerian verb, and the number is repeated here (not "the same
  number") because it genuinely is a different one.
- `راهنا هنا باش نعاونوك` — "we're here to help you". Warm, present-tense, not a promise of a
  time window we do not control.
- Deliberately no `إن شاء الله`, no `مرحبا بيك`, no exclamation stacking — it is a utility banner
  on a form, not marketing.

**French** — written as an Algerian support line would write it, not as a translation of the
Darija:
- `Un souci ou une question ?` — natural, short. Not `Avez-vous rencontré un problème ?`, which
  reads like a template.
- `Appelez-nous au …` — correct French for a phone number (`au`, not `sur`).
- `contactez-nous sur WhatsApp au …` — names the WhatsApp number explicitly, the same way the call
  number is named, since the two numbers differ and the copy must not imply they're the same line.
- `on vous répond tout de suite` — colloquial `on` rather than `nous vous répondrons`, present
  rather than future. This is the line that most makes it read as written-in-Algeria.
- Note the French space before `?` — required, and it is already the convention in
  `translations.json` (e.g. `"Effacer tous les champs ?"`).

**Rewrite freely.** These two lines are the deliverable of this section; nothing else in the plan
depends on their exact wording, only on the key names.

---

## 4. `tel:` / `wa.me` link formats, and reading the number from the existing config

### 4.1 The three representations of one Algerian number

Algeria is country code **+213**; national mobile numbers are 10 digits beginning `0`
(e.g. `0554813850`), and the international form **drops the leading `0`** → `+213554813850`.

| Use | Format | Example | Rule |
|---|---|---|---|
| `tel:` href | **E.164, no spaces, no separators** | `tel:+213554813850` | Works from any country and while roaming. Never put a national `0…` form in a `tel:`. |
| `wa.me` href | **digits only — no `+`, no leading `0`, no spaces** | `https://wa.me/213556715428` | WhatsApp's documented format; any separator or `+` breaks it. |
| Display / `{phone}` | **National, grouped** | `0554 81 38 50` | What an Algerian reads back over the phone. No `+`, which is also what keeps §2.3's bidi clean. |

### 4.2 The config change — one source, three derived forms

`Apps/web/src/config/social-links.ts` is rewritten so the header, the footer and the banner
provably cannot drift (D8's actual requirement). The two existing numbers are **kept separate**
(§1.4 finding 2, Q1):

```ts
// The support numbers, once. tel:/wa.me/display forms are DERIVED below — never write a second
// literal for the same number. Still placeholders; see Q2.
const CALL_E164 = "+213554813850";
const WHATSAPP_E164 = "+213556715428";

const toWaDigits = (e164: string) => e164.replace(/\D/g, ""); // wa.me wants bare digits

export const SUPPORT_CONTACT = {
  /** Interpolated into the banner copy as {phone}. National grouping, no '+' (bidi, §2.3). */
  callDisplay: "0554 81 38 50",
  callHref: `tel:${CALL_E164}`,
  /** Interpolated as {whatsappPhone} — a DIFFERENT number from callDisplay (confirmed). */
  whatsappDisplay: "0556 71 54 28",
  whatsappHref: `https://wa.me/${toWaDigits(WHATSAPP_E164)}`,
} as const;

export const SOCIAL_LINKS = {
  instagram: "https://instagram.com/setvision.19",
  facebook: "https://facebook.com/profile.php?id=61550274938326",
  whatsapp: SUPPORT_CONTACT.whatsappHref,   // ← header + footer now read the same source
  callcenter: SUPPORT_CONTACT.callHref,     // ← as the banner
} as const;
```

- **`SOCIAL_LINKS` keeps its shape and its four keys**, so `PublicHeader`, `PublicFooter`,
  `AccountForm` and `LandingPage` need **no change at all** — the values are now derived instead
  of literal.
- `callDisplay` stays a literal because grouping is a presentation choice, not something to derive
  from E.164 with a regex that would silently produce nonsense for a non-mobile number. It is one
  line away from `CALL_E164` with a comment tying them; changing one without the other is visible
  in review.
- `SupportBanner` imports **`SUPPORT_CONTACT`** and nothing else. No env var, no backend, no
  second copy of a number anywhere in the tree.

---

## 5. Client correction: fields, statuses, enforcement, event

### 5.1 Which activation statuses allow a client write — the full table

Enforced in `ActivationService.update()` (§1.5), server-side, on every request:

| `ActivationStat` (DB) | `ClientActivationStatus` (client) | `view` | Write allowed? | Which fields |
|---|---|---|---|---|
| `PENDING` | `SUBMITTED` | `form` | ✅ | **all** submitted account fields (nothing is flagged; the client owns the form) |
| `WRONG_INFORMATION` | `NEEDS_CORRECTION` | `form` | ✅ | **only** fields present in the latest `WRONG_INFORMATION` step's `wrongInformation` rows |
| `PROCESSING` | `PROCESSING` | `form` (read-only) | ❌ 409 | — |
| `ADDITIONAL_INFORMATION` | `NEEDS_OTP` | `otp` | ❌ 409 | — (that flow is `KEY_ROUTES.ADDITIONAL`, out of scope) |
| `FREEZE` | `UNDER_REVIEW` | `review` | ❌ 409 | — |
| `ACTIVATED` / `ACTIVATED_BY_ADMIN` | `ACTIVATED` | `activated` | ❌ 409 | — |
| `CANCELLED_BY_ACTIVATOR` / `REMOVED_FROM_ACTIVATOR` / `CANCELLED_BY_ADMIN` | `FAILED` | `failed` | ❌ 409 | — |

There is no `READY` row: `READY` means no activation exists yet, so the write goes to
`KEY_ROUTES.SUBMIT`, not `UPDATE` ([AccountForm.tsx:108-119](Apps/web/src/components/sections/landing/AccountForm.tsx#L108-L119)).

**The UI already matches this table** and needs no gating changes: `READONLY_STATUSES` covers
`SUBMITTED`/`PROCESSING`, `canEdit` opens only on `SUBMITTED`, and `viewForStatus` never routes
the other statuses to a form at all. The client cannot even reach a submit button in a blocked
status — but the server enforces it anyway, because the route is public.

### 5.2 Which fields — the one contract change

Today `UpdateActivationSchema = { accountFields }`. The form also collects **`fullName` and
`phone`**, the client can edit them, and they are **silently discarded on every update** — Set 3's
open question Q2, left untouched and flagged. This is a real defect from the client's point of
view: they change their phone number, the form says "Information updated!", and nothing changed.

```ts
// Apps/contract/src/modules/activation/activation.command.ts
export const UpdateActivationSchema = z.object({
  accountFields: AccountFieldsSchema,
  // Set 12: the client can fix their own contact details during the pre-pickup window. Optional
  // because a WRONG_INFORMATION correction ignores them (the activator cannot flag them —
  // FlagWrongInfoSchema is AccountInformation[], which has no name/phone member).
  fullName: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
});
```

Server rule, in the same `isPreDispatchEdit` branch that already exists:

> `fullName` / `phone` are written **only** on a `PENDING` pre-pickup edit, inside the existing
> transaction, as a single `tx.activation.update(...)`. On a `WRONG_INFORMATION` correction they
> are **ignored silently**, exactly as unflagged account fields already are.

That rule falls straight out of the `applicable` logic Set 3 built — same reasoning, same branch,
no new concept. `exactOptionalPropertyTypes` is on, so the update data is built with the
`...(x && { y })` spread idiom (v2-decisions R12).

`toUpdateCommand()` in
[`account-form.schema.ts`](Apps/web/src/components/sections/landing/account-form.schema.ts) starts
sending them; the compile-time `AssertAssignable` guard in that file keeps the two in step.

### 5.3 Server-side enforcement — unchanged, and that is the point

Everything in §5.1 is already enforced by the status gate at
[activation.service.ts:415-419](Apps/api/src/modules/activation/activation.service.ts#L415-L419)
and the flagged-field filter at
[:425-432](Apps/api/src/modules/activation/activation.service.ts#L425-L432). Set 12 adds **no new
gate**. It changes two things:

1. The `fullName`/`phone` write, scoped to the `PENDING` branch (§5.2).
2. The rejection message (§5.5).

### 5.4 Which event fires

| Window | Events emitted | Who receives |
|---|---|---|
| `WRONG_INFORMATION` correction | `activation:client-updated { activationId, activatorId, kind: CORRECTION, timestamp }` **and** `activation:status-changed { activationId, status: PROCESSING, timestamp }` | `/activators` → `rooms.activator(activatorId)` (the assigned activator's card refetches `GET_ACTIVE`); `/client` → `rooms.activation(activationId)` (the client's own tab) |
| `PENDING` pre-pickup edit | **none** | — |

No new event, no new payload, no gateway change. `ClientUpdateKind.CORRECTION` already exists and
is already what Set 6's notifier keys on.

**No field value crosses a socket** in either case — both payloads are ids, an enum and a
timestamp; data always arrives over the REST refetch. That property is preserved.

### 5.5 The rejection message

Today every blocked status yields
`ConflictError('Activation is not awaiting correction')`. For an `ACTIVATED` activation that is
misleading — the client reads it as "we're still waiting for something from you". Manual test 6
in the set description asks for "a clear message".

Change to a status-aware message built from a small `Record<ActivationStat, string>` in the
service (no magic strings scattered at throw sites), e.g.:

- `PROCESSING` → *"Your information is being processed and cannot be changed right now."*
- `ADDITIONAL_INFORMATION` → *"Please answer the verification code request instead."*
- `FREEZE` → *"This activation is under review. Contact support to make a change."*
- `ACTIVATED` / `ACTIVATED_BY_ADMIN` → *"This activation is already complete and can no longer be changed."*
- cancelled/removed → *"This activation was cancelled and can no longer be changed."*

The message is English (it is a server error string; the backend has no i18n — v2-decisions A1).
The client surfaces it through the existing global mutation-error toast
([query-client.ts](Apps/web/src/lib/query-client.ts)), which is already how every other API error
reaches the user.

### 5.6 The one requirement the data model cannot satisfy — flagging it, not hiding it

The set description's manual test 5 says: *"Correct a field while PENDING → activator dashboard
updates live."*

**Nothing on any activator screen can show that change.** While an activation is `PENDING` it is
in the global pending pool, and `PendingActivationDTO` is
`{ id, subscriptionLabel, keyMasked, requestedAt }`
([activation.dtos.ts:79-84](Apps/contract/src/modules/activation/activation.dtos.ts#L79-L84)) —
**no client name, no phone, no account fields**. There is no assigned activator yet, so
`rooms.activator(activatorId)` has no room to target and
`ActivationClientUpdatedPayloadSchema.activatorId` is a required `z.uuid()` with nothing to put in
it. Emitting an event here would be an event with no payload target and no subscriber able to
render a difference.

**Recommendation: accept, and restate the test.** The live-update requirement is genuinely
satisfied by the `WRONG_INFORMATION` path (§5.4), which is the case that matters — an activator is
actively holding the request and is watching the card. Manual test 5 is rewritten accordingly in
§7 (item 11). Making the `PENDING` case observable would mean widening `PendingActivationDTO` with
client data and broadcasting it to every connected activator — more exposure, for a screen nobody
is reading. **Not recommended.** Say the word if you want it anyway and it becomes its own set.

---

## 6. Anti-abuse — the authorization model, stated explicitly

**This is the main risk in the set, and per your decision it is accepted and documented, not
fixed here.** What follows is the honest description so the decision is on the record.

### 6.1 The model as it actually is

> **The credential for every public client write is the `activationId` UUID in the URL path.
> Nothing else is checked.**

- `KEY_ROUTES.UPDATE`, `ADDITIONAL` and `STATUS` all sit on `keyRouter`, which has **no auth
  middleware of any kind** ([activation.routes.ts:38-73](Apps/api/src/modules/activation/activation.routes.ts#L38-L73)).
- `update()` never reads a card key. Its body is `{ accountFields }`; the activation is loaded
  **by the path parameter alone**.
- `activationId` is `@default(uuid())` — a v4 UUID, ~122 bits of entropy. Not enumerable, not
  sequential, not guessable.
- The **only** way to obtain one is `KEY_ROUTES.VERIFY`, which requires the card key and returns
  the id of **that card's own live activation** ([activation.service.ts:269-296](Apps/api/src/modules/activation/activation.service.ts#L269-L296),
  [activation.mapper.ts:131-132](Apps/api/src/modules/activation/activation.mapper.ts#L131-L132)).

So it is a **bearer capability**: possession of the id grants write access to that one activation,
for as long as its status allows writes.

### 6.2 What stops someone with one card key from editing another activation

**Card key `K1` can only ever yield activation `A1`.** `verify()` derives the activation from the
card row (`card.activations`), so there is no request shape in which a key returns a different
card's activation — and `update()` ignores keys entirely, so a key cannot be *substituted* at all.
The blast radius of holding a card key is exactly the activation on that card.

Manual test 8 in the set description ("a card key does not grant edit access to a different
activation") therefore **passes today** — but for a different reason than the test implies: the
card key is not the credential, the activation id is.

### 6.3 What is NOT protected — the accepted exposure

| Property | Consequence |
|---|---|
| The id **never expires and never rotates** | Anyone who obtains it once keeps write access for the activation's whole writable life, **without the card key**. |
| It travels **in the URL path** | It lands in server access logs, any reverse proxy's logs, and any APM trace. It is not in the browser address bar today (the SPA never routes on it), so browser history is not a vector. |
| It is handed to **whoever verifies the key** | A shared device, a screenshot of devtools, or a client who reads their key aloud to the wrong person all leak it. |
| There is **no rate limit** on `keyRouter` | `VERIFY` can be sprayed against the card-key space (8 chars, 36 symbols ≈ 2.8×10¹² — large, but unthrottled). |

**The concrete threat:** an attacker holding a leaked `activationId` for an activation in `PENDING`
or `WRONG_INFORMATION` can overwrite the Snapchat username, email and password the client typed —
i.e. redirect the activation to an account the attacker controls, during the ~15-minute pre-pickup
window or the correction window. Bounded to one activation, and closed the moment the activator
takes it (`PROCESSING` is not writable).

### 6.4 Two mitigations that fit inside this set, and one that does not

**In scope, no contract change, recommended:**
1. **Rate-limit the public key router.** `loginRateLimiter` already exists
   ([rate-limit.middleware.ts](Apps/api/src/common/middlewares/rate-limit.middleware.ts)) and is
   applied to `AUTH_ROUTES.LOGIN`. Add a sibling `publicKeyRateLimiter` and apply it to `VERIFY`,
   `UPDATE` and `ADDITIONAL`. Existing middleware, existing dependency, no contract impact.
   Blocks key spraying and id-guessing outright.
2. **Do not widen `getStatus()`.** It returns `{ activationId, status }` and nothing else — so an
   id alone still leaks no client data. Keep it that way; the temptation to add the client's name
   for a nicer status page is exactly how this gets worse.

**Deliberately NOT done in this set** (your decision), written down for whoever picks it up:

> Add `key: z.string()` to `UpdateActivationSchema` (and `SubmitAdditionalInfoSchema`), load the
> activation with `include: { card: { select: { key: true } } }`, and reject unless
> `activation.card.key === cmd.key`. That converts the model from "the id is the secret" to
> "possession of the physical card is the secret", which is what the flow actually intends. The
> client already holds the key in `ActivationData.key`, so the frontend change is one field per
> mutation. ~20 lines across three packages.

### 6.5 Risk register entry

| # | Risk | Severity | Status |
|---|---|---|---|
| **R19** | `activationId` is an unauthenticated, non-expiring bearer capability for writing account credentials on `KEY_ROUTES.UPDATE` / `ADDITIONAL`. A leaked id lets a third party overwrite a client's Snapchat credentials during the `PENDING` / `WRONG_INFORMATION` windows. | Medium-High | **Accepted, informed decision (2026-08-10).** Mitigated by rate limiting (§6.4.1) and by the id's entropy. Fix recorded in §6.4. |

---

## 7. Files to change

**`Apps/contract`**
- `src/modules/activation/activation.command.ts` — `UpdateActivationSchema` gains optional `fullName`, `phone`

**`Apps/api`**
- `src/modules/activation/activation.service.ts` — `update()`: write `fullName`/`phone` on the `PENDING` branch (§5.2); status-aware rejection message (§5.5)
- `src/common/middlewares/rate-limit.middleware.ts` — `publicKeyRateLimiter` (§6.4.1)
- `src/modules/activation/activation.routes.ts` — apply it to `VERIFY`, `UPDATE`, `ADDITIONAL`
- `prisma/schema.prisma` — **untouched. No migration.**

**`Apps/web`**
- `src/components/sections/landing/SupportBanner.tsx` — **new**
- `src/pages/LandingPage.tsx` — `showSupportBanner` predicate + one render site
- `src/config/social-links.ts` — `SUPPORT_CONTACT`, `SOCIAL_LINKS` derived from it (§4.2)
- `src/components/sections/landing/account-form.schema.ts` — `toUpdateCommand` sends `fullName`/`phone`
- `src/config/translations.json` — five new `public.landing.support.*` keys, `en` = `fr`, `ar: ""`

**Untouched and worth stating:** `PublicHeader`, `PublicFooter`, `AccountForm`, `OtpStep`,
`ActivationProvider`, `realtime.ts`, `realtime-gateway.ts`, `rooms.ts`, `event-bus.ts`,
`activation.events.ts`, `activation.mapper.ts`, every DTO.

**Migration: none.**

---

## 8. Open questions

**Q1 — RESOLVED (this session).** The call number and the WhatsApp number are confirmed as two
genuinely different, intentional lines. §3.2's copy names both explicitly ("call us on {phone} or
contact us on WhatsApp on {whatsappPhone}") and §4.2 keeps two constants (`callDisplay` /
`whatsappDisplay`) accordingly.

**Q2 — the numbers are still documented placeholders** (v2-decisions R14, and the file's own
header comment). This set will ship the banner with fake numbers unless you supply the real ones.
The structure is correct either way — swapping them later is two literals in one file.

**Q3 — §5.6: the `PENDING` "live update" requirement cannot be satisfied.** Recommend accepting
and restating the test (§7 item 11). Confirm, or say you want `PendingActivationDTO` widened —
which is a different, larger set.

**Q4 — `fullName`/`phone` on correction.** §5.2 makes them writable in the `PENDING` window only
and ignored during a `WRONG_INFORMATION` correction, because the activator has no way to flag
them. Confirm that is the rule you want, rather than "writable in both windows".

**Q5 — the rate limiter (§6.4.1).** It is not in the set description's scope. Recommend including
it: it is the only meaningful mitigation available without the contract change you declined, it
reuses existing middleware, and it costs ~10 lines. Say if you would rather it be its own change.

**Q6 — Darija script is a first for this codebase.** §2.3 uses `dir="rtl"` on one `<p>`, which is
not the deferred RTL-layout work. Confirm you are happy with Arabic script rendering inside the
otherwise-LTR public page before the copy is committed.

**Q7 — frozen tests that will break.** `Apps/api/test/unit/modules/activation*.spec.ts` and
`test/integration/activation.spec.ts` (the `update()` signature and the changed error message),
`Apps/web/tests/unit/pages/client-portal/*` (the new banner in the render tree), and both
conformance suites (the command change). Expected under the freeze — **not touched, not run**;
verified with `git status`.

---

## 9. Manual test checklist

**Banner**

1. **No key → no banner.** Load `/` fresh. No banner above "Check another key".
2. **Bad key → no banner.** Enter a key that does not exist → the invalid message appears, the
   view stays on key entry, and **no banner** (this is the `status !== INVALID` term).
3. **Valid key → banner.** Enter a valid `READY` key → the form appears **and** the banner appears
   below the card, above "Check another key".
4. **Banner on every non-Finish view.** Walk one activation through and confirm the banner is
   present on: the form (`READY`), the read-only form (`SUBMITTED`), the correction form
   (`NEEDS_CORRECTION`), the OTP step (`NEEDS_OTP`), the under-review step (frozen), and the
   failed step (cancelled).
5. **Finish step → no banner.** Activate the request. The completed view renders and the banner is
   **gone**.
6. **Reset clears it.** With the banner showing, click "Check another key" (and separately, the
   header logo) → back to key entry, banner gone.
7. **EN↔FR toggle changes nothing in the banner.** Toggle the language. The Darija line, the
   French line and both phone numbers are **identical** before and after. (The rest of the page
   does switch — confirm that too, so you know the toggle actually fired.)
8. **Mobile, 360px.** In devtools at 360×640: the banner sits fully inside the column with no
   horizontal scrollbar, does not overlap or push any input, and the two actions stack full-width.
   Scroll the long form top to bottom — the submit button is never covered.
9. **Dialer opens.** On a real phone (or a device emulator with a tel handler), tap the number →
   the dialer opens **pre-filled with `+213554813850`**, not `0554 81 38 50`.
10. **WhatsApp opens, with the correct (different) number.** Tap the WhatsApp action → WhatsApp
    opens a chat with `0556 71 54 28` (**not** the call number `0554 81 38 50`), in a new tab on
    desktop. Confirm the URL has no `+` and no leading `0`.

**Client correction**

11. *(replaces the description's test 5 — see §5.6)* **`PENDING` pre-pickup edit works and is
    persisted.** Submit a fresh activation and do **not** let an activator take it. Use "Update
    Information", change the username, resubmit → success, no 409, `ActivationInformation.USERNAME`
    holds the new value in the DB, and the activation is still `PENDING` (it does **not** jump to
    `PROCESSING`). Nothing is expected to move on any activator screen — the pending pool carries
    no account fields.
12. **`WRONG_INFORMATION` correction updates the activator live.** With the activator's Requests
    page open in a second browser profile: the activator takes the request and flags USERNAME. The
    client's tab flips to the correction form on its own. The client corrects USERNAME and
    resubmits → the activator's card shows the new value **without a manual refresh** and the
    badge goes to `PROCESSING`.
13. **Unflagged fields are still ignored during a correction.** In test 12, also change EMAIL in
    the same submission. `ActivationInformation.EMAIL` is **unchanged** (Set 3's guard, regression
    check).
14. **`fullName` / `phone` now persist in the `PENDING` window.** In test 11, also change the full
    name and phone. Both are updated on the `Activation` row, and the admin activation detail page
    shows the new values. *(Before this set they were silently discarded.)*
15. **`fullName` / `phone` are ignored during a correction.** In test 12, also change the phone.
    `Activation.clientPhone` is **unchanged**.
16. **Blocked after activation, with a clear message.** Complete an activation, then replay an
    update request for it with devtools → **409**, and the message says the activation is already
    complete — not "not awaiting correction".
17. **Blocked in every other status.** Repeat test 16 against `PROCESSING`, a frozen
    (`UNDER_REVIEW`) activation, and a cancelled one. Each returns 409 with its own message.
18. **Card key does not reach another activation.** Verify key `K1` (activation `A1`) and key `K2`
    (activation `A2`) in two tabs. Take `A2`'s id from tab 2 and try to submit tab 1's form
    against it — confirm the only thing that decides which activation is written is the id, and
    that no request built from `K1` ever produces `A2`'s id from `verify()`. *(This documents
    §6.2's model; it is not expected to fail.)*
19. **Rate limiting.** Fire ~30 rapid `VERIFY` requests from one IP with a script → later ones are
    rejected by the limiter, and a normal single verification from a fresh session still works.
20. **Nothing leaks over the socket.** With devtools open on the client tab during test 12,
    inspect the `activation:status-changed` frame: `{ activationId, status, timestamp }`, **no
    field values**. Same check on the activator's `activation:client-updated` frame.

---

## 10. Definition of done

- `npx tsc --noEmit` clean in `Apps/contract`, `Apps/api`, `Apps/web`
- eslint clean in all three
- `npx madge --circular src` clean in `Apps/contract`
- **No migration** — `schema.prisma` untouched
- No test file created, modified, deleted or run — verify with `git status`
- No new route, no new service method, no new event, no new DTO (§1.6)
- Banner copy lives only in `translations.json`, with `{phone}` interpolated and `ar: ""`; no
  inline string in `SupportBanner.tsx`
- Exactly one literal per phone number in `Apps/web/src` (one for the call number, one for
  WhatsApp — confirmed distinct); `SOCIAL_LINKS.whatsapp` and `.callcenter` are derived (§4.2)
- No new dependency in any `package.json`
- R19 (§6.5) recorded in `v2-decisions.md`'s risk register as an accepted, informed decision
- Report: files changed grouped by package, "migration: none", open questions, and the §9
  checklist, under `Docs/Stage-04-fix/results/set-12/`
- **Stop. Do not start the next set.**
