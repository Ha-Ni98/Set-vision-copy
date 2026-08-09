# Stage-04 — Fix Plan #3: dashboard metrics, activator card, client portal step-2

> **Branch:** `test-version-1` · **Status:** in progress
>
> **Decisions locked with the user:**
> 1. **Freeze frees the slot.** A frozen activation leaves the activator's Active Requests list
>    **and** stops counting toward the 3-slot cap / dashboard "slots used". It stays in the
>    integrity guards (`LIVE_STATS`, `assertWorking`, delete-guard) so a frozen card can't be
>    double-activated and isn't silently orphaned.
> 2. **Client verify returns the real saved values, including the password.** Access is gated by
>    the client's own key, so returning real values (to prefill Step-2) is acceptable. No masking
>    on the client prefill path.
>
> Contract is consumed from source (`file:../contract` → `src/index.ts`), so schema edits flow
> through with no build step. Commit style: `git add .` + short message, no co-author.

---

## Context

Five reported defects, spanning all three layers (contract / api / web). They are independent and
can ship in any order, but they cluster into three areas: **dashboard metrics** (Issue 1–2),
**the activator's active-request card** (Issue 3.1–3.5), and **the client portal Step-2 form**
(Issue 4). Root causes below are all confirmed against the current code. Throughout, reuse the
existing helpers rather than adding parallel ones (`formatTime`, `statistics.time.ts`,
`resolveLatestWinsInfo`, the `field: AccountInformation` discriminator already used by
`flaggedFields`).

---

## Issue 1 — "Avg. Activation Time" must read `MM:SS` (e.g. `08:09`)

**Symptom:** shows `8:9.32774999999998` instead of `08:09`.

**Root cause — single shared formatter:** `Apps/web/src/lib/utils.ts` `formatTime()` (lines 10–14)
takes float seconds (the backend returns `totalMs / n / 1000`, a float) and (a) never rounds the
seconds → `9.327….toString()` = `"9.327…"`, and (b) never zero-pads the minutes.

**Fix (one place fixes all three displays):**
```ts
// utils.ts — round to whole seconds, zero-pad both parts ("MM:SS")
export function formatTime(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
```
All three call sites already use `formatTime`, so no other edits are needed:
- `Apps/web/src/pages/activator/DashboardPage.tsx` (activator dashboard, ~line 92)
- `Apps/web/src/pages/admin/activations/ActivationsPage.tsx` (admin activations, ~line 121)
- `Apps/web/src/pages/admin/activators/components/StatsRevenueGrid.tsx` (~line 27) and
  `.../components/ActivatorsTable.tsx` (~line 81) (admin activator profile)

Update the `"M:SS"` comment to `"MM:SS"`. No backend/contract change (rounding belongs in the
formatter; the DTO stays `z.number()`).

**Tests:** update the `formatTime` unit expectations under `Apps/web/tests` (e.g. `489.3271 → "08:09"`,
`5 → "00:05"`, `0 → "00:00"`).

---

## Issue 2 — Weekly Activations: today missing + bars don't render

Two independent bugs in the activator dashboard weekly chart.

### 2A. Today's activations dropped (backend, timezone bucketing)

**Not** a `<= today` cutoff — the query (`Apps/api/src/modules/activator/activator.service.ts`
`myStats()`, weekly branch ~lines 384–432) has no upper bound. The real cause: buckets are built
from **local-midnight** dates (`new Date(y, m, d)`, lines 355–359) but keyed with
`d.toISOString().slice(0,10)` (UTC), and each `completedAt` is bucketed the same way. When the
server offset ≠ 0 (this app is Africa/Algiers, UTC+1), a local-midnight date serialized to UTC
shifts back a day, so today's UTC date has no matching bucket key → today's activations are
dropped.

**Fix — reuse the timezone-aware helpers already in the statistics module**
(`Apps/api/src/modules/statistics/statistics.time.ts`: `todayStart()`, `bucketDate(date,'day')`):
- Compute `todayStart` via `todayStart()` (Algiers day start), and keep the rolling window
  `weekStart = todayStart − 6 days` (do **not** use `weekStart()` — that returns Monday; the chart
  is a rolling 7-day window ending today, per the Sun–Sat screenshot).
- Build the 7 bucket keys **and** bucket each `completedAt` through `bucketDate(d, 'day')` so both
  sides use the identical Algiers day boundary (compare by `.getTime()`/ISO of the bucketed date).
- Apply the same `todayStart()` to the `activationsToday` count (~line 377) so the "+N today"
  card and the today bar agree.
