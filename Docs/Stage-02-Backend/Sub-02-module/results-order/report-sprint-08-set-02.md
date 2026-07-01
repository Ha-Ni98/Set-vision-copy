# Sprint 8 Report — Order Logic (service)

**Status:** ✅ Done  
**Sprint:** 8 of 16  
**Module:** Order  
**Layer:** Logic

---

## Deliverables

| File | Description |
|------|-------------|
| `Apps/api/src/modules/order/order.service.ts` | `OrderService implements IOrderService` — getAll / getById / create / transition / delete |
| `Apps/api/test/unit/modules/order/order.service.spec.ts` | 17 unit tests (mock Prisma) |

---

## Service design

### `getAll`
- Joins: distributor/wilaya/commune/deliveryCompany + orderLots→lot (lotNumber+nbOfCards selected)
- Filters: `search` (OR on orderNumber/receivedName/distributor.storeName), `distributorId`, `wilayaId`, `deliveryCompanyId`, `state`, `dateFrom`/`dateTo` (createdAt range)
- Paginate with `buildPaginationMeta` + `toSkipTake`
- Private `extractJoins` builds `OrderJoins` from any include shape

### `getById`
- Include orderLots→lot→subscriptionPlan (full join)
- Builds `LotBreakdown[]` with Prisma→contract enum cast (`as unknown as SubscriptionType`)
- Returns `OrderDetailDTO`

### `create`
Validations (in order):
1. Distributor exists + isEnabled → NotFoundError / BadRequestError
2. DeliveryCompany exists + isActive → BadRequestError
3. Commune.wilayaId === cmd.wilayaId → BadRequestError
4. All lots found + each is PENDING|RETURNED → ConflictError
5. Unique `orderNumber`

Transaction: `Order(PENDING_DELIVERY)` → `OrderLot` rows → lots `→IN_DELIVERY`.  
After transaction: `loadOrderDTO` reloads with joins.

### `transition`
`ALLOWED_TRANSITIONS` map: `PENDING_DELIVERY → [IN_DELIVERY]`, `IN_DELIVERY → [DELIVERED, RETURNED]`.
- `→IN_DELIVERY`: single `order.update` (no transaction needed — lots are already IN_DELIVERY from create)
- `→DELIVERED`: `$transaction` { order DELIVERED + completedAt + `cardsDeliveredCount = deliveredCount ?? totalCards`; lots DELIVERED + deliveryDate; cards `→AT_DISTRIBUTOR` + isActive=true + distributorId; `distributor.nbOfActiveCards += result.count` }
- `→RETURNED`: `$transaction` { order RETURNED + completedAt; lots `→RETURNED` + `isReturned=true`; cards unchanged }

### `delete`
- Guard `orderStat=PENDING_DELIVERY`
- Load orderLots + `lot.isReturned` to know revert target
- `$transaction`: lots with `isReturned=true` → RETURNED; others → PENDING; `order.delete` (cascades OrderLot rows)
- **No Log** — Order writes no audit log

---

## Test coverage (17 tests)

### create (7 tests)
- Happy path: PENDING + RETURNED lots → IN_DELIVERY; orderLot rows created; PENDING_DELIVERY orderStat returned
- 409 ConflictError when a lot is IN_DELIVERY
- 409 ConflictError when a lot is DELIVERED
- 400 BadRequestError when commune∉wilaya
- 404 NotFoundError when distributor not found
- 400 BadRequestError when distributor disabled
- No `log.create` call on success

### transition (6 tests)
- PENDING_DELIVERY → IN_DELIVERY: single order.update, no $transaction
- IN_DELIVERY → DELIVERED: cards AT_DISTRIBUTOR + isActive + distributorId; nbOfActiveCards++ by card count
- IN_DELIVERY → DELIVERED: respects `deliveredCount` override in cardsDeliveredCount
- IN_DELIVERY → RETURNED: lots RETURNED + isReturned=true; `card.updateMany` not called
- PENDING_DELIVERY → DELIVERED: 409 ConflictError (illegal skip)
- No `log.create` call

### delete (4 tests)
- Normal lots → PENDING; isReturned lots → RETURNED; `order.delete` called
- 409 ConflictError when order is IN_DELIVERY
- 404 NotFoundError for unknown order
- No `log.create` call

---

## Validation results

```
tsc --noEmit      → clean (no errors)
npm run test:unit → 296/296 tests passed (26 test files)
```

---

## Key implementation notes

- **`extractJoins` structural typing**: accepts both the `getAll` include shape (lot with only lotNumber+nbOfCards via `select`) and the `getById` shape (full Lot via `include`), enabling reuse without duplication.
- **Prisma→contract enum cast**: `subscriptionPlan.subscriptionType as unknown as SubscriptionType` bridges Prisma's `$Enums.SubscriptionType` and the contract's enum without runtime cost.
- **`cardsDeliveredCount`**: defaults to `Σ lot.nbOfCards` when `deliveredCount` is absent from the transition command.
- **No log**: confirmed — `this.prisma.log` is never referenced anywhere in the service.
