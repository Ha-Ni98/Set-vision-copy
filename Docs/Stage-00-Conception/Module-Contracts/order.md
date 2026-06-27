# Module Specification: Order

## 1. Context [CONTRACT]
- Prisma Entity: `Order`, `OrderLot` (join). Many-to-many with `Lot`.
- Depends on: Lot (available lots + drives lot-state cascades); Card (backend — card-state cascades on delivery); Distributor (resolved name + `nbOfActiveCards` counter); Geography (wilaya/commune validation + resolved names); DeliveryCompany (active list + resolved name); `common` (`ApiResponse`, `ErrorCode`, `paginated`)
- Scope note: the Orders page stat cards come from the **Statistics** module; "View" opens a detail drawer fed by `GET_BY_ID` (no separate route). The distributor-detail "compact orders" list reuses `GET_ALL` filtered by `distributorId`.

## 2. API Interface [CONTRACT]
`ORDER_ROUTES` (`BASE: '/orders'`). All routes Admin-only.

- Route Constant: `ORDER_ROUTES.GET_ALL` (GET `/orders`)
  - Access: Admin
  - Input (query/params): `GetOrdersQuery` { page?, limit?, search?, distributorId?, wilayaId?, deliveryCompanyId?, state?, dateFrom?, dateTo? }
  - Output: `OrderDTO[]` (paginated)

- Route Constant: `ORDER_ROUTES.GET_BY_ID` (GET `/orders/:id`)
  - Access: Admin
  - Input (query/params): `OrderIdParams` { id }
  - Output: `OrderDetailDTO`

- Route Constant: `ORDER_ROUTES.CREATE` (POST `/orders`)
  - Access: Admin
  - Input (body): `CreateOrderCommand` { distributorId, lotIds, receivedName, receivedPhone, wilayaId, communeId, deliveryCompanyId, deliveryType, orderPrice, deliverPrice }
  - Output: `OrderDTO`

- Route Constant: `ORDER_ROUTES.TRANSITION` (POST `/orders/:id/transition`)
  - Access: Admin
  - Input (body): `TransitionOrderCommand` { to, deliveredCount? } — `to ∈ {IN_DELIVERY, DELIVERED, RETURNED}`; `deliveredCount` recorded only on `DELIVERED`
  - Input (query/params): `OrderIdParams`
  - Output: `OrderDTO`

- Route Constant: `ORDER_ROUTES.DELETE` (DELETE `/orders/:id`)
  - Access: Admin
  - Input (query/params): `OrderIdParams`
  - Output: none

DTOs:
- `OrderDTO` = { id, orderNumber, distributorId, distributorName, receivedName, receivedPhone, wilayaId, wilayaName, communeId, communeName, deliveryCompanyId, deliveryCompanyName, deliveryType, lotNumbers (string[]), cardsCount (aggregate), orderPrice, deliverPrice, cardsDeliveredCount, orderStat, createdAt, completedAt }.
- `OrderDetailDTO` = `OrderDTO` + { lots: { lotId, lotNumber, subscriptionLabel, cardsCount, lotStat }[] }.

## 3. Events [CONTRACT]
(none)

