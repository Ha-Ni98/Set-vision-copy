# Set 4 — Execution Report: Card order requests

**Plan:** `Docs/Stage-04-fix/plan/set-4-plan.md` · **Branch:** `version-02-01` · **Date:** 2026-08-09/10
**Order followed:** prisma → contract → backend → frontend, per plan.

---

## Migration

**Name:** `20260809175434_add_card_order_request`

Created and applied via `npx prisma migrate dev`. Contents: `CREATE TYPE "OrderRequestStat"`, `ALTER TYPE "LogActionType" ADD VALUE 'CHANGE_ORDER_REQUEST_STAT'`, `CREATE TABLE "CardOrderRequest"` with 4 indexes + 1 unique index + 4 FK constraints. **Verified: no `ALTER TABLE "Order"` adding a column** — the plan's D5 requirement (`Order` untouched beyond a virtual Prisma back-reference) holds. No seed script needed updating (no existing model gained a required field).

---

## Status propagation — all six paths confirmed individually

Per the plan's insertion table (§3.1), every `OrderStat`-changing path and the two request-side actions now propagate, each in the **same transaction** as the underlying write:

| # | Path | File:line (post-change) | Confirmed |
|---|---|---|---|
| 1 | `OrderService.create()` — link via `cmd.orderRequestId` | [order.service.ts:126-201](Apps/api/src/modules/order/order.service.ts) | ✅ predicate-guarded `updateMany` claim inside the existing `$transaction`, log + event on success |
| 2 | `transition() → IN_DELIVERY` | [order.service.ts](Apps/api/src/modules/order/order.service.ts) | ✅ **this path had no transaction before** — wrapped in `$transaction` so propagation joins atomically, exactly as the plan flagged as the one structural change to an existing path |
| 3 | `transition() → DELIVERED` | same file | ✅ `propagateOrderStatToRequest` appended as the last statement in the existing transaction |
| 4 | `transition() → RETURNED` | same file | ✅ same pattern |
| 5 | `delete()` — unlink before hard delete | same file | ✅ `unlinkRequestFromOrder(tx, id, actorId)` runs **before** `tx.order.delete`, so `onDelete: SetNull` never fires ahead of the request update |
| 6 | `CardOrderRequestService.unlink()` — explicit admin unlink | [card-order-request.service.ts](Apps/api/src/modules/card-order-request/card-order-request.service.ts) | ✅ own transaction, `PENDING_DELIVERY`-only guard, reverts to `APPROVED` |

Verification query from the plan (`SELECT ... WHERE r.stat::text <> o."orderStat"::text` must return 0 rows) is included in manual test 5 below.

---

## Files created / modified

### `Apps/api` (prisma)
- **Modified:** `prisma/schema.prisma` — `OrderRequestStat` enum, `CardOrderRequest` model, `LogActionType += CHANGE_ORDER_REQUEST_STAT`, virtual back-references on `Order`/`Distributor`/`SubscriptionPlan`/`User`.
- **New:** `prisma/migrations/20260809175434_add_card_order_request/`

### `Apps/contract`
- **New module** `src/modules/card-order-request/`: `card-order-request.enums.ts`, `.routes.ts`, `.command.ts`, `.query.ts`, `.dtos.ts`, `.events.ts`, `index.ts`
- **Modified:** `src/index.ts` (barrel export), `src/modules/log/log.enums.ts` (`+CHANGE_ORDER_REQUEST_STAT`), `src/modules/order/order.command.ts` (`+orderRequestId` on `CreateOrderSchema`)

### `Apps/api` (backend)
- **New module** `src/modules/card-order-request/`: `card-order-request.mapper.ts`, `.interface.ts`, `.service.ts` (also exports `propagateOrderStatToRequest` / `unlinkRequestFromOrder`), `.controller.ts`, `.routes.ts` — **5 files**, matching the existing `order` module's shape (no module in this repo has an `index.ts`; per plan Q1, mirrored rather than "fixed").
- **Modified:**
  - `src/modules/index.ts` — router wiring
  - `src/modules/order/order.interface.ts`, `.controller.ts`, `.service.ts` — `actorId` threaded through `create`/`transition`/`delete`; propagation calls inserted per the table above
  - `src/modules/subscription-plan/subscription-plan.routes.ts` — `GET_ALL` widened to `[ADMIN, DISTRIBUTOR]` (plan Q7, confirmed by user)
  - `src/common/events/event-bus.ts` — `AppEvents` widened with `CardOrderRequestEvents`
  - `src/common/realtime/socket.types.ts`, `realtime-gateway.ts` — two new events registered, routed to `/admin` (`ADMIN_BELL`) and `/distributors` (`rooms.distributor(id)`)

### `Apps/web`
- **New:** `src/services/card-order-requests.service.ts`, `src/hooks/useCardOrderRequests.ts`, `src/pages/distributor/RequestsPage.tsx` + `components/{SubmitOrderRequestModal.tsx, submit-order-request.schema.ts, MyOrderRequestsTable.tsx}`, `src/pages/admin/distributors/OrderRequestsPage.tsx` + `components/{OrderRequestsFilters.tsx, OrderRequestsTable.tsx, ReviewOrderRequestModal.tsx, review-order-request.schema.ts}`
- **Modified:** `src/lib/query-keys.ts` (+`cardOrderRequests` family), `src/lib/realtime.ts` (admin + distributor listeners, local `ServerToClientEvents` widened), `src/components/shared/StatusBadge.tsx` (+`OrderRequestStatusBadge`, `LOG_ACTION_TONE` entry), `src/config/nav-links.ts`, `src/App.tsx` (2 routes, static-before-`:id` precedence preserved), `src/config/translations.json` (~65 keys, `en`/`fr`/`ar:""`), and the add-order wizard: `CreateOrderModal.tsx`, `StepSelectDistributor.tsx` (selector UI), `StepConfirmSummary.tsx` (summary line), `create-order.schema.ts` (`+orderRequestId`)

