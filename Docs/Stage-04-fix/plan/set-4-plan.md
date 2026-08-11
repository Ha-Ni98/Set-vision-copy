# Set 4 — Card order requests (distributor-submitted, admin-managed)

**Depends on:** Set 1 (`UserRole.DISTRIBUTOR`, `Distributor.userId`, `/distributors` socket namespace, distributor portal shell)
**Touches:** prisma · contract · api · web
**Schema change:** yes — 1 new model, 1 new enum, 1 new `LogActionType` value · **Migration:** `add_card_order_request`
**Date:** 2026-08-09 · **Branch:** `version-02-01`

**Scope discipline:** revocation requests are Set 5. Telegram is Set 6 — this set **publishes events only**, it does not send a notification anywhere. The distributor portal *shell* already exists (Set 1); this set adds one page to it, it does not build the portal (Set 7).

---

## 0. Audit — what already exists

### 0.1 The Order module, end to end

| Layer | Files | Notes |
|---|---|---|
| Contract | [order.enums.ts](Apps/contract/src/modules/order/order.enums.ts) · [order.routes.ts](Apps/contract/src/modules/order/order.routes.ts) · [order.command.ts](Apps/contract/src/modules/order/order.command.ts) · [order.query.ts](Apps/contract/src/modules/order/order.query.ts) · [order.dtos.ts](Apps/contract/src/modules/order/order.dtos.ts) · [index.ts](Apps/contract/src/modules/order/index.ts) | **No `order.events.ts`** — the order domain publishes nothing today. `ActivationEvents` is the only event map on the bus ([event-bus.ts:5](Apps/api/src/common/events/event-bus.ts#L5)). |
| Backend | [order.mapper.ts](Apps/api/src/modules/order/order.mapper.ts) · [order.interface.ts](Apps/api/src/modules/order/order.interface.ts) · [order.service.ts](Apps/api/src/modules/order/order.service.ts) · [order.controller.ts](Apps/api/src/modules/order/order.controller.ts) · [order.routes.ts](Apps/api/src/modules/order/order.routes.ts) · `order.util.ts` | **5 files, not 6.** |
| Frontend | [orders.service.ts](Apps/web/src/services/orders.service.ts) · [useOrders.ts](Apps/web/src/hooks/useOrders.ts) · [OrdersPage.tsx](Apps/web/src/pages/admin/distributors/OrdersPage.tsx) + `components/` (Table, Filters, DetailDrawer, ActionsMenu, CreateOrderModal + 5 step components) | Page → Table/Filters components → hooks → service. `DataTable` + `SimplePagination` + `StatsRow` + `PageHeader` reused. |

> **Discrepancy to record, not to fix.** CLAUDE.md's non-negotiables say "Backend module = the 6-file pattern (mapper / interface / service / controller / routes / **index**)". **No backend module in this repo has an `index.ts`** — every router is imported by path in [modules/index.ts](Apps/api/src/modules/index.ts). The execute prompt says *"Mirror the existing Order module file for file"*, so this set builds **5 files** and adds one import line to `modules/index.ts`. Flagged as **Q1**.

### 0.2 Every code path that changes `OrderStat` — exhaustive

Grep basis: every `orderStat` occurrence in `Apps/api/src`, `Apps/api/scripts`, `Apps/api/prisma` excluding tests. Read-only filters (`distributor.service` ×5, `statistics.service` ×4, `order.service:41`) are excluded — they never write.

| # | Path | Line | Writes | Transaction today? |
|---|---|---|---|---|
| **1** | `OrderService.create()` | [:126-153](Apps/api/src/modules/order/order.service.ts#L126-L153) | `orderStat: PENDING_DELIVERY` on insert; lots → `IN_DELIVERY` | ✅ yes |
| **2** | `OrderService.transition() → IN_DELIVERY` | [:176-180](Apps/api/src/modules/order/order.service.ts#L176-L180) | `orderStat: IN_DELIVERY` | ❌ **no — bare `order.update`** |
| **3** | `OrderService.transition() → DELIVERED` | [:181-202](Apps/api/src/modules/order/order.service.ts#L181-L202) | `orderStat: DELIVERED`, `completedAt`, `cardsDeliveredCount`; lots → `DELIVERED`; cards → `AT_DISTRIBUTOR`; distributor counter | ✅ yes |
| **4** | `OrderService.transition() → RETURNED` | [:203-214](Apps/api/src/modules/order/order.service.ts#L203-L213) | `orderStat: RETURNED`, `completedAt`; lots → `RETURNED` | ✅ yes |
| **5** | `OrderService.delete()` | [:219-251](Apps/api/src/modules/order/order.service.ts#L219-L251) | **hard delete**, allowed only from `PENDING_DELIVERY`; reverts lots | ✅ yes |
| 6 | `scripts/load-mock-data.ts` | [:311](Apps/api/scripts/load-mock-data.ts#L311) | seeds `orderStat: DELIVERED` directly | n/a — **seed, not runtime** |

**There is no other writer of `Order.orderStat` anywhere.** All five runtime paths are inside `order.service.ts` and are reached only through `ORDER_ROUTES.CREATE` / `TRANSITION` / `DELETE`, all `adminOnly`.

Path 6 needs **no change**: `Order` gains no column (§1.3), and seeded orders simply have no linked request.

### 0.3 The add-order form and its command

[CreateOrderModal.tsx](Apps/web/src/pages/admin/distributors/components/CreateOrderModal.tsx) — a 5-step wizard over **one** RHF form; steps validate slices via `trigger(STEP_FIELDS[step])`. Step 0 = `StepSelectDistributor` (search + select, prefills receiver fields from the distributor). Schema: [create-order.schema.ts](Apps/web/src/pages/admin/distributors/components/create-order.schema.ts), with a compile-time guard asserting `CreateOrderFormValues extends CreateOrderCommand`. Contract command: [`CreateOrderSchema`](Apps/contract/src/modules/order/order.command.ts#L4-L16) — 10 fields, no request link.

### 0.4 The admin notification bell

| Aspect | Reality |
|---|---|
| Namespace | `/admin`, auth `[UserRole.ADMIN]` ([server.ts:16](Apps/api/src/server.ts#L16)) |
| Room | `rooms.ADMIN_BELL = 'admin'`, auto-joined on connect ([realtime-gateway.ts:38-40](Apps/api/src/common/realtime/realtime-gateway.ts#L38-L40)) |
| Events into it | exactly one — `activation:frozen` |
| Frontend listener | [`attachAdminNamespaceListeners`](Apps/web/src/lib/realtime.ts#L152-L156) — one handler, invalidation only |
| The bell component | [NotificationBell.tsx](Apps/web/src/components/layout/NotificationBell.tsx) — **chrome only.** No feed, no badge, no payload store. Its own comment: *"Feed/badge deferred (plan.md §F-6) — the admin socket is invalidation-only today."* |

**Consequence for the manual test *"admin bell fires live"*:** there is nothing to put a number on. This set delivers **query invalidation + a `sonner` toast** on `order-request:created` (the toast pattern already exists in `realtime.ts`, via `translate()`/`getLanguage()` for non-component code). A real notification feed/badge stays deferred — see **Q2**.

### 0.5 The pagination / filter query-schema pattern

Canonical form ([order.query.ts](Apps/contract/src/modules/order/order.query.ts), mirrored by card / distributor / activation):

```ts
export const GetXQuerySchema = z.object({
  page:  z.coerce.number().int().min(1).max(100).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
  search: z.string().optional(),
  <fk>Id: z.uuid().optional(),
  state: z.enum(SomeStat).optional(),
  dateFrom: z.iso.datetime().optional(),
  dateTo:   z.iso.datetime().optional(),
});
export const XIdParamsSchema = z.object({ id: z.uuid() });
```

Service side: `const page = query.page ?? 1`, a spread-conditional `where`, `Promise.all([findMany, count])`, `...toSkipTake({page, limit})`, `buildPaginationMeta(page, limit, total)` from [pagination.ts](Apps/api/src/common/http/pagination.ts). The DTO list wrapper is `paginated(ItemSchema)`.

### 0.6 Other facts this set depends on

- `rooms.distributor(distributorId)` and the `/distributors` namespace **already exist** ([rooms.ts:13](Apps/api/src/common/realtime/rooms.ts#L13), [realtime-gateway.ts:42-54](Apps/api/src/common/realtime/realtime-gateway.ts#L42-L54)); the room is keyed by `Distributor.id`, joined on connect for `userId` + `deletedAt: null`. `attachDistributorNamespaceListeners` in [realtime.ts:160-162](Apps/web/src/lib/realtime.ts#L160-L162) is deliberately empty — **this set is what fills it.**
- Distributor scoping precedent: [`resolveActivator(userId)`](Apps/api/src/modules/activation/activation.service.ts#L101-L105) → `findUnique({ where: { userId } })`, `ForbiddenError` if absent.
- Cross-module function import is precedented: `order.mapper.ts` imports `composeSubscriptionLabel` from `@modules/set/set.mapper`.
- `LOG_ACTION_TONE` in [StatusBadge.tsx:116-132](Apps/web/src/components/shared/StatusBadge.tsx#L116-L132) is `Record<LogActionType, BadgeTone>` — **exhaustive**. A new `LogActionType` value fails `tsc` until it is added there. Same for `enums.logActionType.*` in `translations.json`.
- `SUBSCRIPTION_PLAN_ROUTES.GET_ALL` is `adminOnly` ([subscription-plan.routes.ts:42](Apps/api/src/modules/subscription-plan/subscription-plan.routes.ts#L42)). **The distributor submit form needs a plan list and cannot call it.** Resolution in §5.3.

---

## 1. Prisma — model, enum, indexes, migration

### 1.1 Enum

```prisma
// D11: the request's own review states, PLUS a mirror of every OrderStat value. Once a
// request is linked to an Order (orderId), the order's status propagates here on every
// change; unlinking reverts it to APPROVED. Kept as its own enum (not a union of two)
// because Postgres enums cannot be composed and the contract mirrors this 1:1.
enum OrderRequestStat {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
  PENDING_DELIVERY // ─┐
  IN_DELIVERY      //  ├─ mirrors OrderStat, set only by propagation
  DELIVERED        //  │
  RETURNED         // ─┘
}
```

### 1.2 Model

```prisma
model CardOrderRequest {
  id                 String           @id @default(uuid())
  distributorId      String
  subscriptionPlanId String
  nbOfCards          Int
  note               String?
  stat               OrderRequestStat @default(PENDING)
  adminNote          String?
  reviewedByUserId   String?
  orderId            String?          @unique // D5: the FK lives here, never on Order.
  createdAt          DateTime         @default(now())
  reviewedAt         DateTime?

  distributor      Distributor      @relation(fields: [distributorId], references: [id])
  subscriptionPlan SubscriptionPlan @relation(fields: [subscriptionPlanId], references: [id])
  reviewedBy       User?            @relation(fields: [reviewedByUserId], references: [id])
  order            Order?           @relation(fields: [orderId], references: [id], onDelete: SetNull)

  @@index([distributorId, stat])
  @@index([stat])
  @@index([createdAt])
  @@index([subscriptionPlanId])
}
```

Back-references (**virtual — zero DB columns, zero migration statements on those tables**):

```prisma
model Order            { … cardOrderRequest  CardOrderRequest?  }
model Distributor      { … cardOrderRequests CardOrderRequest[] }
model SubscriptionPlan { … cardOrderRequests CardOrderRequest[] }
model User             { … reviewedOrderRequests CardOrderRequest[] }
```

> **On D5's "the `Order` model is NOT modified".** Prisma requires both sides of a relation to be declared. The back-reference on `Order` is a *virtual* field: it produces **no column, no constraint, and no SQL** on the `Order` table — the FK column and its unique index exist only on `CardOrderRequest`. Verify after generating: the migration must contain **no `ALTER TABLE "Order"` other than the `ADD CONSTRAINT … FOREIGN KEY` that Postgres puts on the *referencing* table** (i.e. on `CardOrderRequest`). D5 is honoured. The alternative — a bare `orderId String?` with no relation — was rejected: it would break the schema's own convention (every FK in this schema has a relation) and would leave dangling ids after `OrderService.delete()`'s hard delete.

### 1.3 Index justification

| Index | Query it serves | Why it is needed |
|---|---|---|
| `@@index([distributorId, stat])` | Distributor portal history: `where { distributorId: me, stat? }` `orderBy createdAt desc`. Also serves `distributorId`-only queries via the left prefix. | The one hot path a distributor hits. Composite because the status filter chip on the portal history table is expected to be the common refinement. |
| `@@index([stat])` | Admin list default (`stat = PENDING`) **and** the add-order selector (`stat = APPROVED AND orderId IS NULL`) — both scan **across all distributors**, so the composite above cannot serve them (no leading `distributorId` predicate). | Without it the selector and the admin queue both seq-scan. |
| `@@index([createdAt])` | `orderBy createdAt desc` on every list + the `dateFrom`/`dateTo` filters. | Mirrors `Order.@@index([createdAt])` — the same list shape, the same index. |
| `@@index([subscriptionPlanId])` | FK integrity checks + the admin table's plan filter. | Schema convention: every FK is indexed (`Order`, `Lot`, `Set`, `Card` all do this). Postgres does **not** auto-index FKs. |
| `orderId String? @unique` | **The concurrency guard** (§6.2). Also the propagation lookup `where { orderId }`. | A `@unique` on a nullable column in Postgres allows unlimited NULLs, so unlinked requests never collide — this is exactly the D5 shape. |
| ~~`@@index([reviewedByUserId])`~~ | *(deliberately omitted)* | Nothing filters by reviewer. `Log.userId` already answers "what did this admin do". Add it if a future admin-activity view needs it. |

### 1.4 `LogActionType`

```prisma
enum LogActionType {
  … existing 15 values …
  CHANGE_ORDER_REQUEST_STAT
}
```
Mirrored byte-identically in [log.enums.ts](Apps/contract/src/modules/log/log.enums.ts).

### 1.5 Migration

**Name:** `add_card_order_request` → `npx prisma migrate dev --name add_card_order_request`
(resulting directory e.g. `Apps/api/prisma/migrations/2026xxxxxxxxxx_add_card_order_request/`).

Contents: `CREATE TYPE "OrderRequestStat"`, `ALTER TYPE "LogActionType" ADD VALUE 'CHANGE_ORDER_REQUEST_STAT'`, `CREATE TABLE "CardOrderRequest"`, 4 indexes + 1 unique index, 4 FK constraints.

**Seed impact: none.** `Order` gains no required field; `load_wilaya`, `load_commission_durations`, `create_admin_account`, `load_mock_data` all still run unchanged. `prisma migrate reset` + reseed is safe.

> ⚠️ **Postgres caveat:** `ALTER TYPE … ADD VALUE` cannot run in the same transaction as a statement that *uses* the new value. Prisma puts each migration in its own transaction, and nothing in this migration inserts a `Log` row, so this is safe. Do not hand-add a data backfill using `CHANGE_ORDER_REQUEST_STAT` to this migration file.

---

## 2. The state machine

`stat` transitions. **Manual** = an explicit HTTP action. **Propagated** = written as a side effect of an `OrderStat` change, in that change's transaction.

| # | From | To | Who may trigger | Kind | Route / path |
|---|---|---|---|---|---|
| 1 | *(none)* | `PENDING` | Distributor (owner, `isEnabled`) | manual | `CREATE` |
| 2 | `PENDING` | `APPROVED` | Admin | manual | `APPROVE` |
| 3 | `PENDING` | `REJECTED` | Admin | manual | `REJECT` |
| 4 | `PENDING` or `APPROVED` | `CANCELLED` | Distributor (owner only) | manual | `CANCEL` |
| 5 | `APPROVED` | `PENDING_DELIVERY` | Admin | **propagated** — link | `ORDER_ROUTES.CREATE` with `orderRequestId` (path 1) |
| 6 | `PENDING_DELIVERY` | `IN_DELIVERY` | Admin | **propagated** | `ORDER_ROUTES.TRANSITION` (path 2) |
| 7 | `IN_DELIVERY` | `DELIVERED` | Admin | **propagated** | `ORDER_ROUTES.TRANSITION` (path 3) |
| 8 | `IN_DELIVERY` | `RETURNED` | Admin | **propagated** | `ORDER_ROUTES.TRANSITION` (path 4) |
| 9 | `PENDING_DELIVERY` | `APPROVED` | Admin | **unlink** | `ORDER_ROUTES.DELETE` (path 5) — order hard-deleted |
| 10 | `PENDING_DELIVERY` | `APPROVED` | Admin | **unlink** | `UNLINK` — explicit detach, order kept |

**Terminal:** `REJECTED`, `CANCELLED`, `DELIVERED`, `RETURNED`. **Nothing else is legal** — any other pair throws `ConflictError` from the service (`Cannot change order request from X to Y`), enforced by an `ALLOWED_TRANSITIONS` map mirroring [`order.service.ts:18-21`](Apps/api/src/modules/order/order.service.ts#L18-L21). The UI hides illegal actions; the service is what enforces them.

### 2.1 Two deliberate restrictions

- **Cancel is `PENDING` or `APPROVED`, never once linked.** A distributor may withdraw a request they no longer want — including one an admin already approved but hasn't yet acted on — right up until it is attached to a real order (`PENDING_DELIVERY`+). Once linked, undoing it is `UNLINK` (an admin action on the order), not `CANCEL` (a distributor action on the request); the two must not overlap or a distributor could yank the paperwork out from under an order that's already moving. Enforced server-side via the `ALLOWED_TRANSITIONS` map, not by hiding the button — `CANCEL` on a `PENDING_DELIVERY`+ request throws `ConflictError`.
- **Unlink is `PENDING_DELIVERY`-only** (rows 9–10). It mirrors `OrderService.delete()`'s own rule — an order that has physically shipped cannot have its paperwork detached. Unlinking a `DELIVERED` order would put the request back in the selector while its cards are already at the distributor. (**Q4**)

### 2.2 What unlink writes

`stat = APPROVED`, `orderId = null`, `reviewedAt`/`reviewedByUserId`/`adminNote` **untouched** (the approval decision and its author survive — only the link is undone). The row reappears in the selector immediately.

---

## 3. Propagation — the correctness risk of this set

**One helper, five call sites.** Exported from the new module's service file (same shape as `composeSubscriptionLabel` exported from `set.mapper.ts` and consumed by `order.mapper.ts`), so `order.service.ts` never inlines request logic:

```ts
// card-order-request.service.ts — module-level export, takes the caller's transaction client.
// Returns the touched request (id + distributorId + new stat) or null when the order has no
// linked request, so the caller can emit the event AFTER its transaction commits.
export async function propagateOrderStatToRequest(
  tx: Prisma.TransactionClient,
  orderId: string,
  to: OrderRequestStat,
  actorId: string,
): Promise<{ id: string; distributorId: string; stat: OrderRequestStat } | null>
```

It: `findUnique({ where: { orderId } })` → if null, return null → else `update({ stat: to })` **+** `tx.log.create({ actionType: CHANGE_ORDER_REQUEST_STAT, … })`, both inside `tx`.

A sibling `unlinkRequestFromOrder(tx, orderId, actorId)` does the same for rows 9–10 (`stat: APPROVED`, `orderId: null`).

### 3.1 Insertion table — go through this one by one during execution

| # | Path | Insertion point | What is inserted | Change to the existing code |
|---|---|---|---|---|
| **1** | `create()` [:126-153](Apps/api/src/modules/order/order.service.ts#L126-L153) | inside the existing `$transaction`, **after** `tx.order.create` | `updateMany` claim of the selected request (§6.2) → `PENDING_DELIVERY` + `orderId` + log | new `cmd.orderRequestId` branch; skipped entirely when absent |
| **2** | `transition() → IN_DELIVERY` [:176-180](Apps/api/src/modules/order/order.service.ts#L176-L180) | — | `propagateOrderStatToRequest(tx, id, IN_DELIVERY, actorId)` | ⚠️ **must be wrapped in `$transaction` first** — it is a bare `order.update` today. This is the one structural change to an existing path. |
| **3** | `transition() → DELIVERED` [:185-202](Apps/api/src/modules/order/order.service.ts#L185-L202) | inside the existing `$transaction`, last statement | `propagateOrderStatToRequest(tx, id, DELIVERED, actorId)` | additive |
| **4** | `transition() → RETURNED` [:204-213](Apps/api/src/modules/order/order.service.ts#L204-L213) | inside the existing `$transaction`, last statement | `propagateOrderStatToRequest(tx, id, RETURNED, actorId)` | additive |
| **5** | `delete()` [:236-250](Apps/api/src/modules/order/order.service.ts#L236-L250) | inside the existing `$transaction`, **before** `tx.order.delete` | `unlinkRequestFromOrder(tx, id, actorId)` → `APPROVED` + `orderId: null` + log | additive. Must run **before** the delete: `onDelete: SetNull` would otherwise clear `orderId` at DB level and leave `stat` stranded at `PENDING_DELIVERY` forever. |
| **6** | `unlink()` (new, on the request module) | its own `$transaction` | `unlinkRequestFromOrder` + guard that the order is still `PENDING_DELIVERY` | new code |

**Events fire after the transaction commits**, never inside it — matching `activation.service.ts` throughout. Each propagating path emits one `order-request:status-changed`, only when the helper returned non-null.

### 3.2 Signature changes to the existing Order module (required)

Every propagating path writes a `Log` row, and `Log.userId` is `NOT NULL` — so the actor must reach the service. Today it does not.

| File | Change |
|---|---|
| [order.interface.ts](Apps/api/src/modules/order/order.interface.ts) | `create(cmd, actorId)` · `transition(id, cmd, actorId)` · `delete(id, actorId)` |
| [order.controller.ts](Apps/api/src/modules/order/order.controller.ts) | pass `req.user!.id` — exactly the pattern already used by [card.controller.ts:41,69](Apps/api/src/modules/card/card.controller.ts#L41) |
| [order.service.ts](Apps/api/src/modules/order/order.service.ts) | accept and forward `actorId` |

`ORDER_ROUTES.*` already sit behind `adminOnly`, so `req.user` is always present.

### 3.3 Failure mode to watch

A missed path does not error — the request silently keeps a stale status. **The execute report must confirm all six rows of §3.1 individually.** Verification query after the manual test:

```sql
SELECT r.id, r.stat, o."orderStat"
FROM "CardOrderRequest" r JOIN "Order" o ON o.id = r."orderId"
WHERE r.stat::text <> o."orderStat"::text;   -- must return 0 rows
```

---

## 4. Contract — `Apps/contract/src/modules/card-order-request/`

Vocabulary per contract-rules §5: inputs are **Command** (writes) / **Query** (reads + path params), outputs are **DTO**.

| File | Contents |
|---|---|
| `card-order-request.enums.ts` | `OrderRequestStat` — **all 8 values declared literally here.** Does **not** import `OrderStat` from `modules/order`: R13 (a cross-module Zod import is a runtime cycle risk that `tsc` cannot see). Run `madge --circular src` after. |
| `card-order-request.routes.ts` | `CARD_ORDER_REQUEST_ROUTES` (below) |
| `card-order-request.command.ts` | `CreateCardOrderRequestSchema` `{ subscriptionPlanId: z.uuid(), nbOfCards: z.number().int().min(1).max(10_000), note: z.string().max(500).optional() }` → `CreateCardOrderRequestCommand`; `ReviewCardOrderRequestSchema` `{ adminNote: z.string().max(500).optional() }` → `ReviewCardOrderRequestCommand` (used by both APPROVE and REJECT) |
| `card-order-request.query.ts` | `GetCardOrderRequestsQuerySchema` (admin: `page`, `limit`, `search`, `distributorId?`, `subscriptionPlanId?`, `state?: OrderRequestStat`, `dateFrom?`, `dateTo?`) · `GetMyCardOrderRequestsQuerySchema` (distributor: `page`, `limit`, `state?`) · `CardOrderRequestIdParamsSchema` `{ id: z.uuid() }` |
| `card-order-request.dtos.ts` | `CardOrderRequestResponseSchema` → `CardOrderRequestDTO`; `LinkableCardOrderRequestResponseSchema` → `LinkableCardOrderRequestDTO`; `PaginatedCardOrderRequestsSchema` |
| `card-order-request.events.ts` | `CardOrderRequestEvents` + the two payload schemas (§9) |
| `index.ts` | barrel re-exporting the six |

**`nbOfCards` bounds are the answer to manual test 7** (`0`, negative, absurd): `z.number().int().min(1).max(10_000)` rejects all three with `VALIDATION_ERROR` before the service is reached. The frontend schema mirrors the same bounds with translated messages.

### 4.1 DTOs

```ts
CardOrderRequestResponseSchema = z.object({
  id: z.uuid(),
  distributorId: z.uuid(),
  distributorName: z.string(),          // Distributor.storeName, as OrderDTO.distributorName
  subscriptionPlanId: z.uuid(),
  subscriptionLabel: z.string(),        // composeSubscriptionLabel(plan) — same as OrderDetailDTO.lots[]
  nbOfCards: z.number().int(),
  note: z.string().nullable(),
  stat: z.enum(OrderRequestStat),
  adminNote: z.string().nullable(),
  reviewedByName: z.string().nullable(),// Admin.fullName via reviewedBy.admin
  orderId: z.uuid().nullable(),
  orderNumber: z.string().nullable(),   // so the admin table links straight to the order
  createdAt: z.iso.datetime(),
  reviewedAt: z.iso.datetime().nullable(),
});

LinkableCardOrderRequestResponseSchema = z.object({
  id: z.uuid(),
  distributorId: z.uuid(),
  distributorName: z.string(),
  subscriptionLabel: z.string(),
  nbOfCards: z.number().int(),
  createdAt: z.iso.datetime(),
});
```

Nullable, not optional — this schema has no `.optional()` fields, so `exactOptionalPropertyTypes` (R12) never bites here. All dates `z.iso.datetime()` (contract-rules §3.2).

### 4.2 Routes

```ts
export const CARD_ORDER_REQUEST_ROUTES = {
  BASE: '/card-order-requests',
  GET_ALL:      '/',          // admin
  GET_MINE:     '/mine',      // distributor (static — declared before /:id)
  GET_LINKABLE: '/linkable',  // admin (static — declared before /:id)
  CREATE:       '/',          // distributor
  GET_BY_ID:    '/:id',       // admin
  APPROVE:      '/:id/approve',
  REJECT:       '/:id/reject',
  CANCEL:       '/:id/cancel', // distributor (owner)
  UNLINK:       '/:id/unlink', // admin
} as const;
```
Static-before-param registration order is the existing convention ([card.routes.ts](Apps/api/src/modules/card/card.routes.ts#L29-L34), [subscription-plan.routes.ts](Apps/api/src/modules/subscription-plan/subscription-plan.routes.ts#L23)).

### 4.3 Contract files modified outside the new module

| File | Change |
|---|---|
| [log.enums.ts](Apps/contract/src/modules/log/log.enums.ts) | `+ CHANGE_ORDER_REQUEST_STAT` |
| [order.command.ts](Apps/contract/src/modules/order/order.command.ts) | `CreateOrderSchema` `+ orderRequestId: z.uuid().optional()` — **the only change to the order contract.** No DTO change: `OrderDTO` does not learn about requests (D5 — the link is read from the request side). |
| [src/index.ts](Apps/contract/src/index.ts) | `+ export * from './modules/card-order-request';` |

---

## 5. Backend — `Apps/api/src/modules/card-order-request/`

Five files, mirroring `modules/order/` (§0.1 / **Q1**).

| File | Contents |
|---|---|
| `card-order-request.mapper.ts` | `CardOrderRequestMapper.toDTO(entity, joins)` / `.toLinkableDTO(...)`. Pure, field-by-field, `Date → toISOString()`, ends with `Schema.parse(dto)` (the dev/test conformance guard every mapper here uses). Reuses `composeSubscriptionLabel` from `@modules/set/set.mapper`. |
| `card-order-request.interface.ts` | `ICardOrderRequestService` — 8 methods, all returning contract DTOs |
| `card-order-request.service.ts` | The logic + the two exported propagation helpers (§3) |
| `card-order-request.controller.ts` | Thin; `req.validated.*`; `sendSuccess`; `try/catch → next(err)` |
| `card-order-request.routes.ts` | Composition root — `new Service(prisma)` → `new Controller(service)`, guards + `validateRequest` per route |

Plus one import + one `moduleRouter.use(CARD_ORDER_REQUEST_ROUTES.BASE, cardOrderRequestRouter)` line in [modules/index.ts](Apps/api/src/modules/index.ts).

### 5.1 Route × guard × scoping

```ts
const adminOnly       = requireAuth({ roles: [UserRole.ADMIN] });
const distributorOnly = requireAuth({ roles: [UserRole.DISTRIBUTOR] });
```

| Route | Method | Guard | Validation | Scoping |
|---|---|---|---|---|
| `GET_ALL` | GET | `adminOnly` | `query: GetCardOrderRequestsQuerySchema` | none — global |
| `GET_MINE` | GET | `distributorOnly` | `query: GetMyCardOrderRequestsQuerySchema` | **`where.distributorId = resolveDistributor(req.user.id).id`** |
| `GET_LINKABLE` | GET | `adminOnly` | — | `where { stat: APPROVED, orderId: null }` |
| `GET_BY_ID` | GET | `adminOnly` | `params` | none |
| `CREATE` | POST | `distributorOnly` | `body: CreateCardOrderRequestSchema` | `distributorId` from the session, **never from the body** |
| `APPROVE` | POST | `adminOnly` | `params` + `body: ReviewCardOrderRequestSchema` | none |
| `REJECT` | POST | `adminOnly` | `params` + `body: ReviewCardOrderRequestSchema` | none |
| `CANCEL` | POST | `distributorOnly` | `params` | **ownership enforced in the `where`** |
| `UNLINK` | POST | `adminOnly` | `params` | none |

**Distributor scoping is in the query, never a post-fetch filter.**

```ts
private async resolveDistributor(userId: string): Promise<Distributor> {   // mirrors resolveActivator
  const d = await this.prisma.distributor.findFirst({ where: { userId, deletedAt: null } });
  if (!d) throw new ForbiddenError();
  return d;
}
```
`CANCEL` uses `findFirst({ where: { id, distributorId: me.id } })` → `NotFoundError` when it belongs to someone else (a 404, not a 403 — B's request must not be *confirmed to exist* to A). This is manual test 9's server-side half. Ownership passing does **not** bypass the state machine — `stat` must still be `PENDING` or `APPROVED` (§2.1) or the service throws `ConflictError` regardless of who owns the row.

`CREATE` additionally rejects a disabled distributor: `if (!me.isEnabled) throw new BadRequestError('Distributor is not enabled')` — the same guard `OrderService.create()` already applies ([:102](Apps/api/src/modules/order/order.service.ts#L102)).

### 5.2 Per-method behaviour

| Method | Transaction | Log (in tx) | Event (after commit) |
|---|---|---|---|
| `getAll` / `getMine` / `getById` / `getLinkable` | — | — | — |
| `create(cmd, userId)` | ✅ insert | — *(a submission is not an admin action; the audit trail starts at review — **Q5**)* | `order-request:created` |
| `approve(id, cmd, actorId)` | ✅ update + log | `CHANGE_ORDER_REQUEST_STAT` — `Order request <id> approved for <storeName> (<n> × <plan>)` | `order-request:status-changed` |
| `reject(id, cmd, actorId)` | ✅ update + log | same type, "rejected" | `order-request:status-changed` |
| `cancel(id, userId)` | ✅ update + log | same type, "cancelled by distributor", `userId` = the **distributor's** `User.id` | `order-request:status-changed` |
| `unlink(id, actorId)` | ✅ update + log | same type, "unlinked from order <orderNumber>" | `order-request:status-changed` |

All log writes go **inside** the transaction — the majority pattern (13 of 18 existing sites) and what the execute prompt requires. No `writeLog` helper is introduced here (R9 proposed one for Set 1; it did not land, so this set stays consistent with the surrounding code rather than inventing a second convention mid-programme — **Q6**).

`approve`/`reject` set `reviewedAt = now`, `reviewedByUserId = actorId`, `adminNote = cmd.adminNote ?? null`.

### 5.3 The subscription-plan access gap

The distributor submit form needs the active plan list, and `SUBSCRIPTION_PLAN_ROUTES.GET_ALL` is `adminOnly` (§0.6).

**Recommendation: widen that one route to `requireAuth({ roles: [ADMIN, DISTRIBUTOR] })`.** `SubscriptionPlanDTO` is `{ id, subscriptionType, subscriptionDuration, label, isActive }` — a public catalogue, no money, no commission (commissions are the separate `GET_COMMISSIONS` route, which stays `adminOnly`). The alternative — a duplicate `/card-order-requests/plans` endpoint — would give two DTOs for one concept.

This is a one-line change to [subscription-plan.routes.ts:42](Apps/api/src/modules/subscription-plan/subscription-plan.routes.ts#L42) and it is the **only** guard this set relaxes. Recorded as **Q7**.

---

## 6. The add-order form

### 6.1 How the selector queries

`GET /card-order-requests/linkable` → `LinkableCardOrderRequestDTO[]` (unpaginated — approved-and-unlinked is a small working set, same call shape as `LOT_ROUTES.GET_AVAILABLE_FOR_ORDER` / `CARD_ROUTES.GET_AVAILABLE_FOR_LOT`).

```ts
where: { stat: OrderRequestStat.APPROVED, orderId: null }
orderBy: { createdAt: 'asc' }   // oldest request served first
```

**Placement:** on `StepSelectDistributor` (step 0), below the distributor picker, **enabled only once a distributor is chosen** and client-filtered to that distributor's requests — a request belongs to a distributor, so offering another's is nonsense. Selecting one:
- sets `orderRequestId`,
- shows a summary chip (`<n> cards · <plan> · <date>`) with a **remove (×)** control that clears the field,
- **does not** auto-fill `lotIds` — the request states a quantity and a plan, not which physical lots satisfy it. The admin still picks lots at step 1. (**Q8**)

**May be left empty** — `orderRequestId` is optional end to end; a manually-created order links nothing.

**A rejected/cancelled/pending request never appears** — the `where` clause is the enforcement, and the service re-checks on link (§6.2). That is manual test 6.

### 6.2 Two admins pick the same request — what the second one sees

The link is a **conditional claim inside the order-creation transaction**, not a plain update:

```ts
const claimed = await tx.cardOrderRequest.updateMany({
  where: { id: cmd.orderRequestId, stat: OrderRequestStat.APPROVED, orderId: null },
  data:  { stat: OrderRequestStat.PENDING_DELIVERY, orderId: order.id },
});
if (claimed.count !== 1) {
  throw new ConflictError('This order request is no longer available — it may have been linked to another order.');
}
```

- `updateMany` with the state predicate is atomic; the loser's `count` is `0` and it throws.
- The `@unique` on `orderId` is the **second** line of defence: if two transactions somehow both pass the predicate, Postgres rejects the second with `P2002`. The service catches `P2002` on `orderId` and rethrows the **same** `ConflictError`, so both races produce one message.
- **The throw aborts the whole `$transaction`** → **the second admin's order is not created at all.** Lots stay free, nothing is half-written. This is deliberate: silently creating the order without the link would leave the admin believing the request was fulfilled.

**What the second admin sees:** HTTP **409** · `ErrorCode.RESOURCE_CONFLICT` · message above. The frontend `MutationCache.onError` ([query-client.ts](Apps/web/src/lib/query-client.ts)) toasts `error.response.data.error.message` automatically — no per-form handling needed. The modal stays open on the summary step; `useCreateOrder`'s invalidation does not run, but the realtime `order-request:status-changed` from the winner's transaction refreshes the selector, so the now-taken request disappears from the list under the admin's cursor.

### 6.3 Files touched

| File | Change |
|---|---|
| [create-order.schema.ts](Apps/web/src/pages/admin/distributors/components/create-order.schema.ts) | `+ orderRequestId: z.string().optional()`. ⚠️ The compile guard `CreateOrderFormValues extends CreateOrderCommand` still holds (`string \| undefined` ⊂ `string \| undefined`). The form default must be `undefined`, **not `""`** — `""` fails the contract's `z.uuid()` server-side. Clearing the selector sets `undefined` via `setValue("orderRequestId", undefined)`. |
| `CreateOrderModal.tsx` | new `useLinkableOrderRequests()` query; `DEFAULT_VALUES.orderRequestId: undefined`; pass through to `StepSelectDistributor`; show it on `StepConfirmSummary` |
| `StepSelectDistributor.tsx` | the selector UI + remove control |
| `StepConfirmSummary.tsx` | one summary line: linked request or "none" |

---

## 7. Gateway

### 7.1 Rooms and routing

| Event | Namespace | Room | Rationale |
|---|---|---|---|
| `order-request:created` | `/admin` | `rooms.ADMIN_BELL` | every admin sees a new submission |
| `order-request:status-changed` | `/distributors` | `rooms.distributor(p.distributorId)` | **only the owning distributor.** Room is keyed by `Distributor.id` — the payload therefore carries `distributorId`, not `userId`. |
| `order-request:status-changed` | `/admin` | `rooms.ADMIN_BELL` | the admin queue and the linkable-selector must refresh when *any* actor moves a request (a distributor cancelling, another admin approving) |

`rooms.distributor()` and the `/distributors` namespace already exist and need no change (§0.6).

### 7.2 Files

| File | Change |
|---|---|
| [event-bus.ts](Apps/api/src/common/events/event-bus.ts) | `type AppEvents = ActivationEvents & CardOrderRequestEvents` |
| [realtime-gateway.ts](Apps/api/src/common/realtime/realtime-gateway.ts) | 2 new `eventBus.on(...)` registrations (3 emits), each wrapped in the existing `safe()` |
| [socket.types.ts](Apps/api/src/common/realtime/socket.types.ts) | `ServerToClientEvents` += the two events |

No `server.ts` change — the namespace and its auth middleware already exist.

---

## 8. Frontend

### 8.1 New files

| Path | Purpose |
|---|---|
| `src/services/card-order-requests.service.ts` | 8 functions, one per route. Pure TS, one axios instance, `apiPath`/`withParams`, unwraps the envelope, defensive `if (!res.data.success) throw`. Mirrors [orders.service.ts](Apps/web/src/services/orders.service.ts) exactly. |
| `src/hooks/useCardOrderRequests.ts` | `useCardOrderRequests(query)` · `useMyCardOrderRequests(query)` · `useLinkableOrderRequests()` · `useCardOrderRequest(id)` · `useCreateCardOrderRequest()` · `useApproveCardOrderRequest()` · `useRejectCardOrderRequest()` · `useCancelCardOrderRequest()` · `useUnlinkCardOrderRequest()`. Mutations invalidate `qk.cardOrderRequests.all()`; approve/reject/unlink also invalidate `qk.orders.all()`. |
| `src/pages/distributor/RequestsPage.tsx` | Portal page — `PageHeader` + "New request" button + status filter + **`DataTable`** history + `SimplePagination` |
| `src/pages/distributor/components/SubmitOrderRequestModal.tsx` | Dialog + RHF + zodResolver |
| `src/pages/distributor/components/submit-order-request.schema.ts` | co-located Zod, translated messages, `AssertAssignable` guard against `CreateCardOrderRequestCommand` (the `create-order.schema.ts` idiom) |
| `src/pages/distributor/components/MyOrderRequestsTable.tsx` | **`DataTable`** + `TableSkeleton` + `EmptyState` + `NotFoundState`; mobile card rows; cancel confirm via `AlertDialog` |
| `src/pages/admin/distributors/OrderRequestsPage.tsx` | Admin management page — `PageHeader` + filters + **`DataTable`** + `SimplePagination` |
| `src/pages/admin/distributors/components/OrderRequestsFilters.tsx` | search · distributor · plan · state · date range · clear (mirrors [OrdersFilters.tsx](Apps/web/src/pages/admin/distributors/components/OrdersFilters.tsx)) |
| `src/pages/admin/distributors/components/OrderRequestsTable.tsx` | **`DataTable`**; columns: distributor · plan · qty · note · status badge · reviewed by · linked order · created; row actions Approve / Reject / Unlink |
| `src/pages/admin/distributors/components/ReviewOrderRequestModal.tsx` | one modal, `mode: "approve" \| "reject"`, optional `adminNote` |
| `src/pages/admin/distributors/components/review-order-request.schema.ts` | co-located Zod |

> **`components/shared/DataTable.tsx` is used for all three tables** (`columns` + `data` + `getRowKey` + `renderMobileRow` + `emptyState`). No new table component. `TableSkeleton` for loading, `NotFoundState` for error, `EmptyState` for empty — the layout-preserving trio front-end-rules §4 requires.

### 8.2 Modified files

| File | Change |
|---|---|
| [query-keys.ts](Apps/web/src/lib/query-keys.ts) | new `cardOrderRequests` family: `all()` · `list(query)` · `mineAll()` · `mine(query)` · `linkable()` · `detail(id)` |
| [realtime.ts](Apps/web/src/lib/realtime.ts) | `attachAdminNamespaceListeners`: `order-request:created` → invalidate `cardOrderRequests.all()` + `toast.info(translate("admin.orderRequests.toast.newRequest", getLanguage()))`; `order-request:status-changed` → invalidate `cardOrderRequests.all()`. **`attachDistributorNamespaceListeners`** (empty today): `order-request:status-changed` → invalidate `cardOrderRequests.mineAll()`; plus a `connect` re-fetch, mirroring the activator namespace. |
| [StatusBadge.tsx](Apps/web/src/components/shared/StatusBadge.tsx) | `ORDER_REQUEST_TONE: Record<OrderRequestStat, BadgeTone>` (8 entries) + `OrderRequestStatusBadge`. **`LOG_ACTION_TONE` must gain `CHANGE_ORDER_REQUEST_STAT`** — the `Record<LogActionType, …>` is exhaustive and `tsc` fails without it. |
| [nav-links.ts](Apps/web/src/config/nav-links.ts) | `DISTRIBUTOR_NAV_LINKS` += `{ to: "/portal/requests", labelKey: "distributor.nav.orderRequests", icon: Package }`; `ADMIN_NAV_LINKS` distributors group += `{ to: "/admin/distributors/order-requests", … }` |
| [App.tsx](Apps/web/src/App.tsx) | 2 lazy imports + 2 routes. `/admin/distributors/order-requests` is a **static** sibling and must be declared **before** `/admin/distributors/:id` (the file's own precedence note at [:196-198](Apps/web/src/App.tsx#L196-L198)). |
| `CreateOrderModal.tsx`, `StepSelectDistributor.tsx`, `StepConfirmSummary.tsx`, `create-order.schema.ts` | §6.3 |
| [translations.json](Apps/web/src/config/translations.json) | §8.3 |

### 8.3 Translation keys

Flat `key → { en, fr, ar: "" }`, `ar` present and empty (front-end-rules §6.B). Groups:

- `enums.orderRequestStat.{PENDING,APPROVED,REJECTED,CANCELLED,PENDING_DELIVERY,IN_DELIVERY,DELIVERED,RETURNED}` — 8
- `enums.logActionType.CHANGE_ORDER_REQUEST_STAT` — 1
- `distributor.nav.orderRequests`, `distributor.orderRequests.{title,submit,empty*,table.*,status,cancel*,form.*}` — ~20
- `admin.shell.nav.orderRequests`, `admin.orderRequests.{title,table.*,filters.*,review.*,approve*,reject*,unlink*,empty*}` — ~28
- `admin.orders.create.orderRequest.{label,placeholder,none,remove,summary,loading,error}` — ~7
- `admin.orderRequests.toast.newRequest` — 1
- validation: reuse `common.validation.*` where it exists; add `distributor.orderRequests.form.quantityRange` for the 1–10 000 bound

Rough total ≈ **65 new keys**. No inline strings in JSX.

---

## 9. Note for Set 6 — exact event names and payloads

```ts
// Apps/contract/src/modules/card-order-request/card-order-request.events.ts
export const OrderRequestCreatedPayloadSchema = z.object({
  requestId: z.uuid(),
  distributorId: z.uuid(),        // Distributor.id — the room key, not User.id
  distributorName: z.string(),    // Distributor.storeName
  subscriptionLabel: z.string(),
  nbOfCards: z.number().int(),
  timestamp: z.iso.datetime(),
});

export const OrderRequestStatusChangedPayloadSchema = z.object({
  requestId: z.uuid(),
  distributorId: z.uuid(),
  stat: z.enum(OrderRequestStat),
  previousStat: z.enum(OrderRequestStat),
  orderId: z.uuid().nullable(),   // null after unlink / reject / cancel
  timestamp: z.iso.datetime(),
});

export type CardOrderRequestEvents = {
  'order-request:created':        OrderRequestCreatedPayload;
  'order-request:status-changed': OrderRequestStatusChangedPayload;
};
```

**For the Set 6 notification subscriber:**
- `order-request:created` → notify **admins**. Everything the message needs (store name, plan label, quantity) is in the payload — **no DB read required in the subscriber.**
- `order-request:status-changed` → notify **the distributor** identified by `distributorId`. `previousStat` exists precisely so the subscriber can distinguish an admin decision (`PENDING → APPROVED/REJECTED`) from a delivery-status propagation (`* → IN_DELIVERY`) and pick a different template, without re-reading the row.
- Both are emitted **after** their transaction commits, so the row is durable when the subscriber runs.
- R5 still applies: `eventBus.emit` is synchronous and uncaught inside these services — a throwing Set 6 subscriber would fail the originating request. Set 6 owns that fix.

---

## 10. Open questions

| # | Question | My recommendation |
|---|---|---|
| **Q1** | CLAUDE.md mandates a 6-file backend module including `index.ts`; **no existing module has one**. Build 5 or 6? | **DECIDED: 5** — mirror `modules/order/` as the execute prompt demands. |
| **Q2** | "Admin bell fires live" — the bell has no feed or badge. Is invalidation + toast enough for this set? | **DECIDED: yes.** A real notification feed is a Set 6-shaped feature. |
| **Q3** | Can a distributor cancel an **APPROVED** request (before it is linked)? | **DECIDED (user, overrides recommendation): yes.** `CANCEL` is legal from `PENDING` **or** `APPROVED`; illegal from `PENDING_DELIVERY`+ (already linked). Reflected in §2 and §2.1. |
| **Q4** | Can an admin unlink a request from an order that is already `IN_DELIVERY` / `DELIVERED`? | **DECIDED: no** — `PENDING_DELIVERY` only, mirroring `OrderService.delete()`'s rule. |
| **Q5** | Should **submission** write a `Log` row, or only admin decisions? | **DECIDED: decisions only.** `Log.userId` is an actor trail for admin actions; the request row itself already records who submitted and when. |
| **Q6** | Introduce R9's shared `writeLog(tx, …)` helper here? | **DECIDED: no** — Set 1 didn't land it; adding it mid-programme creates two conventions. Keep it on the Set 13 audit-log docket. |
| **Q7** | Widen `SUBSCRIPTION_PLAN_ROUTES.GET_ALL` to `[ADMIN, DISTRIBUTOR]`? | **DECIDED: yes** — it is a catalogue with no financial data. Commissions stay admin-only. |
| **Q8** | Should picking a request pre-select lots matching its plan/quantity? | **DECIDED: no** — out of scope, and lot choice is physical-stock judgement. |
| **Q9** | Does the distributor's request page live at `/portal/requests` (nested) or `/requests`? | **DECIDED: `/portal/requests`** — keeps the portal namespaced ahead of Set 7 filling it out. `/requests` is already the activator's. |

---

## 11. Manual test checklist

Preconditions: a distributor with a login (Set 1 `CREATE_ACCOUNT`), an admin session in a second browser profile, both dev servers running.

1. **Submit → admin sees it live.** Distributor: `/portal/requests` → New request → plan + quantity 50 + note → Submit. **Without reloading**, the admin's `/admin/distributors/order-requests` gains the row and a toast fires.
2. **Approve with a note → distributor updates live.** Admin: Approve, `adminNote` = "OK, shipping Thursday". The distributor's open history table flips `PENDING → APPROVED` and shows the note without a reload.
3. **Selector lists it; creating the order links it.** Admin: Orders → New order → pick that distributor → the request appears in the selector → select it → finish the wizard. Request becomes `PENDING_DELIVERY`; the admin table shows the linked order number.
4. **`IN_DELIVERY` → request mirrors.** Move the order to `IN_DELIVERY`. Request shows `IN_DELIVERY` (this is propagation path 2 — the path that had no transaction).
5. **`DELIVERED` → request mirrors.** Same for `DELIVERED`. Run the §3.3 SQL check — 0 rows.
6. **`RETURNED` mirrors too.** Repeat 3–4 on a second request and finish with `RETURNED`.
7. **Unlink → back to `APPROVED` and back in the selector.** On a `PENDING_DELIVERY` request, Unlink. Status returns to `APPROVED`, `adminNote` and reviewer survive, and it reappears in the add-order selector.
8. **Delete the order → same effect.** Link a request, then delete the order (allowed only from `PENDING_DELIVERY`). Request returns to `APPROVED`, `orderId` is null, no orphan row.
9. **A rejected request never appears in the selector.** Reject one; confirm it is absent from `/linkable` (UI **and** `curl /api/v1/card-order-requests/linkable`).
10. **Quantity validation.** `0`, `-5`, `999999` → rejected with a clear field message, no request created. Repeat via `curl` to prove it is server-side.
11. **Concurrent link.** Two admin windows, both on the wizard, both with request R selected. Submit A, then B. B gets a 409 toast *"This order request is no longer available…"*, **B's order is not created**, and the lots B chose are still free.
12. **Logs.** `/admin/logs` filtered to `CHANGE_ORDER_REQUEST_STAT` shows one row per status change from steps 2, 4, 5, 6, 7, 8 — with the correct actor (the distributor's user for a cancel, the admin for everything else).
13. **Cross-distributor isolation.** As distributor B: `/portal/requests` shows only B's. `curl -H "Authorization: Bearer <B>" /api/v1/card-order-requests/<A's id>/cancel` → 404. `curl … /card-order-requests` (the admin list) → 403.
14. **Cancel.** Distributor cancels a `PENDING` request → `CANCELLED`, gone from the admin queue, log row present. Distributor cancels an `APPROVED`-but-unlinked request → also `CANCELLED`, and it disappears from the add-order selector. Cancelling a `PENDING_DELIVERY`+ (already-linked) request → 409.
15. **Reconnect.** Kill the API, confirm the "connection lost" behaviour, restart, confirm both tables re-fetch on reconnect.

---

## 12. Definition of done

- [ ] `npx tsc --noEmit` clean in `Apps/contract`, `Apps/api`, `Apps/web`
- [ ] eslint clean in all three
- [ ] `npx madge --circular src` clean in `Apps/contract` (R13 — the new module must not import `modules/order`)
- [ ] Migration `…_add_card_order_request` created **and** applied; `prisma migrate reset` + all four seed scripts still run
- [ ] The generated migration contains **no `ALTER TABLE "Order"` adding a column** (§1.2)
- [ ] No test file created, modified, deleted or run — verified with `git status`
- [ ] All six propagation rows of §3.1 confirmed **individually** in the report
- [ ] §3.3 SQL desync check returns 0 rows after the manual run
- [ ] No magic strings; every new user-facing string is a translation key with `en`, `fr`, `ar: ""`
- [ ] Report written to `Docs/Stage-04-fix/results/set-4/execution-report.md`
- [ ] **Stop. Do not start Set 5.**
