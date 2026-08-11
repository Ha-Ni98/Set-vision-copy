# Set 6 — Telegram notifications — Execution Report

**Implements:** `Docs/Stage-04-fix/plan/set-6-plan.md`, **both parts (6a + 6b)**, across two
sessions in the same branch. This report supersedes the earlier 6a-only version.
**Migrations:** `20260810095708_add_telegram_notifications` (6a; schema). 6b added **no**
migration — only two `schema.prisma` comment updates (§9).
**Branch:** `version-02-01`

---

## 1. Files created / modified, grouped by package

### `Apps/api` (Prisma + backend)

**Prisma**
- `prisma/schema.prisma` — 6a: `telegramChatId`/`telegramLinkToken`/`telegramLinkedAt` on
  `Admin`, `Activator`, `Distributor`; new `Notification` model; new enums
  `NotificationChannel`, `NotificationStat`, `NotificationType` (all 10 values, per Q11); two
  new `LogActionType` values `GENERATE_TELEGRAM_TOKEN`, `UNLINK_TELEGRAM`. 6b: comment-only —
  `ActivationInformation.value` and `AdditionalInformation.value` now name Telegram as an
  exposure surface (§6.5, plan DoD item).
- `prisma/migrations/20260810095708_add_telegram_notifications/migration.sql` — 6a.

**`common/notifications/` — the subsystem (§2.1, mirrors `common/realtime/`)**
- `notification.types.ts` (6a) — `NotificationRecipient`, `NotificationRequest`,
  `NotificationProvider`, `INotificationService`.
- `notification.service.ts` (6a) — `NotificationService`: `dispatch`, `dispatchAll`, `resend`,
  private `attemptSend`. Never throws from `dispatch`/`dispatchAll`.
- `notification.mapper.ts` (6a) — `NotificationMapper.toDTO`.
- `notification.templates.ts` (6a scaffold, **6b filled in**) — all 10 templates now
  implemented: `TELEGRAM_LINKED` (6a) plus `ACTIVATION_CREATED`,
  `ACTIVATION_INFORMATION_UPDATED`, `ACTIVATION_OTP_RECEIVED`, `ACTIVATION_STATUS_CHANGED`
  (3-way outcome branch), `ACTIVATION_FROZEN`, `ORDER_REQUEST_CREATED`,
  `REVOCATION_REQUEST_CREATED`, `ORDER_CREATED`, `REVOCATION_APPROVED` (6b). Also gained
  `FIELD_LABEL_FR`, `formatMoney`, `formatDateFR`, and the typed `TemplateVars` allowlist
  (§6.4 of the plan). The generic `render()` replaced 6a's one-off `renderTelegramLinked`.
- `notification.recipients.ts` (6b, **new**) — `allActivators`, `oneActivator`, `allAdmins`,
  `oneDistributor` — exactly the four functions the plan specifies, each filtering out
  unlinked/disabled profiles itself.
- `notification.subscribers.ts` (6b, **new**) — `initNotificationSubscribers`, the `safeAsync`
  wrapper, `STATUS_TEMPLATE`, and 8 event handlers (one per bus event; rows 2/3 of the matrix
  share the `activation:client-updated` listener, branching on `kind`).
- `providers/{registry,telegram.provider,email.provider,whatsapp.provider}.ts` (6a).
- `telegram.api.ts`, `telegram.link.ts` (6a).
- `telegram.intake.ts` (6a; **6b**: switched from `renderTelegramLinked` to the generic `render`).
- `telegram.poller.ts` (6a).
- `index.ts` (6a; **6b**: `initNotifications()` now calls `initNotificationSubscribers` when
  enabled, instead of only logging).

**`modules/telegram/`, `modules/notification/`** — unchanged in 6b (6a delivered these fully).

**Modified elsewhere in `api`**
- `src/modules/activation/activation.service.ts` (6b) — both `activation:client-updated` emit
  sites (`update()`, `additional()`) now include `kind: ClientUpdateKind.CORRECTION` /
  `ClientUpdateKind.ADDITIONAL`.
