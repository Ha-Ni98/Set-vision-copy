# Sprint 6 Report — Order & Card

**Status:** ✅ Complete  
**Date:** 2026-06-28

---

## Files created

**order (5 files + barrel):**

| File | Description |
|------|-------------|
| `order.enums.ts` | `OrderStat` (4 values), `DeliveryType` (3 values) — verbatim from `schema.prisma` |
| `order.routes.ts` | `ORDER_ROUTES` — 5 routes: `GET_ALL`, `GET_BY_ID`, `CREATE`, `TRANSITION`, `DELETE` |
| `order.command.ts` | `CreateOrderCommand` (10 fields incl. `lotIds: array(uuid).nonempty()`, `orderPrice`/`deliverPrice` with `.multipleOf(0.01)`), `TransitionOrderCommand` (`to` narrowed to `[IN_DELIVERY, DELIVERED, RETURNED]`, `deliveredCount?: int.nonnegative()`) |
| `order.query.ts` | `GetOrdersQuerySchema` (9 filters incl. `dateFrom`/`dateTo` as `iso.datetime`), `OrderIdParamsSchema` |
| `order.dtos.ts` | `OrderDTO` (21 fields, `lotNumbers: string[]`, `orderStat: OrderStat`, `completedAt` nullable), `OrderDetailDTO` via `.extend({ lots: [...] })` — **first cross-module enum import**: `LotStat` from `../lot/lot.enums`, `PaginatedOrders` |
| `index.ts` | Module barrel |

**card (4 files + barrel — no `command.ts`):**

| File | Description |
|------|-------------|
| `card.enums.ts` | `CardStat` (7 values verbatim from `schema.prisma`), `CardFlag` (`disabled`, `revoked` — contract-only, lowercase values) |
| `card.routes.ts` | `CARD_ROUTES` — 7 routes: `GET_ALL`, `GET_AVAILABLE_FOR_LOT`, `GET_BY_ID`, `DELETE`, `DISABLE`, `ENABLE`, `REVOKE` |
| `card.query.ts` | `GetCardsQuerySchema` (9 filters incl. `flag?: CardFlag`, `state?: CardStat`), `GetAvailableCardsQuerySchema` (`subscriptionPlanId: uuid` required), `CardIdParamsSchema` |
| `card.dtos.ts` | `CardDTO` (12 fields, `lotNumber`/`distributorName` nullable, `cardStat: CardStat`), `CardDetailDTO` via `.extend({ distributionTimeline: [{stat, at}] })`, `AvailableCardDTO` (3 fields), `PaginatedCards` |
| `index.ts` | Module barrel |

---

## Validation results

- **`tsc --noEmit`** — clean (0 errors)
- **`madge --circular --extensions ts src`** — no circular dependency found (74 files processed)
- **Lint** — clean
- **Schema/type sync** — all types via `z.infer`; cross-module import `LotStat` from `../lot/lot.enums` compiles cleanly
- **Sensitive fields** — none; `card.key` is the printed card key (an identifier, not a secret per `database.md`)
- **No business logic / DB / Express imports** — confirmed
- **Committed on green** — commit `30bdfdc`

---

## Notes

- `order.dtos.ts` imports `LotStat` from `../lot/lot.enums` — the first inter-module enum reference in the contract. The DAG edge `order → lot` is intentional and matches `plan.md Part 2` dependency map.
- `card` has no `command.ts` — all admin card actions (disable, enable, revoke, delete) are path-param only; no request body required.
- `CardFlag` is contract-only (not in Prisma). Lowercase values (`disabled`, `revoked`) match the spec's query-string convention for the `flag` filter.
- `TransitionOrderSchema.to` excludes `PENDING_DELIVERY` — that is the initial state set by the backend on creation; it is never a valid transition target from the API.
- `GetAvailableCardsQuerySchema.subscriptionPlanId` is **required** (no `.optional()`) — the available-for-lot endpoint mandates the plan filter per spec.
