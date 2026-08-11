# Set 5 — Card revocation requests (distributor-submitted, admin-managed)

**Depends on:** Set 1 (distributor login, `/distributors` namespace) · Set 4 (the module shape this one copies)
**Touches:** prisma · contract · api · web
**Schema change:** yes — 1 new model, 1 new enum, 1 new `LogActionType` value · **Migration:** `add_card_revocation_request`
**Date:** 2026-08-09 · **Branch:** `version-02-01`

**Scope discipline:** no Telegram — this set **publishes events only**. Set 6 subscribes.
**Structural discipline:** this module mirrors Set 4 file-for-file. Where the two differ, §5 says why.

---

## 0. Audit

### 0.1 Everything that revokes a card today — exactly one place

[`CardService.revoke(id, actorId)`](Apps/api/src/modules/card/card.service.ts#L183-L225), reached only via `CARD_ROUTES.REVOKE` (`POST /cards/:id/revoke`, **`adminOnly`**, [card.routes.ts:62-67](Apps/api/src/modules/card/card.routes.ts#L62-L67)). `actorId` comes from `req.user!.id` ([card.controller.ts:69](Apps/api/src/modules/card/card.controller.ts#L69)).

**It is the only writer of `Card.isRevoked` in the entire codebase** (grep across `Apps/api/src`, `Apps/contract/src`, `Apps/web/src`: every other hit is a read — `card.service.ts:33` filter, `statistics.service.ts:125` count, `card.mapper.ts:40`, and three web components).

| Step | What it does |
|---|---|
| Preconditions | `card.cardStat === ACTIVATION_FAILED` else `ConflictError` ([:191](Apps/api/src/modules/card/card.service.ts#L191)) · `!card.isDisabled` else `ConflictError` ([:195](Apps/api/src/modules/card/card.service.ts#L195)) · exists else `NotFoundError` |
| In `$transaction` | `card.update { isRevoked: true, isActive: true, cardStat: AT_DISTRIBUTOR }` ([:202](Apps/api/src/modules/card/card.service.ts#L202)) · `distributor.update { nbOfActiveCards: { increment: 1 } }` when `card.distributorId` is set |
| **After** the transaction | `prisma.log.create { actionType: REVOKE_CARD, actionDescription: "Revoked card: <key>", userId: actorId }` — [:216-222](Apps/api/src/modules/card/card.service.ts#L216-L222) |
| Returns | `CardDTO` |

Two things to note:
- **`deletedAt` is not checked.** A soft-deleted card could be revoked today. The request path will check it (§2).
- **The log write is outside the transaction** — one of the five legacy sites in R8. The execute prompt for this set requires *"Approve = card mutation + log write in one transaction"*, so this is the refactor of §3.2.

### 0.2 `CardStat.ACTIVATION_FAILED` — written in exactly one place

| Writer | Sets card to | Line |
|---|---|---|
| `ActivationService.cancelByAdmin()` | **`ACTIVATION_FAILED`** | [activation.service.ts:1311-1314](Apps/api/src/modules/activation/activation.service.ts#L1311-L1314) |
| `ActivationService.activate()` / `activateByAdmin()` | `ACTIVATED` | [:773](Apps/api/src/modules/activation/activation.service.ts#L773), [:1241](Apps/api/src/modules/activation/activation.service.ts#L1241) |
| `ActivationService.submit()` | `ACTIVATION_PROGRESS` | [:353](Apps/api/src/modules/activation/activation.service.ts#L353) |
| `OrderService.transition() → DELIVERED` | `AT_DISTRIBUTOR` | [order.service.ts:196](Apps/api/src/modules/order/order.service.ts#L196) |
| `lot` / `set` services | `IN_LOT` / `PRINTED` / `IN_SET` | — |

**`cancelByAdmin()` is the only path that leaves a card revocable.** It requires the activation to be `FREEZE` ([:1299](Apps/api/src/modules/activation/activation.service.ts#L1299)) and sets `activationStat = CANCELLED_BY_ADMIN`.

### 0.3 The eligibility list in the v2 doc does not survive contact with the enum

The Set 5 scope names four values: `CANCELLED_BY_ACTIVATOR`, `CANCELLED_BY_ADMIN`, `REMOVED_FROM_ACTIVATOR`, `ACTIVATION_FAILED` — *"plan confirms against the enum"*. Confirming:

**`ActivationStat` (10 values, [schema.prisma:65-76](Apps/api/prisma/schema.prisma#L65-L76) = [activation.enums.ts](Apps/contract/src/modules/activation/activation.enums.ts)):**
`PENDING · PROCESSING · WRONG_INFORMATION · ADDITIONAL_INFORMATION · FREEZE · ACTIVATED · ACTIVATED_BY_ADMIN · CANCELLED_BY_ACTIVATOR · REMOVED_FROM_ACTIVATOR · CANCELLED_BY_ADMIN`

> ❌ **`ACTIVATION_FAILED` is not an `ActivationStat`.** It is a **`CardStat`** value ([schema.prisma:42](Apps/api/prisma/schema.prisma#L42)). The scope list mixes the two enums.

And the other two are not what they look like:

| Value | What actually happens to the card |
|---|---|
| `CANCELLED_BY_ACTIVATOR` | `cancel()` marks the activation cancelled **and immediately creates a fresh `PENDING` activation for the same card** ([activation.service.ts:~810-880](Apps/api/src/modules/activation/activation.service.ts#L810)). It **never touches `cardStat`** — the card stays `ACTIVATION_PROGRESS`. |
| `REMOVED_FROM_ACTIVATOR` | `release()` does the same: terminal step + re-queued `PENDING` activation, **no `cardStat` write** ([:~890-960](Apps/api/src/modules/activation/activation.service.ts#L890)). |
| `CANCELLED_BY_ADMIN` | `cancelByAdmin()` — the **only** one that sets `cardStat = ACTIVATION_FAILED`. |

So a card whose last activation was `CANCELLED_BY_ACTIVATOR` is **back in the queue**, not failed. Allowing a revocation request on it would either revoke a card that is mid-activation, or — because `CardService.revoke()` guards on `cardStat` — throw a `ConflictError` at approval time, after the admin has already said yes. Both are bad.

**Resolution (confirmed with the user): eligibility mirrors the admin's own gate exactly — `cardStat === ACTIVATION_FAILED`, nothing more.** The admin's `CardService.revoke()` never inspects `ActivationStat` at all ([:191](Apps/api/src/modules/card/card.service.ts#L191) checks `cardStat` only); the distributor's eligibility check must not be stricter than the check the admin itself is held to. Since `ACTIVATION_FAILED` is written by exactly one path (`cancelByAdmin()`, §0.2), this single condition already excludes every card that is mid-activation or re-queued — the `CANCELLED_BY_ACTIVATOR` / `REMOVED_FROM_ACTIVATOR` values named in the v2 scope never co-occur with `ACTIVATION_FAILED` today, so no separate `ActivationStat` allowlist is needed. §2 drops the sixth condition originally proposed here.

### 0.4 Set 4's shape (what this set copies)

Contract module of 6 files + barrel; backend module of **5** files (mapper / interface / service / controller / routes — **no `index.ts`**, matching every existing module, see Set 4 §0.1 and Q1); `resolveDistributor(userId)` scoping in the `where` clause; log inside the transaction; event after commit; `/distributors` room keyed by `Distributor.id`; `DataTable` for every table; a `Record<Enum, BadgeTone>` badge map.

---

## 1. Prisma

### 1.1 Enum

```prisma
enum RevocationRequestStat {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}
```
No propagation dimension here — unlike `OrderRequestStat`, a revocation has no downstream lifecycle. Approval is instantaneous and terminal.

### 1.2 Model

```prisma
model CardRevocationRequest {
  id               String                @id @default(uuid())
  cardId           String
  activationId     String?               // the failed activation this request cites; resolved
                                         // server-side, never trusted from the client
  distributorId    String
  reason           String
  stat             RevocationRequestStat @default(PENDING)
  adminNote        String?
  reviewedByUserId String?
  createdAt        DateTime              @default(now())
  reviewedAt       DateTime?

  card         Card        @relation(fields: [cardId], references: [id])
  activation   Activation? @relation(fields: [activationId], references: [id])
  distributor  Distributor @relation(fields: [distributorId], references: [id])
  reviewedBy   User?       @relation(fields: [reviewedByUserId], references: [id])

  // Only ONE PENDING request may exist per card. Prisma cannot express a partial unique
  // index, so this is enforced in the service inside the claiming transaction (§4).
  @@index([cardId, stat])
  @@index([distributorId, stat])
  @@index([stat])
  @@index([createdAt])
}
```

Virtual back-references (no columns, no SQL on those tables):
```prisma
model Card        { … revocationRequests CardRevocationRequest[] }
model Activation  { … revocationRequests CardRevocationRequest[] }
model Distributor { … revocationRequests CardRevocationRequest[] }
model User        { … reviewedRevocationRequests CardRevocationRequest[] }
```

### 1.3 Index justification

| Index | Serves |
|---|---|
| `@@index([cardId, stat])` | The duplicate check (`where { cardId, stat: PENDING }`) — run on **every** submit — and the card-history read. Leading `cardId` also serves "all requests for this card". |
| `@@index([distributorId, stat])` | The portal history list (`distributorId = me`, optional status chip). Same rationale as Set 4. |
| `@@index([stat])` | Admin queue default `stat = PENDING`, across all distributors — the `distributorId`-leading composite cannot serve it. |
| `@@index([createdAt])` | `orderBy createdAt desc` + date-range filters on both lists. |
| ~~`activationId`~~ / ~~`reviewedByUserId`~~ | Omitted — nothing filters on them; `activationId` is read only through an already-loaded row. |

### 1.4 `LogActionType`

```prisma
enum LogActionType {
  … existing values + Set 4's CHANGE_ORDER_REQUEST_STAT …
  CHANGE_REVOCATION_REQUEST_STAT
}
```

`REVOKE_CARD` is **reused unchanged** for the card mutation itself (v2 scope). The new value records the *decision* (submit/approve/reject/cancel). An approval therefore writes **two** log rows in one transaction — `CHANGE_REVOCATION_REQUEST_STAT` (who decided) and `REVOKE_CARD` (what changed on the card) — which is correct: they answer different audit questions and the `REVOKE_CARD` row must look identical whether the revocation came from the admin card page or from an approved request. See **Q1**.

### 1.5 Migration

**Name:** `add_card_revocation_request` → `npx prisma migrate dev --name add_card_revocation_request`

Contents: `CREATE TYPE "RevocationRequestStat"`, `ALTER TYPE "LogActionType" ADD VALUE 'CHANGE_REVOCATION_REQUEST_STAT'`, `CREATE TABLE "CardRevocationRequest"`, 4 indexes, 4 FK constraints. **Seed impact: none** — no existing model gains a required field.

---

## 2. Eligibility — enforced server-side, as a conjunction

A card is revocable **iff all five hold**. Every one is checked in the service, inside the submit transaction. Hiding the button is not enforcement.

| # | Condition | Rejection |
|---|---|---|
| 1 | The card exists and `card.deletedAt === null` | `NotFoundError` |
| 2 | **`card.distributorId === resolveDistributor(req.user.id).id`** — ownership | `NotFoundError` (404, not 403: another distributor's card must not be confirmed to exist) |
| 3 | **`card.cardStat === CardStat.ACTIVATION_FAILED`** | `ConflictError('This card is not in a failed-activation state')` |
| 4 | `card.isRevoked === false` | `ConflictError('This card has already been revoked')` |
| 5 | `card.isDisabled === false` | `ConflictError('A disabled card cannot be revoked')` — matches [card.service.ts:195](Apps/api/src/modules/card/card.service.ts#L195) |

**Confirmed with the user: this is deliberately the same gate as the admin's, no more.** Conditions 3–5 are a line-for-line mirror of what `CardService.revoke()` itself checks ([:191,195](Apps/api/src/modules/card/card.service.ts#L191)) — a distributor may request a revoke on precisely the set of cards an admin could revoke directly, nothing broader and nothing narrower. There is no `ActivationStat` gate: `ACTIVATION_FAILED` is written by exactly one path (`cancelByAdmin()`, §0.2), so condition 3 alone already excludes every mid-activation or re-queued card.

`activationId` on the request is still populated for display (`prisma.activation.findFirst({ where: { cardId }, orderBy: { requestedAt: 'desc' } })`, resolved server-side, never trusted from the client) — it is context for the admin reviewing the request, not an eligibility gate.

**Condition 3 is also exactly the precondition `CardService.revoke()` re-checks at approval time** — so approve can never fail on a request that submit accepted, unless the card changed state in between (which §3.3 handles).

**The eligible-cards endpoint uses the same predicate** (§5.2, `GET_ELIGIBLE`), so the UI list and the server check cannot drift.

---

## 3. What APPROVE does, and how it reuses the revoke path

### 3.1 Field by field on `Card`

| Field | Before | After | Written by |
|---|---|---|---|
| `isRevoked` | `false` | **`true`** | shared revoke helper |
| `isActive` | `false` | **`true`** | shared revoke helper |
| `cardStat` | `ACTIVATION_FAILED` | **`AT_DISTRIBUTOR`** | shared revoke helper |
| `isDisabled` | `false` | `false` — **untouched** | — |
| `distributorId` | the owner | unchanged | — |
| `deletedAt` | `null` | unchanged | — |
| `updatedAt` | — | bumped by `@updatedAt` | Prisma |
| `Distributor.nbOfActiveCards` | *n* | ***n* + 1** | shared revoke helper |

Semantics: the card goes back into the distributor's sellable stock. This is exactly what the existing admin revoke does — **not one field differs**, which is the point.

On the **request** row: `stat = APPROVED`, `reviewedAt = now`, `reviewedByUserId = actorId`, `adminNote = cmd.adminNote ?? null`.

### 3.2 The refactor — one place mutates revocation state

**Yes, a small refactor is needed, and it is required by the "one transaction" rule.** `CardService.revoke()` today opens its own `$transaction` and writes its log *after* it — neither of which the request approval can join.

Extract the body into a module-level exported function in [card.service.ts](Apps/api/src/modules/card/card.service.ts) that takes the caller's transaction client (the same idiom Set 4 uses for propagation, and the same idiom as `composeSubscriptionLabel` exported from `set.mapper.ts`):

```ts
// card.service.ts — THE ONLY place that mutates Card revocation state.
export async function revokeCardWithin(
  tx: Prisma.TransactionClient,
  cardId: string,
  actorId: string,
): Promise<Card> {
  const card = await tx.card.findUnique({ where: { id: cardId } });
  if (!card || card.deletedAt) throw new NotFoundError('Card not found');
  if (card.cardStat !== CardStat.ACTIVATION_FAILED) throw new ConflictError(`Cannot revoke a card in state ${card.cardStat}`);
  if (card.isDisabled)  throw new ConflictError('Cannot revoke a disabled card');
  if (card.isRevoked)   throw new ConflictError('Card is already revoked');

  const updated = await tx.card.update({
    where: { id: cardId },
    data: { isRevoked: true, isActive: true, cardStat: CardStat.AT_DISTRIBUTOR },
  });
  if (card.distributorId) {
    await tx.distributor.update({ where: { id: card.distributorId }, data: { nbOfActiveCards: { increment: 1 } } });
  }
  await tx.log.create({
    data: { actionType: LogActionType.REVOKE_CARD, actionDescription: `Revoked card: ${card.key}`, userId: actorId },
  });
  return updated;
}
```

`CardService.revoke()` becomes a thin wrapper — `this.prisma.$transaction(tx => revokeCardWithin(tx, id, actorId))`, then re-read with joins and map to `CardDTO`. Its external behaviour is unchanged except for three deliberate improvements:

| Change | Why it is safe / wanted |
|---|---|
| The `REVOKE_CARD` log moves **inside** the transaction | Closes one of R8's five legacy sites, and is mandatory for the approve path. A failed revoke no longer leaves a log claiming it happened. |
| `deletedAt` is now checked | Closes the §0.1 gap — a soft-deleted card was revocable. |
| `isRevoked` double-revoke guard added | Was previously impossible to hit via the state guard alone; explicit is better. |

**No signature change** to `ICardService.revoke(id, actorId)` and no route change. Declare this refactor prominently in the execution report.

### 3.3 The approve transaction

```
$transaction:
  1. load the request, assert stat === PENDING                     → ConflictError otherwise
  2. revokeCardWithin(tx, request.cardId, actorId)                 → re-validates §3.1 preconditions,
                                                                      writes Card + counter + REVOKE_CARD log
  3. update the request → APPROVED, reviewedAt, reviewedByUserId, adminNote
  4. tx.log.create(CHANGE_REVOCATION_REQUEST_STAT, …)
commit
then: eventBus.emit('revocation-request:status-changed', …)
```

If the card changed state between submit and approval (someone disabled it, an admin revoked it directly), step 2 throws and **the whole approval rolls back** — the request stays `PENDING` and the admin gets the card-level 409 message. That is correct: the admin should see *why* it could not be revoked, not a request that says APPROVED over an unrevoked card.

**REJECT** does not touch the card at all: `stat = REJECTED` + `reviewedAt`/`reviewedByUserId`/`adminNote` + one `CHANGE_REVOCATION_REQUEST_STAT` log. One transaction, no `Card` write, no `REVOKE_CARD` row.

---

## 4. Duplicate-request policy

**Rule: at most one `PENDING` request per card.**

Submit runs, inside its own transaction, *after* the §2 eligibility checks:

```ts
const pending = await tx.cardRevocationRequest.findFirst({
  where: { cardId: cmd.cardId, stat: RevocationRequestStat.PENDING },
  select: { id: true },
});
if (pending) throw new ConflictError('A revocation request for this card is already pending review.');
```

| Existing request state | New submit |
|---|---|
| `PENDING` | ❌ blocked — 409 with the message above (manual test 5) |
| `REJECTED` | ✅ allowed — the distributor may re-argue the case |
| `CANCELLED` | ✅ allowed |
| `APPROVED` | ❌ blocked, but by **eligibility not duplication**: the card is now `isRevoked` + `AT_DISTRIBUTOR`, so conditions 3 and 4 fail first with *"This card has already been revoked"* — the more useful message |

**Why not a database constraint.** Prisma cannot express a partial unique index (`UNIQUE(cardId) WHERE stat = 'PENDING'`); a plain `@@unique([cardId])` would allow only one request per card *ever*, which contradicts the REJECTED-then-resubmit row above. The residual race — two identical submits landing in the same millisecond — produces one duplicate `PENDING` row, and the second approval then fails cleanly at §3.3 step 2 (`isRevoked` guard). No card is double-revoked and no counter is double-incremented, which is the property that actually matters. A hand-written partial index can be added to the migration SQL if you want the hard guarantee — see **Q2** for the drift caveat.

---

## 5. File lists — mirroring Set 4

### 5.1 Contract — `Apps/contract/src/modules/card-revocation-request/`

| File | Contents |
|---|---|
| `card-revocation-request.enums.ts` | `RevocationRequestStat` (4 values), declared literally — no cross-module import (R13) |
| `card-revocation-request.routes.ts` | `CARD_REVOCATION_REQUEST_ROUTES` (§5.2) |
| `card-revocation-request.command.ts` | `CreateCardRevocationRequestSchema` `{ cardId: z.uuid(), reason: z.string().min(3).max(500) }`; `ReviewCardRevocationRequestSchema` `{ adminNote: z.string().max(500).optional() }` |
| `card-revocation-request.query.ts` | `GetCardRevocationRequestsQuerySchema` (admin: `page`, `limit`, `search`, `distributorId?`, `state?`, `dateFrom?`, `dateTo?`) · `GetMyCardRevocationRequestsQuerySchema` (distributor: `page`, `limit`, `state?`) · `CardRevocationRequestIdParamsSchema` |
| `card-revocation-request.dtos.ts` | `CardRevocationRequestDTO` (`id`, `cardId`, `cardKey`, `activationId` nullable, `distributorId`, `distributorName`, `subscriptionLabel`, `reason`, `stat`, `adminNote` nullable, `reviewedByName` nullable, `createdAt`, `reviewedAt` nullable) · `RevocableCardDTO` (`cardId`, `cardKey`, `subscriptionLabel`, `activationId`, `failedAt`, `clientFullName`) · `PaginatedCardRevocationRequestsSchema` |
| `card-revocation-request.events.ts` | §6 |
| `index.ts` | barrel |

Modified elsewhere in the contract: `log.enums.ts` (`+ CHANGE_REVOCATION_REQUEST_STAT`), `src/index.ts` (`+ export * from './modules/card-revocation-request'`). **`card.*` and `activation.*` are untouched.**

### 5.2 Routes and guards

```ts
export const CARD_REVOCATION_REQUEST_ROUTES = {
  BASE: '/card-revocation-requests',
  GET_ALL:      '/',           // admin
  GET_MINE:     '/mine',       // distributor        (static — before /:id)
  GET_ELIGIBLE: '/eligible',   // distributor        (static — before /:id)
  CREATE:       '/',           // distributor
  GET_BY_ID:    '/:id',        // admin
  APPROVE:      '/:id/approve',
  REJECT:       '/:id/reject',
  CANCEL:       '/:id/cancel', // distributor (owner)
} as const;
```

| Route | Guard | Scoping |
|---|---|---|
| `GET_ALL`, `GET_BY_ID`, `APPROVE`, `REJECT` | `adminOnly` | none |
| `GET_MINE` | `distributorOnly` | `where.distributorId = me.id` |
| `GET_ELIGIBLE` | `distributorOnly` | `where.distributorId = me.id` **+ the §2 predicate** |
| `CREATE` | `distributorOnly` | `distributorId` from session; card ownership per §2 condition 2 |
| `CANCEL` | `distributorOnly` | `findFirst({ where: { id, distributorId: me.id } })` → 404 otherwise; `PENDING` only |

**`GET_ELIGIBLE` exists because there is no distributor-facing card or activation endpoint.** Every `CARD_ROUTES.*` is `adminOnly`, and `ACTIVATION_ROUTES.GET_PENDING`/`GET_RECENT` are globally scoped and must **never** admit `DISTRIBUTOR` (R18). This one scoped read is the minimum surface needed, and it is the same list the submit form renders.

```ts
// GET_ELIGIBLE
where: {
  distributorId: me.id,
  deletedAt: null,
  cardStat: CardStat.ACTIVATION_FAILED,
  isRevoked: false,
  isDisabled: false,
  revocationRequests: { none: { stat: RevocationRequestStat.PENDING } },  // already-requested cards hidden
}
include: { subscriptionPlan: true, activations: { orderBy: { requestedAt: 'desc' }, take: 1 } }
```

### 5.3 Backend — `Apps/api/src/modules/card-revocation-request/`

`card-revocation-request.{mapper,interface,service,controller,routes}.ts` — 5 files, plus one import + one `moduleRouter.use(...)` line in [modules/index.ts](Apps/api/src/modules/index.ts).

Modified elsewhere: [card.service.ts](Apps/api/src/modules/card/card.service.ts) (§3.2 refactor only), [event-bus.ts](Apps/api/src/common/events/event-bus.ts) (`AppEvents &= CardRevocationRequestEvents`), [realtime-gateway.ts](Apps/api/src/common/realtime/realtime-gateway.ts) (2 registrations), [socket.types.ts](Apps/api/src/common/realtime/socket.types.ts) (2 events).

| Method | Transaction | Log (in tx) | Event (after commit) |
|---|---|---|---|
| `getAll` / `getMine` / `getById` / `getEligible` | — | — | — |
| `create(cmd, userId)` | ✅ eligibility + duplicate check + insert | — (consistent with Set 4 §5.2) | `revocation-request:created` |
| `approve(id, cmd, actorId)` | ✅ §3.3 | `REVOKE_CARD` **and** `CHANGE_REVOCATION_REQUEST_STAT` | `revocation-request:status-changed` |
| `reject(id, cmd, actorId)` | ✅ update + log | `CHANGE_REVOCATION_REQUEST_STAT` | `revocation-request:status-changed` |
| `cancel(id, userId)` | ✅ update + log | `CHANGE_REVOCATION_REQUEST_STAT` (actor = the distributor's `User.id`) | `revocation-request:status-changed` |

**State machine:** `PENDING → APPROVED` (admin) · `PENDING → REJECTED` (admin) · `PENDING → CANCELLED` (owner). All three targets terminal. Anything else → `ConflictError`, enforced in the service.

### 5.4 Gateway rooms

| Event | Namespace | Room |
|---|---|---|
| `revocation-request:created` | `/admin` | `rooms.ADMIN_BELL` |
| `revocation-request:status-changed` | `/distributors` | `rooms.distributor(p.distributorId)` |
| `revocation-request:status-changed` | `/admin` | `rooms.ADMIN_BELL` |

Identical to Set 4 §7. Both existing rooms; no `server.ts` change.

### 5.5 Frontend

**New:**

| Path | Purpose |
|---|---|
| `src/services/card-revocation-requests.service.ts` | 8 functions, mirroring `card-order-requests.service.ts` |
| `src/hooks/useCardRevocationRequests.ts` | list / mine / eligible / detail queries + create / approve / reject / cancel mutations. Approve additionally invalidates `qk.cards.all()` and `qk.distributors.all()` (a revoke moves `nbOfActiveCards`). |
| `src/pages/distributor/RevocationsPage.tsx` | portal page — `PageHeader` + "Request revocation" + **`DataTable`** history + `SimplePagination` |
| `src/pages/distributor/components/SubmitRevocationRequestModal.tsx` | eligible-card picker (from `GET_ELIGIBLE`, showing key + plan + client + failure date) + `reason` textarea |
| `src/pages/distributor/components/submit-revocation-request.schema.ts` | co-located Zod + `AssertAssignable` guard against the contract command |
| `src/pages/distributor/components/MyRevocationRequestsTable.tsx` | **`DataTable`** + `TableSkeleton` / `EmptyState` / `NotFoundState`; cancel confirm via `AlertDialog` |
| `src/pages/admin/distributors/RevocationRequestsPage.tsx` | admin management page |
| `src/pages/admin/distributors/components/RevocationRequestsFilters.tsx` | search · distributor · state · date range · clear |
| `src/pages/admin/distributors/components/RevocationRequestsTable.tsx` | **`DataTable`**; columns: distributor · card key · plan · reason · status · reviewed by · created; actions Approve / Reject |
| `src/pages/admin/distributors/components/ReviewRevocationRequestModal.tsx` + `review-revocation-request.schema.ts` | one modal, `mode: "approve" \| "reject"`, optional `adminNote`; the approve copy states plainly that the card **will be revoked** |

**Modified:** `query-keys.ts` (new `cardRevocationRequests` family) · `realtime.ts` (admin + distributor listeners) · `StatusBadge.tsx` (`RevocationRequestStatusBadge` + `Record<RevocationRequestStat, BadgeTone>`; **and `LOG_ACTION_TONE` += `CHANGE_REVOCATION_REQUEST_STAT`** — the `Record<LogActionType, …>` is exhaustive and `tsc` fails without it) · `nav-links.ts` (distributor + admin entries) · `App.tsx` (2 lazy imports + 2 routes; `/admin/distributors/revocation-requests` declared **before** `/admin/distributors/:id`) · `translations.json`.

**Translation keys** (`en`, `fr`, `ar: ""`): `enums.revocationRequestStat.*` (4) · `enums.logActionType.CHANGE_REVOCATION_REQUEST_STAT` (1) · `distributor.nav.revocations` + `distributor.revocations.*` (~22) · `admin.shell.nav.revocationRequests` + `admin.revocationRequests.*` (~26) · toast (1). ≈ **55 keys**.

---

## 6. Note for Set 6 — event names and payloads

```ts
// Apps/contract/src/modules/card-revocation-request/card-revocation-request.events.ts
export const RevocationRequestCreatedPayloadSchema = z.object({
  requestId: z.uuid(),
  distributorId: z.uuid(),      // Distributor.id — the room key, not User.id
  distributorName: z.string(),  // Distributor.storeName
  cardId: z.uuid(),
  cardKey: z.string(),
  subscriptionLabel: z.string(),
  reason: z.string(),
  timestamp: z.iso.datetime(),
});

export const RevocationRequestStatusChangedPayloadSchema = z.object({
  requestId: z.uuid(),
  distributorId: z.uuid(),
  cardId: z.uuid(),
  cardKey: z.string(),
  stat: z.enum(RevocationRequestStat),
  previousStat: z.enum(RevocationRequestStat),
  adminNote: z.string().nullable(),
  timestamp: z.iso.datetime(),
});

export type CardRevocationRequestEvents = {
  'revocation-request:created':        RevocationRequestCreatedPayload;
  'revocation-request:status-changed': RevocationRequestStatusChangedPayload;
};
```

- `revocation-request:created` → notify **admins**. Self-contained: store name, card key, plan, reason — **no DB read in the subscriber.**
- `revocation-request:status-changed` → notify **the distributor** at `distributorId`. `adminNote` is on the payload precisely so the "your request was rejected because…" template needs no query. `previousStat` mirrors Set 4's payload so both subscribers can share one template-selection shape.
- Emitted after commit. R5 (no error isolation on the bus) applies here exactly as in Set 4 — Set 6 owns the `safe()`-wrapping and deferral.

---

## 7. Open questions

| # | Question | My recommendation |
|---|---|---|
| **Q1** | Add `CHANGE_REVOCATION_REQUEST_STAT`, or log approvals only through the existing `REVOKE_CARD`? | **DECIDED: add it.** `REVOKE_CARD` cannot express a rejection or a cancellation, and an approval genuinely is two facts (a decision and a card mutation). Symmetric with Set 4. |
| **Q2** | Add a hand-written partial unique index (`UNIQUE(cardId) WHERE stat='PENDING'`) to the migration SQL? | **DECIDED: no.** It cannot be declared in `schema.prisma`, so future `prisma migrate dev` runs may report drift on a schema that is throwaway anyway. The service check plus the `isRevoked` guard already prevent every harmful outcome. |
| **Q3** | The v2 scope lists `ACTIVATION_FAILED` as an `ActivationStat` — it is a `CardStat` (§0.3). Confirm the §2 conjunction is the intended reading. | **DECIDED (user): eligibility is `cardStat === ACTIVATION_FAILED` only** — the same and only gate the admin's own revoke uses. §2 was simplified from a 6-condition conjunction to 5; the proposed `ActivationStat` allowlist (condition 6) is dropped entirely. |
| **Q4** | `CANCELLED_BY_ACTIVATOR` / `REMOVED_FROM_ACTIVATOR` re-queue a new `PENDING` activation, so those cards are *never* revocable today. Is that the intended product behaviour, or is the re-queue itself the bug? | **DECIDED (user):** confirmed intended — "the distributor can only request a revoke for cards with activation failed (like the admin can revoke only a card with this stat)". Directly resolves Q3 too: no separate activation-history gate, `cardStat` is the whole story. |
| **Q5** | Should `reason` have a minimum length (proposed 10 chars)? | **DECIDED (user): yes, minimum 3 characters** (not 10). Applied in §5.1's command schema. |
| **Q6** | Should the approval also **disable** the card, or does the existing `isRevoked` + `AT_DISTRIBUTOR` + `isActive: true` outcome stand? | **DECIDED: stand.** Not one field may differ from the existing admin revoke — that is the whole "one place mutates revocation state" requirement. |
| **Q7** | Backend module = 5 files (no `index.ts`), same as Set 4 Q1? | **DECIDED: yes** — consistency with every existing module beats CLAUDE.md's unimplemented 6th file. |

---

## 8. Manual test checklist

Setup: a distributor with a login who owns at least one card; drive that card to `ACTIVATION_FAILED` through the real path — client submits → activator takes → activator freezes → **admin cancels the frozen activation** (`CANCEL_BY_ADMIN`). That is the only way to produce a revocable card (§0.2).

1. **The action appears only where it should.** The distributor's revocation page lists exactly that one card. A card that is `AT_DISTRIBUTOR`, `ACTIVATED`, `ACTIVATION_PROGRESS`, disabled, or already revoked does **not** appear. Another distributor's failed card does **not** appear.
2. **Submit → admin sees it live; the card is NOT yet revoked.** Distributor submits with a reason. The admin's queue gains the row without a reload. Check the card in `/admin/activations/cards`: `isRevoked` still false, `cardStat` still `ACTIVATION_FAILED`.
3. **Approve → card revoked, correctly.** Admin approves. Card shows `isRevoked = true`, `cardStat = AT_DISTRIBUTOR`, `isActive = true`, `isDisabled` unchanged. The owning distributor's `nbOfActiveCards` is **+1**. The distributor's page flips to `APPROVED` live.
4. **`REVOKE_CARD` log present, and identical to a direct revoke.** `/admin/logs` filtered to `REVOKE_CARD` shows `Revoked card: <key>` with the **approving admin** as actor — byte-identical in shape to a revoke performed from the admin card page. A `CHANGE_REVOCATION_REQUEST_STAT` row sits alongside it.
5. **Reject → card untouched, reason visible.** On a second failed card: submit, then reject with an `adminNote`. Card unchanged in every field; the distributor sees `REJECTED` **and the note**.
6. **Duplicate while `PENDING`.** Submit for a card, then submit again for the same card → 409 *"A revocation request for this card is already pending review."* Confirm via UI **and** `curl`.
7. **Resubmit after rejection is allowed.** Using the rejected card from step 5, submit again → accepted, new `PENDING` row.
8. **Still-active activation → rejected server-side.** Take a card in `ACTIVATION_PROGRESS` and `curl -X POST /api/v1/card-revocation-requests -d '{"cardId":"…","reason":"…"}'` with the distributor's token → 409, no row created.
9. **Another distributor's card → 404.** Same `curl` with distributor B's token against A's failed card → **404**, no row created.
10. **Cross-distributor isolation on reads.** B's `/mine` never contains A's requests; `curl` to the admin `GET_ALL` with B's token → 403.
11. **Cancel.** Distributor cancels a `PENDING` request → `CANCELLED`, disappears from the admin queue, log row with the **distributor's** user as actor. Cancelling an `APPROVED` one → 409.
12. **The direct admin revoke still works unchanged.** From `/admin/activations/cards`, revoke a failed card the old way. Same result as step 3 — this proves the §3.2 refactor did not alter existing behaviour.
13. **Approve a request whose card changed underneath.** Submit a request, then revoke that card directly as admin, then approve the request → 409, the request stays `PENDING`, and the card is **not** double-counted (`nbOfActiveCards` incremented exactly once).
14. **Reconnect.** Kill and restart the API; both the admin queue and the distributor history re-fetch on reconnect.

---

## 9. Definition of done

- [ ] `npx tsc --noEmit` clean in `Apps/contract`, `Apps/api`, `Apps/web`
- [ ] eslint clean in all three
- [ ] `npx madge --circular src` clean in `Apps/contract`
- [ ] Migration `…_add_card_revocation_request` created and applied; `prisma migrate reset` + all four seed scripts still run
- [ ] **Exactly one function mutates `Card.isRevoked`** — verify with `grep -rn "isRevoked" Apps/api/src`: one write site (`revokeCardWithin`), everything else a read
- [ ] The §3.2 refactor is called out explicitly in the report, including the three behaviour changes it carries (log inside the transaction, `deletedAt` check, double-revoke guard)
- [ ] No test file created, modified, deleted or run — verified with `git status`
- [ ] No magic strings; every new string is a translation key with `en`, `fr`, `ar: ""`
- [ ] Report written to `Docs/Stage-04-fix/results/set-5/execution-report.md`
- [ ] **Stop. Do not start Set 6.**