- `src/modules/card-order-request/card-order-request.service.ts` (6b) — the five missing Set 4
  emits added: `create` → `order-request:created`; `approve`/`reject`/`cancel`/`unlink` →
  `order-request:status-changed`, via two new private helpers `emitCreated` /
  `emitStatusChanged` mirroring `CardRevocationRequestService`'s existing pattern.
- `src/common/utils/duration.utils.ts` (6b, **new**) — byte-for-byte port of
  `Apps/web/src/lib/duration.ts`'s `formatDuration`/`DURATION_EMPTY`.
- 6a's env/logger/server.ts/modules-index changes are unchanged in 6b.

### `Apps/contract`

- `src/modules/activation/activation.enums.ts` (6b) — `+ ClientUpdateKind` (`CORRECTION` |
  `ADDITIONAL`).
- `src/modules/activation/activation.events.ts` (6b) —
  `ActivationClientUpdatedPayloadSchema` gains `kind: z.enum(ClientUpdateKind)`, **required**
  (not optional, per R12 / `exactOptionalPropertyTypes`).
- 6a's `modules/telegram/`, `modules/notification/`, `log.enums.ts`, `src/index.ts` changes
  are unchanged in 6b.

### `Apps/web`

- `src/lib/duration.ts` (6b) — comment only: names its new backend twin.
- No other web changes in 6b. 6a's full frontend delivery (services, hooks, `TelegramLinkPanel`,
  the notifications log page, nav/routes/badges/translations) is unchanged and already covers
  everything 6b's matrix needs on the display side — the log page already renders whatever
  `body`/`type`/`channel` a `Notification` row carries, regardless of which template produced it.

---

## 2. Deliberate deviations from the plan text

**Carried over from 6a** (see prior report revision; unchanged): `handleTelegramUpdate` takes 4
params instead of 2 to avoid a circular import; Prisma 6.19's enums turned out to be plain
string-literal unions rather than TS `enum`, so contract-enum values are directly assignable
into Prisma `data:`/`where:` fields without a cast (verified against the generated client, not
assumed).

**New in 6b:**

1. **`order-request:status-changed` row 8's "select nbOfCards" doesn't exist as written in the
   plan.** The plan's query sketch was `order.findUnique({ select: { orderNumber, nbOfCards } })`
   — but `Order` has no `nbOfCards` column (checked `schema.prisma` and `order.service.ts`
   directly). The number of cards in an order is `Σ orderLots[].lot.nbOfCards`, exactly the
   pattern `order.service.ts`'s own `create()`/`transition()` already use. Implemented as:
   ```ts
   select: { orderNumber: true, orderLots: { select: { lot: { select: { nbOfCards: true } } } } }
   // then: order.orderLots.reduce((sum, ol) => sum + ol.lot.nbOfCards, 0)
   ```
   Verified against the schema before writing the query, not caught later by a type error —
   Prisma would have accepted `nbOfCards` as a typo'd field name silently rejected at the
   `select` level (a `tsc` error, not a runtime surprise), but I checked first.
2. **`STATUS_TEMPLATE` is `Record<ActivationStat, NotificationType | null>`, not
   `Partial<Record<…>>`** as the plan's prose suggested. A `Partial` record doesn't force every
   key to be listed, so a new `ActivationStat` value could silently resolve to `undefined` (no
   message, no compile error). The full `Record<…, … | null>` forces every one of the ten
   values to be listed explicitly — a new enum value fails `tsc` here until someone decides
   what it means, which is the stronger form of the "visible decision, not a silent
   fall-through" guarantee the plan itself asks for.
