# Module Specification: Distributor

## 1. Context [CONTRACT]
- Prisma Entity: `Distributor` (references `Wilaya`, `Commune`)
- Depends on: Geography (FK validation + resolved wilaya/commune names); `common` (`ApiResponse`, `ErrorCode`, `paginated`); Log (backend only — inline audit)
- Scope note: the distributor-detail page's "compact orders" and "compact cards" lists are served by the **Order** and **Card** modules via their list endpoints filtered with `distributorId` — this module owns the distributor profile and its derived stats only. The distributor-management page's 4 stat cards (totals/in-stock/this-month) are served by the **Statistics** module.

## 2. API Interface [CONTRACT]
`DISTRIBUTOR_ROUTES` (`BASE: '/distributors'`). All routes Admin-only.

- Route Constant: `DISTRIBUTOR_ROUTES.GET_ALL` (GET `/distributors`)
  - Access: Admin
  - Input (query/params): `GetDistributorsQuery` { page?, limit?, search?, wilayaId?, communeId? }
  - Output: `DistributorDTO[]` (paginated)

- Route Constant: `DISTRIBUTOR_ROUTES.CREATE` (POST `/distributors`)
  - Access: Admin
  - Input (body): `CreateDistributorCommand` { fullName, storeName, phone, wilayaId, communeId }
  - Output: `DistributorDTO`

- Route Constant: `DISTRIBUTOR_ROUTES.GET_BY_ID` (GET `/distributors/:id`)
  - Access: Admin
  - Input (query/params): `DistributorIdParams` { id }
  - Output: `DistributorDetailDTO`

- Route Constant: `DISTRIBUTOR_ROUTES.UPDATE` (PATCH `/distributors/:id`)
  - Access: Admin
  - Input (body): `UpdateDistributorCommand` { fullName?, storeName?, phone?, wilayaId?, communeId? }
  - Input (query/params): `DistributorIdParams`
  - Output: `DistributorDTO`

- Route Constant: `DISTRIBUTOR_ROUTES.TOGGLE` (POST `/distributors/:id/toggle`)
  - Access: Admin
  - Input (query/params): `DistributorIdParams`
  - Output: `DistributorDTO`

- Route Constant: `DISTRIBUTOR_ROUTES.DELETE` (DELETE `/distributors/:id`)
  - Access: Admin
  - Input (query/params): `DistributorIdParams`
  - Output: none

DTOs:
- `DistributorDTO` = { id, fullName, storeName, phone, wilayaId, wilayaName, communeId, communeName, isEnabled, nbOfActiveCards, nbOfActivation, deliveredOrdersCount (derived), createdAt }.
- `DistributorDetailDTO` = `DistributorDTO` + { soldKeys (derived: cards `ACTIVATED` for this distributor), ordersCount (derived: total orders) }. (`remainingCards` = `nbOfActiveCards`; `activationsCount` = `nbOfActivation` — already on the base DTO.)

Both DTOs carry the resolved `wilayaName`/`communeName` for display **and** the raw `wilayaId`/`communeId` for the edit-form selects.

## 3. Events [CONTRACT]
(none — audit logging is inline; see [BACKEND])

## 4. Business Logic (Service) [BACKEND]
- **getAll:** require admin → query `Distributor` join `Wilaya`/`Commune` → filters: `search` over fullName/storeName/phone, plus `wilayaId`/`communeId` → exclude soft-deleted → paginate → derive `deliveredOrdersCount` → map with resolved names.
- **create:** validate command → verify `communeId` belongs to `wilayaId` (else `VALIDATION_ERROR`) → create `Distributor` (counters 0, `isEnabled` true) → write `Log` `ADD_DISTRIBUTOR` → return resolved DTO.
- **getById:** load or `RESOURCE_NOT_FOUND` → derive `soldKeys` and `ordersCount` → return `DistributorDetailDTO`.
- **update:** load → if `wilayaId`/`communeId` change, re-validate commune ∈ wilaya → apply fields → write `Log` `CHANGE_DISTRIBUTOR_INFORMATION` → return.
- **toggle:** flip `isEnabled` → write `Log` `CHANGE_DISTRIBUTOR_STAT` → return.
- **delete:** soft-delete (`deletedAt`). Edge: optionally block (`RESOURCE_CONFLICT`) if the distributor still holds active cards or has open orders. (No `REMOVE_DISTRIBUTOR` log type — not logged.)

## 5. Data Mapping [BACKEND]
- **toDTO:** resolve `wilayaName`/`communeName` via the joined rows while keeping the ids; counts are `Int`; `createdAt` → ISO. No sensitive fields. Derived fields (`deliveredOrdersCount`, `soldKeys`, `ordersCount`) are computed, not stored.
- **toPersistence:** trim `fullName`/`storeName`/`phone`; initialize `nbOfActiveCards`/`nbOfActivation` to 0 on create.

## 6. Technical Constraints [BACKEND]
- `communeId` must belong to `wilayaId` (validated on create and on change). `nbOfActiveCards` and `nbOfActivation` are **denormalized counters maintained by the Order/Card/Activation transactions**, not by this module's writes. Soft delete via `deletedAt`. All dates ISO 8601.

## 7. Test Scenarios [BACKEND]
- 200 — list with `search`/`wilayaId`/`communeId` filters (resolved names present); 403 for a non-admin principal.
- 201/200 — create writes `ADD_DISTRIBUTOR`; `VALIDATION_ERROR` when `communeId` doesn't belong to `wilayaId`.
- 200 — detail returns derived `soldKeys`/`ordersCount`; 404 `RESOURCE_NOT_FOUND` for an unknown id.
- 200 — update writes `CHANGE_DISTRIBUTOR_INFORMATION`; commune/wilaya mismatch on update → `VALIDATION_ERROR`.
- 200 — toggle writes `CHANGE_DISTRIBUTOR_STAT`.
- 200 — delete soft-deletes; optional 409 `RESOURCE_CONFLICT` if active cards/open orders exist.
