# Report — Sprint 11 · Payment — Logic (service) · Set 03

**Date:** 2026-07-01
**Status:** ✅ Green & Committed

---

## What was built

`PaymentService` with 3 methods (getAll/create/delete) plus 14 service unit tests.

### Files created

| File | Description |
|------|-------------|
| `Apps/api/src/modules/payment/payment.service.ts` | Full service; Admin resolution by userId; credits debit/reversal in `$transaction`; inline audit |
| `Apps/api/test/unit/modules/payment/payment.service.spec.ts` | 14 unit tests covering all branches |

---

## Key design decisions

- **Admin resolution** — `admin.findFirst({ where: { userId: actorUserId } })` before creating payment; 404 if the principal has no Admin row.
- **Credit guard** — `amount > credits` → `ConflictError` (409); `amount <= 0` → `BadRequestError` (400).
- **`previousCredits` snapshot** — taken from `activator.credits` before the transaction; stored verbatim as a Decimal.
- **`$transaction`** — create Payment + decrement `activator.credits` + `Log SET_PAYMENT` atomically; delete path: set `isDeleted=true`/`deletedDate=now` + increment `activator.credits` + `Log DELETE_PAYMENT`.
- **Double-delete guard** — `payment.isDeleted` checked before transaction; throws `ConflictError` (409).
- **`includeDeleted`** — condition `{ isDeleted: false }` added to AND array only when falsy; omitted when `true` so all records are returned.
- **Optional `paymentDate`** — `cmd.date` applied if present, otherwise DB default (`now()`).

---

## Validation

- `tsc --noEmit` — clean
- `npm run test:unit` — 613/613 passed (includes conformance + 14 new payment service tests)

---

## Constraints respected

- Credits movement (`decrement`/`increment`) and audit log written inside `$transaction`
- `SET_PAYMENT` / `DELETE_PAYMENT` logged with `userId=actorUserId`
- `adminId` resolved from the acting user's `Admin` row (not passed from client)
- `nbOfActivation`/`nbOfSuccessfulActivation` never written by this module
