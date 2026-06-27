# Module Specification: Payment

## 1. Context [CONTRACT]
- Prisma Entity: `Payment` (writes `Activator.credits`)
- Depends on: Activator (balance `credits`); Admin (the recording actor); `common` (`ApiResponse`, `ErrorCode`, `paginated`); Log (backend — inline audit)
- Consumed by: the Activator detail page (`totalPaid` sum, payment history); Statistics.

## 2. API Interface [CONTRACT]
`PAYMENT_ROUTES` (`BASE: '/payments'`). All routes Admin-only.

- Route Constant: `PAYMENT_ROUTES.GET_ALL` (GET `/payments`)
  - Access: Admin
  - Input (query/params): `GetPaymentsQuery` { activatorId?, includeDeleted?, page?, limit? }
  - Output: `PaymentDTO[]` (paginated)

- Route Constant: `PAYMENT_ROUTES.CREATE` (POST `/payments`)
  - Access: Admin
  - Input (body): `RecordPaymentCommand` { activatorId, amount, date? }
  - Output: `PaymentDTO`

- Route Constant: `PAYMENT_ROUTES.DELETE` (DELETE `/payments/:id`)
  - Access: Admin
  - Input (query/params): `PaymentIdParams` { id }
  - Output: none

`PaymentDTO` = { id, activatorId, amount, previousCredits, paymentDate, recordedByName (resolved), isDeleted }.

## 3. Events [CONTRACT]
(none — audit logging is inline; see [BACKEND])

## 4. Business Logic (Service) [BACKEND]
- **getAll:** require admin → query `Payment` join `Admin` (recorder) → filter by `activatorId` when present; exclude `isDeleted` unless `includeDeleted=true` → order `paymentDate` desc → paginate → resolve `recordedByName` → map.
- **create:** load the activator or `RESOURCE_NOT_FOUND` → validate `amount > 0` (`VALIDATION_ERROR`) and `amount ≤ activator.credits` (`RESOURCE_CONFLICT` — can't pay more than owed; relaxable) → snapshot `previousCredits = activator.credits` → **transaction** { create `Payment`(adminId=caller, activatorId, `totalAmount=amount`, `previousCredits`, `paymentDate = date ?? now`) → decrement `activator.credits` by `amount` } → write `Log` `SET_PAYMENT` → return.
- **delete:** load or `RESOURCE_NOT_FOUND` → if already `isDeleted` → `RESOURCE_CONFLICT` → **transaction** { set `isDeleted=true`, `deletedDate=now` → restore `activator.credits += amount` (reverse the payment) } → write `Log` `DELETE_PAYMENT` → return.

## 5. Data Mapping [BACKEND]
- **toDTO:** resolve `recordedByName` from the recording `Admin`; `amount`/`previousCredits` `Decimal` → number (2 dp); `paymentDate` → ISO; pass `isDeleted`.
- **toPersistence:** `amount` as `Decimal`; snapshot `previousCredits` at creation time; `paymentDate` from input or now.

## 6. Technical Constraints [BACKEND]
- `amount > 0`; by default a payment cannot exceed the current owed `credits` (relaxable to allow advances). Soft delete via `isDeleted`/`deletedDate`; deletion **reverses** the credit movement. `SET_PAYMENT` and `DELETE_PAYMENT` are both logged. The recording actor is the authenticated admin. All money `Decimal(12,2)`; all dates ISO 8601.

## 7. Test Scenarios [BACKEND]
- 201/200 — create snapshots `previousCredits`, decrements the activator's `credits`, logs `SET_PAYMENT`; 400 for `amount ≤ 0`; 409 for `amount > credits` (default); 404 for an unknown activator; 403 non-admin.
- 200 — list excludes deleted by default; `includeDeleted=true` shows them; `activatorId` filter narrows correctly.
- 200 — delete soft-deletes, restores `credits`, logs `DELETE_PAYMENT`; 409 deleting an already-deleted payment; 404 unknown id.
