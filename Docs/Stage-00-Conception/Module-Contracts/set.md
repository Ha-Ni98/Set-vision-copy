# Module Specification: Set

## 1. Context [CONTRACT]
- Prisma Entity: `Set` (owns `Card` rows generated at creation)
- Depends on: SubscriptionPlan (active plan + resolved label); Card (backend — generates cards and cascades their state); `common` (`ApiResponse`, `ErrorCode`, `paginated`); Log (backend — inline audit on delete)
- Scope note: the Sets page's stat cards (totals + state breakdown) come from the **Statistics** module; "View Cards" navigates to the Card module's list filtered by `setNumber`.

## 2. API Interface [CONTRACT]
`SET_ROUTES` (`BASE: '/sets'`). All routes Admin-only.

- Route Constant: `SET_ROUTES.GET_ALL` (GET `/sets`)
  - Access: Admin
  - Input (query/params): `GetSetsQuery` { page?, limit?, search?, subscriptionPlanId?, state? }
  - Output: `SetDTO[]` (paginated)

- Route Constant: `SET_ROUTES.CREATE` (POST `/sets`)
  - Access: Admin
  - Input (body): `CreateSetCommand` { numberOfKeys, subscriptionPlanId }
  - Output: `SetDTO`

- Route Constant: `SET_ROUTES.TRANSITION` (POST `/sets/:id/transition`)
  - Access: Admin
  - Input (body): `TransitionSetCommand` { to } — allowed targets `PENDING_PRINTING`, `PRINTED`
  - Input (query/params): `SetIdParams` { id }
  - Output: `SetDTO`

- Route Constant: `SET_ROUTES.DELETE` (DELETE `/sets/:id`)
  - Access: Admin
  - Input (query/params): `SetIdParams`
  - Output: none

`SetDTO` = { id, setNumber, subscriptionPlanId, subscriptionLabel (resolved), numberOfKeys, setStat, createdAt, printedAt }.

## 3. Events [CONTRACT]
(none — audit logging is inline; see [BACKEND])

## 4. Business Logic (Service) [BACKEND]
- **getAll:** require admin → query `Set` join `SubscriptionPlan` → filters (`search` over `setNumber`, `subscriptionPlanId`, `state`) → paginate → compose label → map.
- **create:** validate the plan exists and is active (`VALIDATION_ERROR` if not) → generate a unique `setNumber` → **transaction** { create `Set` (`NOT_PRINTED`) → batch-generate `numberOfKeys` `Card` rows (`IN_SET`, `isActive=false`, unique `key`, linked to the set + plan) } → return `SetDTO`.
- **transition:** load or `RESOURCE_NOT_FOUND` → validate the move (`NOT_PRINTED→PENDING_PRINTING` or `PENDING_PRINTING→PRINTED`; anything else → `RESOURCE_CONFLICT`) → on `→PRINTED`, **transaction** { set `printedAt=now` → update all the set's cards `IN_SET→PRINTED` } → return.
- **delete:** load → guard `setStat ∈ {NOT_PRINTED, PENDING_PRINTING}` (else `RESOURCE_CONFLICT`) → **transaction** { delete all the set's cards → delete the set } → write `Log` `REMOVE_SET` → return.

## 5. Data Mapping [BACKEND]
- **toDTO:** resolve `subscriptionLabel` from the plan; `createdAt`/`printedAt` → ISO. No sensitive fields.
- **toPersistence:** `numberOfKeys` as positive `Int`; auto-generate `setNumber` and each card `key`.

## 6. Technical Constraints [BACKEND]
- `setNumber` is auto-generated and unique; card `key`s are auto-generated and unique. Card generation and the `→PRINTED` cascade run in **transactions**. Only **active** plans are selectable on create. Delete is restricted by state and is the **only** logged action here (`REMOVE_SET`); create and transition write no log. All dates ISO 8601.

## 7. Test Scenarios [BACKEND]
- 201/200 — create generates exactly `numberOfKeys` cards in `IN_SET`; `setStat=NOT_PRINTED`; 400 if the plan is missing/inactive; 403 for a non-admin.
- 200 — transition `NOT_PRINTED→PENDING_PRINTING`.
- 200 — transition `PENDING_PRINTING→PRINTED` sets `printedAt` and moves all cards `IN_SET→PRINTED`.
- 409 `RESOURCE_CONFLICT` — illegal transition (e.g. anything out of `PRINTED`, or skipping a step).
- 200 — delete a `NOT_PRINTED`/`PENDING_PRINTING` set cascades card deletion and logs `REMOVE_SET`; 409 — deleting a `PRINTED` set.
- 404 `RESOURCE_NOT_FOUND` — unknown id on transition/delete.