- Cleanest: hoist the Algiers offset + `todayStart`/`bucketDate` into a shared
  `Apps/api/src/common/utils/time.ts` and import from both `statistics` and `activator`. If you
  prefer minimal churn, import them directly from `statistics/statistics.time.ts`.

### 2B. Bars don't render — only the count numbers show (frontend, CSS)

`Apps/web/src/pages/activator/DashboardPage.tsx` (~lines 127–148). The row wrapper is
`flex h-48 items-end` — `items-end` stops the day **columns** from stretching to the container
height, so the inner bar wrapper (`flex-1`) has no definite height and the bar's `height: ${h}%`
resolves against ~0 and collapses. Only the absolutely-positioned count label (`-top-5`) and the
weekday label (in normal flow) remain visible → exactly the reported screenshot (numbers, no bars),
even though counts of 1 and 2 exist.

**Fix:** let the columns fill the height — change the row wrapper `items-end` → `items-stretch`
(or add `h-full` to the per-day column `div` at ~line 131). The inner wrapper keeps `items-end`,
so bars still bottom-align. Optional polish: give the bar a small `min-h` (e.g. `min-h-[2px]` when
`d.count > 0`) so a `1`-of-`2` bar is a visible sliver.

**Verify:** with 2A fixed the data is correct; with 2B fixed the bars render proportionally.

---

## Issue 3 — Activator active-request card (`Apps/web/src/components/sections/activator/ActiveRequestCard.tsx`)

### 3.1 Frozen card must leave the list + free the slot (backend)

**Root cause:** `Apps/api/src/modules/activation/activation.service.ts` — `WORKING_STATS`
(lines 51–56) **includes `FREEZE`**, and it drives the active list (`getActive`, line 521) *and*
the slot-cap count (`take`, line 533). So a frozen activation stays listed and keeps its slot.

**Fix (per locked decision — free the slot, keep integrity guards):**
- Add `const ACTIVE_SLOT_STATS = WORKING_STATS.filter(s => s !== FREEZE)` (i.e. PROCESSING,
  WRONG_INFORMATION, ADDITIONAL_INFORMATION).
- Use `ACTIVE_SLOT_STATS` at **line 521** (`getActive` list) and **line 533** (`take` cap count).
- Leave `WORKING_STATS` unchanged for `LIVE_STATS` (line 58 — a frozen card still blocks a second
  activation on the same card) and the `assertWorking` guard (line 106).
- Activator dashboard "slots used": `Apps/api/src/modules/activator/activator.service.ts`
  `IN_PROGRESS_STATS` (lines 24–29) includes `FREEZE` and feeds `activeSlotsUsed` (`myStats`,
  line 375). Add `const ACTIVE_SLOT_STATS = IN_PROGRESS_STATS.filter(s => s !== FREEZE)` and use it
  at **line 375 only**. Keep `IN_PROGRESS_STATS` (with FREEZE) for the delete-guard (line 293) so
  an activator with unresolved frozen work still can't be silently deleted.

Frontend needs no change: `useFreezeActivation` already invalidates `qk.activations.active()`, so
after the backend stops returning FREEZE the refetch drops the card and the dashboard slot count
updates. (`activation:frozen` correctly goes to the admin bell only.)

**Tests:** `activation.service` — `getActive`/`take` exclude FREEZE; `activator.service` —
`activeSlotsUsed` excludes FREEZE; integration: freeze → card gone from active list, slot freed.

### 3.2 Blank Snap phone must stay blank (frontend)

**Root cause:** `Apps/web/src/components/sections/landing/account-form.schema.ts` `toAccountFields()`
(~line 62) stores `PHONE_NUMBER = values.snapchatPhone || values.phone` — falls back to the client's
personal phone, which then shows in the card's Snap "Phone Number".

**Fix:** drop the fallback → `value: values.snapchatPhone?.trim() ?? ''` (applies to both
`toSubmitCommand` and `toUpdateCommand`). An empty value renders a blank row in the card; optionally
skip rendering the `PHONE_NUMBER` row when empty in `ActiveRequestCard.tsx` (~lines 231–238). This
also makes the Issue-4 prefill show the Snap phone truthfully (empty, not the personal number).

### 3.3 OTP shown twice → show only the most recent (backend)

**Root cause:** `Apps/api/src/modules/activation/activation.mapper.ts` `toActiveRequestDTO`
builds `accountFields` from `resolveLatestWinsInfo()` — which merges `additionalInformation`
(includes `OTP`) into the field map (service lines 111–127) — **and** separately emits `otpValue`
via `extractOtpValue()`. So OTP appears in `accountFields` and again as the dedicated OTP row.

