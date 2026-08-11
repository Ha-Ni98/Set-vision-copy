# Set 3 — Correction write-back: `ActivationInformation` becomes the current value, `WrongInformation` becomes the rejected value

**Depends on:** Set 2 · **Touches:** api (+ two `schema.prisma` comments, + one admin label in web)
**Schema change:** none · **Migration:** none · **Contract change:** none
**Date:** 2026-08-09 · **Branch:** `version-02-01`

> **This set replaces the original Set 3** ("Admin correction of activation info + audit log"),
> which was withdrawn: **the admin does not edit any activation field except the commission.**
> The admin reads activation account information (that is Set 2) and sets the price via the
> existing `SET_PRICE` route. There is no admin edit endpoint, no `CHANGE_ACTIVATION_INFORMATION`
> log action, and no `activation:information-updated` event anywhere in this programme.
> `version-2-description.md` has been updated to match; see §7.

**Scope discipline:** the client-driven wrong-information correction flow only. The
additional-information / OTP flow is explicitly **out of scope** and keeps its current storage
(decision confirmed with the user). Client self-correction UX is Set 12.

---

## 1. Audit — how the correction flow works today

### 1.1 The four write points

| # | Method | Line | What it writes |
|---|---|---|---|
| 1 | `submit()` | [activation.service.ts:331-346](Apps/api/src/modules/activation/activation.service.ts#L331-L346) | Nested `information: { create: [...] }` — one `ActivationInformation` row per submitted field. **This is the only place `ActivationInformation` is ever written.** |
| 2 | `flagWrong()` | [activation.service.ts:605-622](Apps/api/src/modules/activation/activation.service.ts#L605-L622) | New `ActivationStep(WRONG_INFORMATION)` + `wrongInformation.createMany` with **`value: null`** for each flagged field |
| 3 | `update()` | [activation.service.ts:397-418](Apps/api/src/modules/activation/activation.service.ts#L397-L418) | `wrongInformation.updateMany({ where: {activationStepId: latestWrongStep.id, accountInform}, data: { value: <the client's NEW value> } })` — then `ActivationStep(PROCESSING)` + `Activation.activationStat = PROCESSING` |
| 4 | `requestAdditional()` / `additional()` | [:654-671](Apps/api/src/modules/activation/activation.service.ts#L654-L671) / [:459-480](Apps/api/src/modules/activation/activation.service.ts#L459-L480) | Same shape on `AdditionalInformation` — **out of scope, unchanged** |

**`ActivationInformation` is written exactly once, at submit, and never again.** Corrections live
only in step rows.

### 1.2 The `[activationId, accountInform]` unique constraint

`ActivationInformation` carries `@@unique([activationId, accountInform])`
([schema.prisma](Apps/api/prisma/schema.prisma)) — Prisma exposes it as the compound key
`activationId_accountInform`. Today the constraint is respected **trivially**: the only write is
the nested `create` at submit, and `SubmitActivationSchema.accountFields` is a flat array the
client sends once. Nothing upserts, nothing re-creates, so the constraint has never actually been
exercised. `WrongInformation` and `AdditionalInformation` have **no** unique constraint — only
`@@index([activationStepId])` — so a field can legitimately appear once per step across many
rounds.

### 1.3 How the current value is reconstructed at read time

[`resolveLatestWinsInfo(base, steps)`](Apps/api/src/modules/activation/activation.service.ts#L117-L133):
seed a `Map` from `ActivationInformation`, then iterate `[...steps].reverse()` (steps always come
back `orderBy createdAt desc`, so reversed = oldest first = **newest wins**) and `map.set(...)` for
every `wrongInformation` **and** `additionalInformation` row.

Three readers depend on it:

| Reader | Line | Consumes |
|---|---|---|
| `verify()` — client Step-2 prefill | [:287](Apps/api/src/modules/activation/activation.service.ts#L287) | `KeyVerificationDTO.submittedFields` |
| `buildActiveRequestDTO()` — activator card | [:200](Apps/api/src/modules/activation/activation.service.ts#L200) | `ActiveRequestDTO.accountFields` (OTP filtered out) |
| `getById()` — admin detail | [:1127](Apps/api/src/modules/activation/activation.service.ts#L1127) | `ActivationDetailDTO.submittedInformation` |

### 1.4 Worked example — the exact case in the request

Client submits `USERNAME = "adm"`. Activator flags USERNAME as wrong. Client corrects to `"admin"`.

| Table | Column | Today | Should be |
|---|---|---|---|
| `ActivationInformation` | `value` | **`"adm"`** (stale forever) | **`"admin"`** |
| `WrongInformation` (round-1 step) | `value` | **`"admin"`** (the *corrected* value) | **`"adm"`** (the value that was **wrong**) |

The storage is inverted: the table named *WrongInformation* holds the **right** value, and the
table holding the account's information holds the **wrong** one. The overlay hides the inversion
from every reader, which is why nothing visibly broke — until you query the tables directly, or
hit the window in §1.5.

### 1.5 The bug the inversion actually causes today

`flagWrong()` writes `value: null`, and `resolveLatestWinsInfo` overlays that `null` on top of the
base row. So **between the moment the activator flags a field and the moment the client replies,
the effective value of that field is `null`** — rendered as `""` by both
[`toActiveRequestDTO`](Apps/api/src/modules/activation/activation.mapper.ts#L218-L221) (`i.value ?? ''`)
and `toKeyVerificationDTO`.

Consequences, both live today:
- **The activator cannot see the value they just rejected.** The field goes blank on their card the
  instant they flag it, so they can no longer tell the client what was wrong with it.
- **The client's Step-2 prefill blanks that field**, defeating the Stage-04-fix #4A prefill whose
  whole purpose is to show the client their last saved values.

The redesign below fixes both as a direct consequence of storing the right thing in the right
table.

---

## 2. Target semantics

> **`ActivationInformation` is the single, current, authoritative value of every account field.**
> **`WrongInformation` is an immutable historical record of a value that was rejected.**

| # | Method | New behaviour |
|---|---|---|
| 1 | `submit()` | **unchanged** — still creates the base rows |
| 2 | `flagWrong()` | **snapshots** the field's current value into `WrongInformation.value` instead of writing `null` |
| 3 | `update()` | **upserts `ActivationInformation`** with the client's new value; **does not touch `WrongInformation`** |
| 4 | additional / OTP flow | **unchanged** — still step-stored, still overlaid at read time |

Read-time resolution becomes: **base `ActivationInformation`, overlaid by `additionalInformation`
only.** The `wrongInformation` overlay is removed — it must be, because after change 2 those rows
hold *old* values and overlaying them would resurrect the rejected value on top of the correction.

Round 2 of a correction composes naturally: flag USERNAME again → snapshot `"admin"` into the new
step's `WrongInformation` → client sends `"admin1"` → base row becomes `"admin1"`. The
`WrongInformation` rows across steps read chronologically as `adm`, `admin` — a clean rejection
history, with the live value always in one place.

---

## 3. Backend changes — the only package with real work

### 3.1 `resolveLatestWinsInfo` → `resolveEffectiveInfo`

[activation.service.ts:117-133](Apps/api/src/modules/activation/activation.service.ts#L117-L133).
Rename (the name now lies — it is no longer "latest wins across everything") and drop the
`wrongInformation` loop:

```
private resolveEffectiveInfo(base, steps): ActivationInfoEntry[] {
  const map = new Map(base.map(i => [i.accountInform, i.value]));
  // Only the additional-information (OTP) flow still stores its value on the step row.
  // wrongInformation rows now hold the REJECTED value and must never be overlaid.
  for (const step of [...steps].reverse())
    for (const a of step.additionalInformation) map.set(a.accountInform, a.value);
  return Array.from(map.entries()).map(([accountInform, value]) => ({ accountInform, value }));
}
```

- Keep the `[...steps].reverse()` + newest-wins ordering for the additional rows.
- **Keep overwriting with `null`.** `requestAdditional()` writes `{OTP, value: null}` and a
  re-request must invalidate a stale OTP — this preserves today's exact OTP behaviour, and
  `extractOtpValue()` ([:135-143](Apps/api/src/modules/activation/activation.service.ts#L135-L143))
  already has the same first-match-wins-including-null semantics. `extractOtpValue` is
  **unchanged**.
- The `steps` parameter type narrows to `{ additionalInformation: [...] }[]` — `wrongInformation`
  is no longer read by this helper. Widen at the call sites, don't fight the type.
- All three call sites (`verify():287`, `buildActiveRequestDTO():200`, `getById():1127`) keep
  calling it unchanged.

### 3.2 `flagWrong()` — snapshot the rejected value

[activation.service.ts:605-622](Apps/api/src/modules/activation/activation.service.ts#L605-L622).

The activation is already loaded with `ACTIVE_REQUEST_INCLUDE`
([:80-92](Apps/api/src/modules/activation/activation.service.ts#L80-L92)), which includes
`information: true` and the full `steps` tree. **No extra query.** Before the transaction:

```
const effective = new Map(
  this.resolveEffectiveInfo(activation.information, activation.steps)
      .map(i => [i.accountInform, i.value]),
);
```

then inside the existing `$transaction`:

```
await tx.wrongInformation.createMany({
  data: cmd.fields.map(f => ({
    activationStepId: step.id,
    accountInform: f as unknown as PrismaAccountInformation,
    // Snapshot of the value being rejected. Null only if the field was never submitted.
    value: effective.get(f) ?? null,
  })),
});
```

Everything else in `flagWrong` — the step create, the `Activation.activationStat` update, the
`activation:status-changed` emit, the returned `ActiveRequestDTO` — is unchanged.

### 3.3 `update()` — upsert the base row, leave history alone

[activation.service.ts:375-435](Apps/api/src/modules/activation/activation.service.ts#L375-L435).

**Query change (required).** The current `steps` include fetches the latest `WRONG_INFORMATION`
step but **not its `wrongInformation` rows** — and we now need them to know which fields were
actually flagged:

```
steps: {
  where: { activationStat: PrismaActivationStat.WRONG_INFORMATION },
  orderBy: { createdAt: 'desc' },
  take: 1,
  include: { wrongInformation: { select: { accountInform: true } } },
}
```

**Guard — only flagged fields may be written.** The client form
([AccountForm.tsx:116](Apps/web/src/components/sections/landing/AccountForm.tsx#L116)) sends
`toUpdateCommand(values)`, which is **every** account field, not just the flagged ones. Today
`updateMany` silently matches zero rows for an unflagged field, so an unflagged field is a no-op.
A naive `upsert` over `cmd.accountFields` would **remove that protection** and let a public,
unauthenticated caller rewrite any field of any activation awaiting correction. So:

```
const flagged = new Set(latestWrongStep.wrongInformation.map(w => w.accountInform));
const applicable = cmd.accountFields.filter(f => flagged.has(f.field));
```

Fields outside `flagged` are **ignored silently**, exactly as today — this is behaviour-preserving,
not a new restriction.

**The write**, inside the existing `$transaction`, replacing the `wrongInformation.updateMany`
block. Sequential `await`s, not `Promise.all` — concurrent upserts on the same compound unique can
race into a `P2002` inside a transaction:

```
for (const f of applicable) {
  await tx.activationInformation.upsert({
    where: { activationId_accountInform: { activationId, accountInform: f.field } },
    update: { value: f.value },
    create: { activationId, accountInform: f.field, value: f.value },
  });
}
```

`upsert` on the compound unique — not find-then-branch — so two concurrent submissions cannot
double-insert. `create` covers the (currently impossible, but cheap to support) case of a field
flagged that the client never submitted at all.

**`WrongInformation` is not written here.** Delete the `updateMany` entirely. Those rows were
written once at flag time and are now immutable.

The rest of the method — the `ActivationStep(PROCESSING)` create, the
`Activation.activationStat = PROCESSING` update, both `eventBus.emit` calls, the returned
`ClientActivationStatusDTO` — is unchanged.

### 3.4 Transaction boundary

Already correct and unchanged: `flagWrong` and `update` each wrap their writes in one
`this.prisma.$transaction(async (tx) => {...})`. The snapshot read in §3.2 happens **before** the
transaction, from data already in memory — no read is added inside a transaction, and no write
moves outside one. Both `eventBus.emit` calls stay **after** the transaction commits (matching
every other method in this service), so a rollback cannot emit a phantom event.

### 3.5 `schema.prisma` — comments only, no migration

```
model ActivationInformation {
  value String?  // SENSITIVE: may hold password/OTP. THE CURRENT value of the field —
                 // updated by ActivationService.update() on every client correction.
                 // Exposure: activator, client (key-gated), admin (D3).
}
model WrongInformation {
  value String?  // SENSITIVE: may hold a password. The value that was REJECTED, snapshotted
                 // at flagWrong() time. Immutable history — never overlaid onto the current
                 // value. The correction itself lands in ActivationInformation.
}
```

`AdditionalInformation`'s comment is updated by Set 2 (D3 exposure) and otherwise unchanged: it
still holds the client's OTP answer and **is** still overlaid.

### 3.6 What is explicitly NOT changing

| | Why |
|---|---|
| **Prisma schema shape** | The `@@unique([activationId, accountInform])` this set needs already exists. **No migration.** |
| **Contract** | No new command, no new route, no new event, no DTO field. `UpdateActivationSchema` is already `{ accountFields }`. |
| **Audit log** | `update()` is a **public, unauthenticated** route (`KEY_ROUTES.UPDATE`, [activation.routes.ts:52-56](Apps/api/src/modules/activation/activation.routes.ts#L52-L56)) — there is no actor, and `Log.userId` is non-nullable with an FK to `User`. A client correction cannot produce a `Log` row. The `ActivationStep` trail already records the transition. |
| **Realtime** | See §4. |
| **`additional()` / `requestAdditional()`** | Out of scope by decision. |
| **`extractOtpValue()`** | Still reads OTP from the step rows; unaffected. |
| **Frontend behaviour** | See §5. |

---

## 4. Realtime — no change, and here is the proof

`update()` already emits both events it needs, after the transaction
([:420-429](Apps/api/src/modules/activation/activation.service.ts#L420-L429)):

| Event | Payload | Gateway routing | Who sees what |
|---|---|---|---|
| `activation:client-updated` | `{activationId, activatorId, timestamp}` | [realtime-gateway.ts:78-86](Apps/api/src/common/realtime/realtime-gateway.ts#L78-L86) → `/activators` namespace, `rooms.activator(activatorId)` — **`Activator.id`, not `User.id`** | **The assigned activator only.** The gateway strips `activatorId` from the wire payload and sends `{activationId, timestamp}`. The web client ([realtime.ts](Apps/web/src/lib/realtime.ts)) invalidates `qk.activations.active()` → refetches `GET_ACTIVE` → the card re-renders with the corrected value. |
| `activation:status-changed` | `{activationId, status: PROCESSING, timestamp}` | [realtime-gateway.ts:102-107](Apps/api/src/common/realtime/realtime-gateway.ts#L102-L107) → `/client` namespace, `rooms.activation(activationId)` (self-subscribed with a `z.uuid()` guard) | **The client's own tab only.** Invalidates `qk.keys.status(activationId)` → refetches `KEY_ROUTES.STATUS`, which returns `ClientActivationStatusDTO = {activationId, status}` — **status only, zero field values.** |

**No field value ever crosses a socket**, in either direction, before or after this set. Both
payloads are ids and a timestamp; the data always arrives over the authenticated REST refetch. The
admin namespace receives nothing for a correction (it never did — admins see corrections on the
next detail fetch). Nothing in `realtime-gateway.ts`, `rooms.ts`, `event-bus.ts`, the contract's
`activation.events.ts`, or `Apps/web/src/lib/realtime.ts` is touched by this set.

---

## 5. Frontend — one label, no logic

The client form and the activator card need **no code change**: they already render whatever the
API returns, and the API's *effective* values are unchanged for the happy path. The two visible
improvements (activator keeps seeing the rejected value; client prefill no longer blanks) fall out
of the backend fix with no frontend edit.

**One admin-side wording change.** On the Set 2 detail page,
[ActivationTimeline.tsx](Apps/web/src/pages/admin/activations/components/ActivationTimeline.tsx)
renders `wrongFields` under the label `admin.activationDetail.timeline.wrongFields` = *"Incorrect
Fields"* / *"Champs incorrects"*, as `{fieldLabel}: {value}`. After this set that value is the
**rejected** value, which the current label does not convey — an admin would read
`Username: adm` as the current username.

| Key | en | fr |
|---|---|---|
| `admin.activationDetail.timeline.wrongFields` (**edit**) | Rejected Values | Valeurs rejetées |
| `admin.activationDetail.timeline.wrongFieldsHint` (**new**) | Value the activator rejected at this step | Valeur rejetée par l'activateur à cette étape |

Render the hint as a `text-xs text-muted-foreground` line under the heading. `ar` stays `""` on
both. No other translation key, component, hook, service or query key changes.

**Not doing:** a per-field "awaiting correction" badge on the activator card. Decided against —
`ActiveRequestDTO.accountFields` stays `{fieldLabel, value}` with no state, and the card's
`WRONG_INFORMATION` status badge already signals that a correction is outstanding.

---

## 6. Note for Set 6 (Telegram notifications)

Set 6's notifier subscribes to the event bus, never to a service. The events relevant to this flow
and their **exact** names and payloads:

```ts
// Apps/contract/src/modules/activation/activation.events.ts — unchanged by this set
'activation:client-updated': { activationId: string; activatorId: string; timestamp: string }
'activation:status-changed': { activationId: string; status: ClientActivationStatus; timestamp: string }
```

- **Subscribe to `activation:client-updated`**, not the withdrawn
  `activation:information-updated` — that event does not and will not exist.
- `activatorId` on the bus payload is the **`Activator.id`**, which is the row that carries
  `telegramChatId` (D7). No `User` lookup is needed to route the message.
- **The payload carries no field values.** The notifier must load them itself — the natural source
  is `resolveEffectiveInfo` via a service read, which after this set returns the *current* values
  straight from `ActivationInformation`.

**Content rules for the two templates, per the user's decision:**

| Template | Content |
|---|---|
| Information updated (`activation:client-updated` after a correction) | Send the **new** values, including the **PASSWORD in the clear**. Do not mask, do not omit, do not substitute a "password changed" placeholder. Same D3 reasoning as the admin detail DTO: it is the client's own Snapchat credential, not a system secret. |
| Additional information / OTP (`activation:client-updated` after `additional()`) | Send the **OTP value normally**. Do not hide it. |

Both messages go to a single activator's private Telegram chat, which is the same trust boundary
as their active-request card — where both values are already shown in the clear.

**Still forbidden in Set 6, unchanged:** `User.password`, refresh-token hashes and JWTs in any
message or log line; and the subscriber must wrap every handler like the gateway's
[`safe()`](Apps/api/src/common/realtime/realtime-gateway.ts#L10-L16) and defer the send off the
synchronous emit path (v2-decisions R5) — `eventBus.emit` is synchronous and uncaught inside
`update()`, so a throwing notifier would fail the client's correction request.

---

## 7. `version-2-description.md` edits

1. **Set 3 section fully rewritten** — title, `Touches:` line (prisma enum → none), scope, manual
   tests, plan prompt, execute prompt — to this set's subject.
2. **Set 6** — the notifier now subscribes to `activation:client-updated`, not
   `activation:information-updated`; and the template rules gain the two content lines from §6
   (send the new information including a wrong/changed password; send the OTP normally, unhidden).
3. **Set 12** — the plan-prompt line asking whether client self-correction "can reuse the Set 3
   admin correction endpoint" is dropped; there is no admin correction endpoint. Set 12 builds on
   `KEY_ROUTES.UPDATE`, whose semantics this set fixes.
4. **Sequencing note C** ("Set 3 edits exactly what Set 2 just learned to read") still holds — the
   dependency on Set 2 is kept: Set 2's unmasked timeline is where the rejected values become
   visible and verifiable.

No other section changes.

---

## 8. Open questions

**Q1 — the `SUBMITTED` re-edit path is broken today, and this set is where it surfaces.**
[AccountForm.tsx:60](Apps/web/src/components/sections/landing/AccountForm.tsx#L60) sets
`canEdit = status === SUBMITTED` and renders an edit action at `:318`; submitting routes to
`updateActivation` (`:116`), but
[`update()`](Apps/api/src/modules/activation/activation.service.ts#L388-L390) throws
`ConflictError('Activation is not awaiting correction')` unless the activation is
`WRONG_INFORMATION`. **So the advertised "edit within the pre-pickup window" always 409s.** It is
pre-existing and out of the stated scope, but it lands squarely in the method this set rewrites.
Options: (a) leave it, log it for Set 12; (b) fix it here — allow `update()` when the activation is
`PENDING` **or** `WRONG_INFORMATION`, upserting **all** submitted fields for `PENDING` (nothing was
flagged, the client owns the whole form) and flagged-only for `WRONG_INFORMATION`. **Recommend (b)**
— it is ~6 lines on top of the upsert this set already introduces, and the new
`ActivationInformation`-is-truth model makes it trivial, whereas the old step-row model could not
express it at all. **Needs your go-ahead before implementation.**

**Q2 — `clientFullName` / `clientPhone` on correction.** The form collects them and the client can
change them, but `UpdateActivationSchema` is `{ accountFields }` only, so they are silently
discarded on every update. Recommend leaving as-is (contract change, and the activator has no way
to flag them as wrong) — flagging it so it is a decision, not an oversight.

**Q3 — existing database rows carry the old inverted semantics.** Any activation already past a
correction has `ActivationInformation = "adm"` and `WrongInformation = "admin"`; after this set the
`wrongInformation` overlay is gone, so those rows will render the **stale** value. Per CLAUDE.md the
database holds throwaway test data — **recommend `npx prisma migrate reset` + reseed**
(`load_wilaya`, `load_commission_durations`, `create_admin_account`, `load_mock_data`) before manual
testing, so no legacy row muddies the results. No backfill script is warranted; confirm you're happy
to lose the current data.

**Q4 — seed coverage.** `scripts/load-mock-data.ts` builds activations via
`test/data/activation.factory.ts` (a **frozen** file), which creates `ActivationInformation` rows
and a single step — it never produces a `WRONG_INFORMATION` round. So **no seeded activation
exercises this flow**, and every test in §9 must be run against an activation created by hand
through the real client → activator path. Not a defect; just don't expect seeded data to cover it.

**Q5 — frozen tests.** `Apps/api/test/unit/modules/activation*.spec.ts` and
`test/integration/activation.spec.ts` assert the current `wrongInformation.updateMany` behaviour and
will break. Expected under the test freeze — **do not touch them**; verify with `git status`.

---

## 9. Manual test checklist

Run every step against a **freshly reseeded** database (Q3) and an activation created through the
real flow (Q4).

1. **Baseline submit.** Enter a card key on the public portal, submit the form with
   `USERNAME = "adm"` (plus email, phone, password). In the DB:
   `ActivationInformation` has one row per field, `USERNAME = "adm"`. No `WrongInformation` rows.
2. **Flag, then look at the activator card.** As the activator, take the request and flag USERNAME
   as wrong. **The card still shows `Username: adm`** — it must **not** go blank. *(This is the §1.5
   bug; before this set it blanks.)*
3. **Flag, then look at the client's form.** Re-check the same key in the public portal: the
   correction form prefills USERNAME with `"adm"`, not an empty box, and USERNAME is marked as the
   flagged field.
4. **The snapshot landed.** In the DB, the round-1 `WrongInformation` row for USERNAME has
   `value = "adm"` — **not `null`**.
5. **Correct it.** As the client, change USERNAME to `"admin"` and resubmit. Then in the DB:
   - `ActivationInformation.USERNAME = "admin"` ✅
   - the round-1 `WrongInformation.USERNAME` is **still `"adm"`** ✅ *(this is the whole point)*
   - **no duplicate `ActivationInformation` row** for `[activationId, USERNAME]` ✅
6. **The activator sees it live.** With the activator's Requests page open in another
   browser/profile during step 5, the card flips to `Username: admin` **without a manual refresh**
   (`activation:client-updated` → invalidate → refetch) and the status badge goes to `PROCESSING`.
7. **The client's own tab reacts.** The client's portal moves from "needs correction" to
   "processing" without a reload (`activation:status-changed`).
8. **Round 2 composes.** Flag USERNAME again → the new step's `WrongInformation.value = "admin"`
   (the round-1 correction). Client sends `"admin1"` → `ActivationInformation.USERNAME = "admin1"`.
   Two `WrongInformation` rows now read `adm`, `admin` in step order.
9. **Unflagged fields are ignored.** Flag only USERNAME, then correct USERNAME **and** change EMAIL
   in the same submission. `ActivationInformation.EMAIL` is **unchanged** — the client cannot
   rewrite a field nobody flagged.
10. **Admin detail agrees.** Open `/admin/activations/<id>`: Submitted Information shows
    `Username: admin1` (current), and the timeline's "Rejected Values" entries show `adm` then
    `admin` against their steps, with the new hint line.
11. **Password correction, in the clear.** Flag PASSWORD, correct it. `WrongInformation` holds the
    old password, `ActivationInformation` the new one, and the admin detail shows both unmasked
    (Set 2 / D3). Confirm neither value appears in the API server's Pino output.
12. **OTP flow untouched.** Request additional info (OTP) on a separate activation, have the client
    answer it. The activator's card shows the OTP in its dedicated row exactly as before, and
    `ActivationInformation` has **no** OTP row — the OTP still lives on the step. *(Regression
    check on §3.1.)*
13. **A field never submitted, then flagged.** Submit without EMAIL, flag EMAIL, correct it. The
    `WrongInformation.value` is `null` (nothing to snapshot) and the `upsert`'s `create` branch adds
    a new `ActivationInformation` row.
14. **Cancel / release still carry information forward.** Cancel a corrected activation and
    re-verify the key: the newly created activation carries the corrected values, not the originals.
15. **Nothing leaks over the socket.** With devtools open on the client tab, inspect the
    `activation:status-changed` frame: it contains `{activationId, status, timestamp}` and **no
    field values**. Same check on the activator's `activation:client-updated` frame.

---

## 10. Definition of done

- `npx tsc --noEmit` clean in `Apps/contract`, `Apps/api`, `Apps/web`
- eslint clean in all three
- `npx madge --circular src` clean in `Apps/contract` (unchanged, but run it)
- **No migration** — schema comments only
- No test file created, modified, deleted or run — verify with `git status`
- `resolveLatestWinsInfo` no longer exists by that name anywhere in `Apps/api/src`
- No password or OTP value in any `Log.actionDescription` or Pino line (this set writes neither)
- `version-2-description.md` updated per §7
- Report: files changed grouped by package, "migration: none", open questions, and the §9
  checklist, under `Docs/Stage-04-fix/results/set-3/`
- **Stop. Do not start Set 4.**