## 4. Business Logic (Service) [BACKEND]
- **getAll:** require admin → query `Order` join distributor/wilaya/commune/deliveryCompany + `orderLots`→`lots` → filters (`search` over orderNumber/receiver/distributor; `distributorId`, `wilayaId`, `deliveryCompanyId`, `state`, `dateFrom`/`dateTo`) → paginate → map with resolved names, `lotNumbers[]`, aggregate `cardsCount`.
- **getById:** load with per-lot breakdown or `RESOURCE_NOT_FOUND` → `OrderDetailDTO`.
- **create:** validate distributor exists and is enabled; `lotIds` non-empty; **every lot is `PENDING` or `RETURNED`** (else `RESOURCE_CONFLICT`); `communeId ∈ wilayaId` (else `VALIDATION_ERROR`); delivery company active → generate `orderNumber` → **transaction** { create `Order` (`PENDING_DELIVERY`) → create `OrderLot` rows → set each selected lot `lotStat=IN_DELIVERY` } → `cardsCount` = sum of the lots' `nbOfCards` → return.
- **transition:** load or `RESOURCE_NOT_FOUND` → validate + apply:
  - `PENDING_DELIVERY→IN_DELIVERY`: set `orderStat=IN_DELIVERY` (lots are already `IN_DELIVERY` from creation).
  - `IN_DELIVERY→DELIVERED`: **transaction** { `orderStat=DELIVERED`, `completedAt=now`, `cardsDeliveredCount = deliveredCount ?? total`; the order's lots `→DELIVERED` (`deliveryDate=now`); **all** cards of those lots `→AT_DISTRIBUTOR`, `isActive=true`, `distributorId=order.distributorId`; bump `distributor.nbOfActiveCards` }.
  - `IN_DELIVERY→RETURNED`: **transaction** { `orderStat=RETURNED`, `completedAt=now`; the order's lots `→RETURNED`, `isReturned=true`; cards stay `IN_LOT` (lots re-assignable) }.
  - anything else → `RESOURCE_CONFLICT`.
- **delete:** load → guard `orderStat = PENDING_DELIVERY` (else `RESOURCE_CONFLICT`) → **transaction** { each lot reverts to its prior state (`PENDING`, or `RETURNED` if `lot.isReturned`) → delete the `OrderLot` rows → delete the `Order` }.

## 5. Data Mapping [BACKEND]
- **toDTO:** resolve distributor/wilaya/commune/deliveryCompany names while keeping their ids (for edit selects); `lotNumbers[]` + aggregate `cardsCount` from the joined lots; `Decimal` prices → number (2 dp); `createdAt`/`completedAt` → ISO. No sensitive fields.
- **toPersistence:** auto-generate `orderNumber`; `orderPrice`/`deliverPrice` as `Decimal`.

## 6. Technical Constraints [BACKEND]
- Orders are many-to-many with lots via `OrderLot`; an order is created only from `PENDING`/`RETURNED` lots, which move to `IN_DELIVERY` at creation and stay frozen until the order moves. On `DELIVERED`, **all** the order's cards become `AT_DISTRIBUTOR` + `isActive=true` (the `deliveredCount` is recorded informationally, not a partial-activation switch); on `RETURNED`, cards remain `IN_LOT`. Delete is `PENDING_DELIVERY`-only and reverts lots. `communeId` must belong to `wilayaId`. **Order create / transition / delete write no `Log`** — there is no matching `LogActionType`. All money `Decimal(12,2)`; all dates ISO 8601.

## 7. Test Scenarios [BACKEND]
- 201/200 — create from a mix of `PENDING` + `RETURNED` lots sets the order `PENDING_DELIVERY` and those lots `IN_DELIVERY`; 409 if any lot is `IN_DELIVERY`/`DELIVERED`; 400 if `communeId` not in `wilayaId`; 403 non-admin.
- 200 — `PENDING_DELIVERY→IN_DELIVERY`.
- 200 — `→DELIVERED` moves all cards to `AT_DISTRIBUTOR` + `isActive=true`, lots `→DELIVERED`, bumps the distributor's `nbOfActiveCards`, records `cardsDeliveredCount`.
- 200 — `→RETURNED` sets lots `RETURNED`/`isReturned=true` with cards still `IN_LOT`.
- 409 `RESOURCE_CONFLICT` — illegal transition (e.g. `PENDING_DELIVERY→DELIVERED`).
- 200 — delete a `PENDING_DELIVERY` order reverts its lots to `PENDING`/`RETURNED`; 409 — deleting a non-`PENDING_DELIVERY` order.
- 404 `RESOURCE_NOT_FOUND` — unknown id on get/transition/delete.