---

## Decisions applied (per user)

- **Q3 — overridden:** cancel is legal from `PENDING` **or** `APPROVED` (not `PENDING`-only as originally recommended); illegal once linked (`PENDING_DELIVERY`+).
- Q1, Q2, Q4–Q9: recommendation followed as-is (5-file backend module; invalidation+toast for the bell; unlink `PENDING_DELIVERY`-only; decisions-only logging; no shared `writeLog` helper; `SUBSCRIPTION_PLAN_ROUTES.GET_ALL` widened; no lot pre-selection; `/portal/requests` route).

---

## Definition-of-done checks

| Check | Result |
|---|---|
| `tsc --noEmit` — contract | ✅ clean |
| `tsc --noEmit` — api | ✅ clean (production code); frozen test files show expected signature-drift errors from `create`/`transition`/`delete` gaining `actorId` — not modified, per CLAUDE.md |
| `tsc --noEmit` — web (both configs) | ✅ clean (production code); one frozen-test error (`formatTime` export, pre-existing from Set 2/3, confirmed via `git log`) |
| `eslint` — contract | ✅ clean |
| `eslint` — api | no tooling installed (pre-existing gap, flagged in Set 1's report) |
| `eslint` — web | 117 problems total, **identical file list** to the pre-Set-4 baseline (`StatsRow.tsx`, `WhoWeAre.tsx`, `Logo.tsx`, `wilaya-geometry.ts`, one frozen test, etc.) — zero new issues, verified by diffing the file list |
| `madge --circular` — contract | ✅ clean |
| `madge --circular` — api (informational) | ✅ clean |
| Migration applied | ✅ `20260809175434_add_card_order_request` |
| Test files touched | ✅ none — verified via `git status` |

---

## Open questions carried forward

None blocking. Two items for a later set:
- **Notification feed/badge** on the admin bell (currently invalidation + toast only) — a Set 6-shaped enhancement, per plan §0.4.
- The five-file vs. six-file backend module discrepancy (Q1) is repo-wide, not specific to this set — worth a dedicated cleanup pass if the convention should be enforced.

---

## Manual test checklist

1. **Submit → admin sees it live.** Distributor: `/portal/requests` → New request → plan + quantity 50 + note → Submit. Admin's `/admin/distributors/order-requests` gains the row and a toast fires, without a reload.
2. **Approve with a note → distributor updates live.** Admin approves with `adminNote` = "OK, shipping Thursday". Distributor's history flips `PENDING → APPROVED` with the note, live.
3. **Selector lists it; creating the order links it.** Admin: Orders → New order → pick the distributor → the request appears in the selector on step 1 → select it → finish the wizard. Request becomes `PENDING_DELIVERY`; the admin table shows the linked order number.
4. **`IN_DELIVERY` → request mirrors.** Move the order to `IN_DELIVERY`. Request shows `IN_DELIVERY` (propagation path 2 — the one that had no transaction before).
5. **`DELIVERED`/`RETURNED` mirror too.** Repeat to `DELIVERED` on one request and `RETURNED` on a second. Then run:
   ```sql
   SELECT r.id, r.stat, o."orderStat"
   FROM "CardOrderRequest" r JOIN "Order" o ON o.id = r."orderId"
   WHERE r.stat::text <> o."orderStat"::text;   -- must return 0 rows
   ```
6. **Unlink → back to `APPROVED` and back in the selector.** On a `PENDING_DELIVERY` request, Unlink. Status returns to `APPROVED`, note/reviewer survive, reappears in the add-order selector.
7. **Delete the order → same effect.** Link a request, delete the order (allowed only from `PENDING_DELIVERY`). Request returns to `APPROVED`, `orderId` null, no orphan.
8. **A rejected request never appears in the selector.** Reject one; confirm absence from `/linkable` in the UI **and** via `curl`.
9. **Quantity validation.** `0`, `-5`, `999999` → rejected with a field message; repeat via `curl` to prove server-side enforcement.
10. **Concurrent link.** Two admin windows both select request R; submit A then B. B gets a 409 toast, **B's order is not created**, B's chosen lots stay free.
11. **Logs.** `/admin/logs` filtered to `CHANGE_ORDER_REQUEST_STAT` shows one row per status change with the correct actor (distributor's user for cancel, admin otherwise).
12. **Cross-distributor isolation.** Distributor B sees only B's requests; `curl` cancel on A's request as B → 404; `curl` the admin list as B → 403.
13. **Cancel.** `PENDING` and `APPROVED`(-unlinked) both cancel successfully to `CANCELLED`; a `PENDING_DELIVERY`+ (linked) request rejects cancel with 409.
14. **Reconnect.** Kill/restart the API; both tables re-fetch on reconnect.
