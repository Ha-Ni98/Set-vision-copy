# Module Specification: Lot

## 1. Context [CONTRACT]
- Prisma Entity: `Lot` (groups `Card` rows; joined to `Order` via `OrderLot`)
- Depends on: SubscriptionPlan (resolved label); Card (backend — reads `PRINTED` candidates, cascades card state); `common` (`ApiResponse`, `ErrorCode`, `paginated`); Log (backend — inline audit on delete)
- Scope note: lot **state transitions** (`PENDING → IN_DELIVERY → DELIVERED | RETURNED`) are driven entirely by the **Order** module — this module never changes `lotStat` except the create (→ implicitly `PENDING`) and the delete (→ cards back to `PRINTED`). The "available cards for a lot" candidate list (`PRINTED` cards by plan) is served by the **Card** module; the Lots page stat cards come from **Statistics**; "View Cards" navigates to the Card list filtered by `lotNumber`.

## 2. API Interface [CONTRACT]
`LOT_ROUTES` (`BASE: '/lots'`). All routes Admin-only.

- Route Constant: `LOT_ROUTES.GET_ALL` (GET `/lots`)
  - Access: Admin
  - Input (query/params): `GetLotsQuery` { page?, limit?, search?, subscriptionPlanId?, state? }
  - Output: `LotDTO[]` (paginated)

- Route Constant: `LOT_ROUTES.GET_AVAILABLE_FOR_ORDER` (GET `/lots/available-for-order`)
  - Access: Admin
  - Input (query/params): `GetAvailableLotsQuery` { subscriptionPlanId? }
  - Output: `LotDTO[]` (only lots in `PENDING` or `RETURNED`)

- Route Constant: `LOT_ROUTES.CREATE` (POST `/lots`)
  - Access: Admin
  - Input (body): `CreateLotCommand` { subscriptionPlanId, cardIds }
  - Output: `LotDTO`

- Route Constant: `LOT_ROUTES.DELETE` (DELETE `/lots/:id`)
  - Access: Admin
  - Input (query/params): `LotIdParams` { id }
  - Output: none

`LotDTO` = { id, lotNumber, subscriptionPlanId, subscriptionLabel (resolved), lotStat, nbOfCards, deliveredCardsCount (derived), isReturned, createdAt, deliveryDate }.

## 3. Events [CONTRACT]
(none — audit logging is inline; see [BACKEND])

## 4. Business Logic (Service) [BACKEND]
- **getAll:** require admin → query `Lot` join `SubscriptionPlan` → filters (`search` over `lotNumber`, `subscriptionPlanId`, `state`) → paginate → derive `deliveredCardsCount` (cards of this lot now `AT_DISTRIBUTOR`) → compose label → map.
- **getAvailableForOrder:** lots where `lotStat ∈ {PENDING, RETURNED}`, optional plan filter → map. (Feeds the Order wizard.)
- **create:** validate the plan; validate every `cardId` is `PRINTED`, belongs to that plan, and is not already in a lot (else `VALIDATION_ERROR` / `RESOURCE_CONFLICT`) → generate a unique `lotNumber` → **transaction** { create `Lot` (`PENDING`, `nbOfCards = cardIds.length`) → set those cards `cardStat=IN_LOT`, `lotId=<new lot>` } → return.
- **delete:** load → guard `lotStat = PENDING` (else `RESOURCE_CONFLICT`) → **transaction** { the lot's cards `IN_LOT→PRINTED`, `lotId=null` → delete the lot } → write `Log` `REMOVE_LOT` → return. (A `PENDING` lot has no `OrderLot` rows, so nothing to detach there.)

## 5. Data Mapping [BACKEND]
- **toDTO:** resolve `subscriptionLabel`; `createdAt`/`deliveryDate` → ISO; `deliveredCardsCount` is derived, not stored. No sensitive fields.
- **toPersistence:** auto-generate `lotNumber`; set `nbOfCards` from the selected cards.

## 6. Technical Constraints [BACKEND]
- `lotNumber` auto-generated and unique. Selected cards must all be `PRINTED`, same plan, and unassigned. Lot state changes after creation are owned by the **Order** module; a lot in `IN_DELIVERY` cannot change until its order moves. Delete is `PENDING`-only and is the **only** logged action here (`REMOVE_LOT`); create writes no log. All dates ISO 8601.

## 7. Test Scenarios [BACKEND]
- 201/200 — create puts the chosen cards in `IN_LOT` and the lot in `PENDING`; 400/409 if any card is not `PRINTED`, is from another plan, or is already in a lot; 403 non-admin.
- 200 — `available-for-order` returns only `PENDING`/`RETURNED` lots (optionally plan-filtered).
- 200 — delete a `PENDING` lot returns its cards to `PRINTED` and logs `REMOVE_LOT`.
- 409 `RESOURCE_CONFLICT` — deleting a non-`PENDING` lot.
- 404 `RESOURCE_NOT_FOUND` — unknown id on delete.