**Fix:** keep the dedicated `otpValue`, remove OTP from `accountFields` — exclude
`AccountInformation.OTP` in `resolveLatestWinsInfo()` (skip it in the `additionalInformation`
merge, line 121) or filter it out where `accountFields` is built in the mapper. Also make
`extractOtpValue()` (service lines 129–137) return the **most recent** OTP: it currently returns
the first step's OTP; ensure it scans steps newest-first (the `getActive` include orders steps
ascending, so reverse or sort by `createdAt` desc before picking).

**Tests:** mapper unit — OTP absent from `accountFields`, `otpValue` = latest OTP.

### 3.4 Client edits don't reach the card live (backend — socket room mismatch)

**Root cause (confirmed):** an **id mismatch** on the activator room. On connect the activator
joins `rooms.activator(socket.data.user.id)` = **User.id**
(`Apps/api/src/common/realtime/realtime-gateway.ts` line 24), but `activation:client-updated`
(and `activation:resolved`) emit to `rooms.activator(activation.activatorId)` = the **Activator
entity id** (lines 57, 71). Different UUIDs → the emit lands in an empty room → the activator never
refetches → the card only updates on manual refresh. (The whole chain is otherwise wired correctly:
`update()`/`additional()` emit the event, and `lib/realtime.ts` listens and invalidates
`qk.activations.active()`.) `socket.data.user` is just the JWT payload (`socket-auth.ts` line 17),
which carries the user id, not the activator id.

**Fix — make the join key match the emit key (Activator.id):** resolve the connecting user's
`Activator.id` and join `rooms.activator(activatorId)`. Two viable spots — pick per what's cleanest
in this codebase:
- In `socket-auth.ts`, after verifying the JWT, look up the activator for that user and stash
  `socket.data.user.activatorId`; the gateway joins with it. (Keeps the gateway prisma-free.)
- Or thread a prisma handle into `initRealtimeGateway` and resolve `userId → activator.id` in the
  activator `connection` handler.

This one change also repairs `activation:resolved` delivery (same mismatch). Keep the emit sites as
they are (they already use `activation.activatorId`).

**Tests:** integration/gateway — an `activation:client-updated` for activation X reaches the socket
joined by that activator's user; frontend already covered by the existing realtime listener test.

### 3.5 "Wrong Info" / "Request OTP" buttons overlap (frontend, CSS)

**Root cause:** `ActiveRequestCard.tsx` line 244 — `grid grid-cols-3 gap-2 sm:grid-cols-5` packs
five icon+text buttons into a 3-column mobile grid; the icon+label content overflows the ~1/3
tracks and visually collides.

**Fix:** give the buttons room, e.g. `grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5`, and
prevent intra-button overflow (`min-w-0` on buttons, `truncate`/`whitespace-nowrap` on labels as
needed). Verify Wrong-Info and Request-OTP no longer overlap at mobile widths.

---

## Issue 4 — Client portal Step-2 form (`Apps/web/src/components/sections/landing/AccountForm.tsx`)

### 4A. Saved values must prefill on re-check / state change

**Root causes (compounded):**
1. `verify()` (`activation.service.ts` 235–291) never returns the client's personal info
   (`clientFullName`, `clientPhone` — stored on the activation at submit, lines 320–321).
2. The verify mapper (`toKeyVerificationDTO`, `activation.mapper.ts` 107–157) builds
   `submittedFields` from **base `information`** only; after a correction the new values live in
   `steps[].wrongInformation` (see `update()`, lines 382–393, which never touches base
   `information`), so base values are stale.
3. Values are **masked** (`maskValue`) and matched on the frontend by **free-text labels**
   (`AccountForm.tsx` `SUBMITTED_FIELD_LABELS`) that don't match the backend's `FIELD_LABEL`
   (`"Snapchat Username"` vs `"Username"`, etc.), so `findSubmitted()` returns `""` → empty form.

**Fix — return real, latest-wins, discriminator-keyed values (per locked decision, incl. password):**
- **Contract** (`Apps/contract/src/modules/activation/activation.dtos.ts`,
  `KeyVerificationResponseSchema`): change `submittedFields` to a discriminator shape
  `z.array(z.object({ field: z.enum(AccountInformation), value: z.string() }))` (a new
  `SubmittedFieldSchema`; **don't** overload the label-based `AccountFieldValueSchema` used by the
  activator/timeline DTOs), and add `clientFullName: z.string().nullable().optional()` +
  `clientPhone: z.string().nullable().optional()`. `flaggedFields` already uses the `field` enum.