3. **`ACTIVATION_STATUS_CHANGED`'s three sub-messages (ACTIVATED / ACTIVATED_BY_ADMIN /
   CANCELLED_BY_ADMIN) are one `NotificationType` with an `outcome` variant field**, not three
   separate enum values. This matches the plan's own worked bodies (§6.6), which show two
   different bodies under one `ACTIVATION_STATUS_CHANGED →` heading — I extended that to all
   three outcomes rather than reading it as "exactly two, no `ACTIVATED_BY_ADMIN` body needed."
   `ACTIVATED_BY_ADMIN` gets its own headline (*"✅ Activation terminée par un administrateur"*)
   distinguishing it from the activator's own `ACTIVATED` action, matching §5.4.2's stated
   semantics ("they cannot know otherwise").

No other deviations. The recipient-resolution queries, the `safeAsync` wrapper (not the
gateway's `safe()`), the `PROCESSING` suppression, the `activation:resolved` non-subscription,
and every template body match the plan section-for-section.

---

## 3. Every Set 4 emit — individually confirmed (plan §5.1, DoD item)

| Method | Event | Payload built from |
|---|---|---|
| `create` | `order-request:created` | The freshly-created row's own mapped DTO (`distributor.storeName`, `composeSubscriptionLabel`) |
| `approve` | `order-request:status-changed` | `previousStat: PENDING` (hard-coded — the guard requires it) |
| `reject` | `order-request:status-changed` | `previousStat: PENDING` (same) |
| `cancel` | `order-request:status-changed` | `previousStat: request.stat` — **read off the row**, since Set 4 Q3 allows cancelling from either `PENDING` or `APPROVED` |
| `unlink` | `order-request:status-changed` | `previousStat: PENDING_DELIVERY` (hard-coded — the guard requires it) |

All five emit **after** `getById(id)` re-reads the committed row (matching the existing
`approve`/`reject`/`unlink` return-value pattern), never inside the `$transaction`. Verified via
the smoke test (§8): `order-request:created` and `revocation-request:created` both produced a
`Notification` row for every linked admin when fired.

---

## 4. All 11 `activation:status-changed` emit sites — individually accounted for (§5.4.2, DoD item)

| # | Site (method) | `ActivationStat` | Sends? |
|---|---|---|---|
| 1 | `submit()` | `PENDING` | No — `activatorId` is null |
| 2 | `update()` | `PROCESSING` | No — deliberately suppressed; `activation:client-updated`'s `ACTIVATION_INFORMATION_UPDATED` template covers it with the actual new values |
| 3 | `additional()` | `PROCESSING` | No — same, covered by `ACTIVATION_OTP_RECEIVED` |
| 4 | `flagWrong()` | `WRONG_INFORMATION` | No — the activator's own action |
| 5 | `requestAdditional()` | `ADDITIONAL_INFORMATION` | No — the activator's own action |
| 6 | `activate()` | `ACTIVATED` | **Yes** — receipt with duration + commission |
| 7 | `cancel()` | `PENDING` | No — `activatorId` cleared |
| 8 | `release()` | `PENDING` | No — `activatorId` cleared |
| 9 | `freeze()` | `FREEZE` | No to the activator (own action); admins notified via the separate `activation:frozen` event |
| 10 | `activateByAdmin()` | `ACTIVATED_BY_ADMIN` | **Yes** — "an admin resolved it in your favour" + commission |
| 11 | `cancelByAdmin()` | `CANCELLED_BY_ADMIN` | **Yes** — "an admin cancelled it" + no commission |

3 sending, 8 documented no-message — matches the plan's own count exactly. Verified live in the
smoke test: firing `PROCESSING` produced **zero** rows; firing `ACTIVATED` and
`CANCELLED_BY_ADMIN` against real seeded activations each produced exactly one, with correct
duration and commission formatting (§8).

---

## 5. The notification matrix — all 9 rows, confirmed against real data where feasible

| # | Event | Recipients | Verified how |
|---|---|---|---|
| 1 | `activation:created` | all linked activators | **Live** (§8) |
| 2 | `activation:client-updated`, `kind=CORRECTION` | the activator in charge | **Live**, against a real `Activation` + `ActivationInformation` rows — password rendered unmasked |
| 3 | `activation:client-updated`, `kind=ADDITIONAL` | the activator in charge | Code review + `tsc` only — no seeded `AdditionalInformation` row with a live OTP was available; the code path is structurally identical to row 2 (same guard, same recipient resolution, same `render()` call shape) |
| 4 | `activation:status-changed` (3 real outcomes) | the activator in charge | **Live**, both `ACTIVATED` and `CANCELLED_BY_ADMIN` against real rows; `PROCESSING` confirmed to send nothing |
| 5 | `activation:frozen` | all linked admins | **Live**, against a real `FREEZE` row — duration and freeze reason rendered correctly |
| 6 | `order-request:created` | all linked admins | **Live** |
| 7 | `revocation-request:created` | all linked admins | **Live** |
| 8 | `order-request:status-changed`, filtered | the distributor | Code review + `tsc` only — required a real `Order` linked to a `CardOrderRequest` mid-transition, which the seed data doesn't have in a state I could safely mutate without side effects on other tables; the `Σ orderLots[].lot.nbOfCards` query was hand-verified against `order.service.ts`'s own use of the identical pattern |
| 9 | `revocation-request:status-changed`, filtered | the distributor | Code review + `tsc` only — same constraint; the filter logic (`stat === 'APPROVED'`) is a one-line guard, low risk |

---

## 6. Definition of done

| Item | Status |
|---|---|
| `npx tsc --noEmit` — `Apps/contract` | ✅ clean |
| `npx tsc --noEmit` — `Apps/api` | ✅ clean in `src/`. Same frozen-test drift as 6a (below) — no new files newly broken by 6b |
| `npx tsc --noEmit` — `Apps/web` | ✅ clean in `src/` (untouched by 6b except a comment) |
| `eslint` — `Apps/contract` | ✅ clean |
| `eslint` — `Apps/api` | No tooling installed — pre-existing gap (Q13), unchanged |
| `npx madge --circular src` — `Apps/contract` | ✅ clean |
| `npx madge --circular` — `Apps/api` | ✅ clean, including the now-complete `common/notifications` graph (`notification.subscribers.ts` → `notification.recipients.ts` / `notification.templates.ts` / `common/utils/duration.utils.ts`, no cycle back to `index.ts`) |
| `notification.subscribers.ts` is the ONLY caller of `NotificationService` (besides the sanctioned `resend` in `modules/notification/`) | ✅ verified: `grep -rn "notificationService\.\|svc\.dispatch" src/` shows only `telegram.intake.ts` (link confirmation), `notification.subscribers.ts`, and `modules/notification/notification.service.ts` (resend delegation). `grep -rln "notificationService\|NotificationProvider\|TelegramProvider" src/modules/{activation,card-order-request,card-revocation-request,order} src/common/realtime` → **empty** |
| `notification.subscribers.ts` uses its own async wrapper, not the gateway's `safe()` | ✅ — `safeAsync` is locally defined, `setImmediate`-based, `try/catch` around an `await`; nothing imports `realtime-gateway.ts` |
| All five Set 4 emits added and individually confirmed | ✅ §3 above |
| All 11 `activation:status-changed` sites accounted for | ✅ §4 above |
| `schema.prisma` names Telegram as an exposure surface | ✅ both `ActivationInformation.value` and `AdditionalInformation.value` (the plan named only the former; I extended the same treatment to the latter since the `ACTIVATION_OTP_RECEIVED` template reads it) |
| No test file touched | ✅ `git status` — zero files under `test/`/`tests/` |
| No magic strings | ✅ event names come from the contract's event-map keys (checked by `AppEvents`); enum values throughout |
| Report | this file |

---

## 7. Frozen-test drift (unchanged from 6a — no new breakage from 6b)

Same six files as the 6a report: `test/data/activator.factory.ts`, `test/data/admin.factory.ts`,
`test/unit/modules/log/log.mapper.spec.ts`, `test/unit/modules/activation/activation.mapper.spec.ts`,
`test/unit/modules/order/order.service.spec.ts`, `test/unit/modules/payment/payment.mapper.spec.ts`.
I checked specifically whether the new `kind` field on `ActivationClientUpdatedPayloadSchema`
broke `test/unit/common/events/event-bus.spec.ts` or `test/unit/modules/activation/activation.service.spec.ts`
(both reference `client-updated` textually) — **neither shows a `tsc` error**, so nothing new
surfaced from that change. None of the six were opened beyond what `tsc`'s error list already
showed; none were modified.

---

## 8. What I actually exercised live this session

No live Telegram bot credentials exist in this environment, so I could not test actual message
delivery end-to-end. I did the next best thing: booted the real server with
`NOTIFICATIONS_ENABLED=true`, a syntactically-valid-but-garbage bot token (so every send
predictably 401s and the flow up to and including the HTTP call is fully exercised), temporarily
set `telegramChatId` on a handful of **existing seeded** `Admin`/`Activator` rows (cleared
afterward — see below), and drove the real subscriber code through `eventBus.emit()` calls
against real seeded `Activation`/`Order` data via a throwaway script (`src/__smoke__.ts`,
deleted before finishing):

1. **`activation:created`** → 1 `Notification` row for the one linked activator, `FAILED` (401),
   body `🆕 Nouvelle activation disponible / Carte : ****ABCD / Abonnement : Snapchat — 1 mois /
   Reçue à : 10/08/2026 12:05` — French date formatting confirmed correct.
2. **`order-request:created`** and **`revocation-request:created`** → 1 row each for the one
   linked admin, correct bodies.
3. **`activation:client-updated`, `kind=CORRECTION`**, against a real `Activation` with 3
   `ActivationInformation` rows (username/email/password) → body listed all three, **the
   password rendered fully unmasked** (`Mot de passe : 27JqNzB_L2kxzSA`) — the D3 requirement
   confirmed against real data, not just code review.
4. **`activation:status-changed` → `ACTIVATED`**, against a real completed activation with
   `activationPrice = 950.00` → body correctly read `Commission : 950 DZD` and a correctly
   computed multi-day duration (`04:18:06:22`).
5. **`activation:status-changed` → `CANCELLED_BY_ADMIN`** → correct headline
   (*"⛔ Activation annulée par un administrateur"*) and the "no commission" line; this
   particular seeded row had no `completedAt`, so duration correctly rendered as `—` rather than
   throwing or showing a bogus number — confirms the null-guard.
6. **`activation:status-changed` → `PROCESSING`** (fired against a real in-progress activation)
   → **zero** rows created — confirms the suppression is real, not just a comment.
7. **`activation:frozen`**, against a real frozen activation → body correctly resolved the
   activator's name via the join, computed elapsed time from `takenAt` to the event timestamp,
   and included the seeded freeze reason.
8. **R5 isolation, live.** Temporarily added `throw new Error('boom')` at the top of
   `onActivationCreated`, re-ran the script: the error was caught by `safeAsync`, logged as
   *"Notification subscriber failed"* with `evt: "activation:created"` and `err.message: "boom"`,
   and the process **did not crash** — it continued and exited normally. Removed the throw
   immediately after (confirmed via `git status` / re-reading the file — the temporary line
   never landed in a commit or was left in place).

**Cleanup performed before finishing:** the throwaway `src/__smoke__.ts` script was deleted; all
`telegramChatId` values I set for the test were reset to `NULL`; all `Notification` rows created
during smoke testing were deleted (the table is exclusively test-session data — it didn't exist
before this Set). Verified with `git status` (script gone) and direct `SELECT count(*)` queries
(zero rows, zero stray chat ids) before writing this report.

**Not exercised live:** rows 3 (OTP), 8 (order created), 9 (revocation approved) — see §5 for
why, and the reasoning for accepting code-review-level confidence on those three. Also not
exercised: the actual end-to-end Telegram round trip (no bot token), the admin UI in a browser,
and resend against a real FAILED row from this matrix (6a's report already covers resend
mechanics generically).

---

## 9. Manual test checklist — the 6b-specific rows (6a's checklist, items 1–13, still applies unchanged)

Preconditions: `NOTIFICATIONS_ENABLED=true`, a **real** dev bot token (not the garbage one I
used), at least one admin and one activator linked via `/start`, a distributor with a login.

14. **New activation → every linked activator, once each.** Submit an activation as a client.
    Every activator with a linked chat gets exactly one `ACTIVATION_CREATED` message; an
    unlinked activator gets nothing (no row at all).
15. **Correction carries the password in the clear.** As the assigned activator, flag a field
    wrong; as the client, correct it (including the password). The activator's Telegram message
    lists every current field, **password fully visible**. Compare byte-for-byte against what
    `ActiveRequestCard` shows in the UI — they must match.
16. **A password with Markdown metacharacters survives.** Repeat with a password containing
    `_ * [ ] ( ) ~` — confirm every character arrives intact (the `parse_mode`-omission check).
17. **OTP arrives unhidden.** Request additional info; client submits an OTP. The activator's
    message shows the OTP in the clear, using the `ACTIVATION_OTP_RECEIVED` template — verify
    it's visually distinct from the correction message (different headline/emoji).
18. **Exactly one message per real status change; the "own action" stats send nothing.** Walk
    one activation through take → flag → correct → request-OTP → answer-OTP → activate. Count
    Telegram messages received by that activator: **exactly 3** (the two client-updated
    messages already covered in 15/17, plus one `ACTIVATED` completion message with duration +
    commission). No message for take, flag, request-OTP, or the two bare `PROCESSING`
    transitions.
19. **Admin resolves a frozen activation → exactly one message, not two.** Freeze an activation,
    then have an admin activate it. The activator gets **one** message (not two — this is the
    `activation:resolved` non-subscription check, §5.4.1). Repeat with cancel-by-admin.
20. **FREEZE → admins only, never the freezing activator.** Every linked, enabled admin gets one
    `ACTIVATION_FROZEN` message; the activator who froze it gets nothing.
21. **Order request submitted → admins; order created → that distributor only.** Distributor
    submits a request. Admins get `ORDER_REQUEST_CREATED`. Approve it, link it into a new order
    via the wizard. The distributor gets **one** `ORDER_CREATED` message with the correct card
    count (this is the `Σ orderLots[].lot.nbOfCards` computation — cross-check the number
    against what the order wizard actually created). Moving the order to `IN_DELIVERY`/
    `DELIVERED` afterward must **not** send anything further.
22. **Revocation: submitted → admins, approved → distributor, rejected → nobody.** Submit a
    revocation request (needs an `ACTIVATION_FAILED` card). Admins get
    `REVOCATION_REQUEST_CREATED`. Approve one → the distributor gets `REVOCATION_APPROVED` with
    the admin's note. Reject a second one → the distributor gets **nothing**.
23. **An account-less distributor still receives.** Using the 6a-verified account-less
    distributor, run test 21 or 22 against them — confirm the message arrives despite no login.
24. **Secret hygiene, full sweep.** After all of the above: `SELECT body FROM "Notification"`
    contains passwords/OTPs (expected) but **no** password hash, **no** JWT, **no** bare
    `telegramLinkToken`. `grep` the API's log output for the same. This is the same check as 6a's
    test 13/23, re-run now that real matrix traffic exists.
25. **A send failure still can't fail anything.** Temporarily throw inside any one handler in
    `notification.subscribers.ts` (mirroring my own smoke test in §8), trigger that event from
    the real UI, confirm the triggering request still succeeds normally and only a log line
    appears. Remove the throw.

---

## 10. Open items — none carried forward

Every item 6a's report listed as "carried to Set 6b" is now done: the five Set 4 emits, the
`ClientUpdateKind` contract change, `duration.utils.ts`, `notification.recipients.ts`,
`notification.subscribers.ts`, all 9 remaining templates, and the `schema.prisma` comment
update. Set 6 (both halves) is complete per the plan.

**Stop. Do not start Set 7 without reviewing this report first.**