- **API** `verify()`: fetch `clientFullName`, `clientPhone`, base `information` (with values), and
  **all** `steps` with `wrongInformation`+`additionalInformation` **values** (drop the value-less
  mapping and `take:1` used today), then pass to the mapper.
- **API** `toKeyVerificationDTO`: build `submittedFields` from `resolveLatestWinsInfo(information,
  steps)` (latest value wins), keyed by `field`, **no masking** (real values, incl. `PASSWORD`);
  add `clientFullName`/`clientPhone`. `maskValue` is only used here, so dropping it is contained.
- **Web** `AccountForm.tsx`: prefill `defaultValues` by matching on the `field` enum
  (`USERNAME→username`, `EMAIL→email`, `PHONE_NUMBER→snapchatPhone`, `PASSWORD→password`), plus
  `clientFullName→fullName`, `clientPhone→phone`; set `confirmPassword = password` so validation
  passes. Delete the `SUBMITTED_FIELD_LABELS`/`findSubmitted` label matching and the
  `MASKED_PASSWORD` placeholder (a real password is now returned). Update the carrier types
  `Apps/web/src/types/key-flow.ts` and `Apps/web/src/components/providers/ActivationProvider.tsx`.

### 4B. After "wrong information", fields must become editable live (no refresh)

**Root causes:** (1) the live status arrives via `useActivationStatus`, whose
`ClientActivationStatusDTO` is only `{activationId, status}` — so `LandingPage.applyStatus`
(lines 115–118) updates status but never refreshes `flaggedFields`/values; (2) `AccountForm`'s
`editing` is set once in the `useState` initializer (line 78), so a live SUBMITTED→NEEDS_CORRECTION
transition re-renders with `isCorrection=true` but leaves `editing=false` → fields stay disabled
and no flags show. The client namespace subscription itself works (`clientNs` /
`rooms.activation(activationId)`, subscribed on `useVerifyKey` success), so the status event does
arrive.

**Fix — refresh the full verify payload on a live transition, and re-init the form:**
- In `LandingPage.tsx`, when the status effect (lines 123–133) detects a change into a
  form-affecting status, re-run `verifyKey.mutate({ key: activation.key })` (the key is retained in
  context) and `setActivation({ ...data, key })`, so `flaggedFields` + prefilled values refresh
  from the now-complete `verify` — instead of the status-only `applyStatus`. (Keeps the socket
  backbone; layers a full refresh onto real transitions. No `ClientActivationStatusDTO` change
  needed.)
- Re-initialize the form on status change: pass `key={`${status}`}` (or `${status}-${activationId}`)
  to `<AccountForm>` in `LandingPage.tsx` so a transition remounts it with fresh `defaultValues`
  and `editing` — NEEDS_CORRECTION is then immediately editable with flagged fields highlighted,
  no manual refresh.

**Tests:** contract conformance for the new `KeyVerificationDTO` fields; API `verify` unit —
returns latest-wins real values (incl. password) + personal info after a correction cycle; web —
`AccountForm` prefills from discriminator fields; `LandingPage` re-verifies on a live
status-changed and the form becomes editable.

---

## Sequencing

Independent; suggested order (cheap → cross-stack):
1. **Issue 1** — `formatTime` one-liner (+ test).
2. **Issue 3.5 / 3.2 / 2B** — small frontend CSS/logic fixes.
3. **Issue 2A** — backend timezone bucketing (reuse `statistics.time.ts`).
4. **Issue 3.1 / 3.3** — backend stat constants + mapper.
5. **Issue 3.4** — socket room id alignment.
6. **Issue 4A → 4B** — contract → api (`verify`/mapper) → web (form prefill, re-verify on live change).

## Verification (live)

- **Avg time:** dashboards/profile show `MM:SS` (the `8:9.327…` case → `08:09`).
- **Weekly chart:** complete an activation now → it appears in **today's** bar; bars render
  proportionally (not just numbers).
- **Freeze:** activator freezes → card disappears from Active Requests and "slots used" drops.
- **Snap phone:** submit with an empty Snap phone → activator card shows it blank (not the personal
  phone).
- **OTP:** request OTP → the card shows exactly one OTP row (most recent).
- **Live client edit:** client corrects flagged info → the activator's open card updates without a
  manual refresh.
- **Client Step-2:** re-check the key (or receive a live state change) → the form is prefilled with
  the previously-saved values (incl. password); after the activator flags wrong info the flagged
  fields become editable and highlighted without refreshing.
- Run `Apps/api` and `Apps/web` test suites for the touched modules.
