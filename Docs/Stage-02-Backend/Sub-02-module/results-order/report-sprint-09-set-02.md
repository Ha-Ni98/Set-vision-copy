# Sprint 9 Report — Order API (controller + wiring)

**Status:** ✅ Done  
**Sprint:** 9 of 16  
**Module:** Order  
**Layer:** API

---

## Deliverables

| File | Description |
|------|-------------|
| `Apps/api/src/modules/order/order.controller.ts` | 5 handlers: getAll / getById / create / transition / delete |
| `Apps/api/src/modules/order/order.routes.ts` | Composition root — manual DI, admin-only, validateRequest per segment |
| `Apps/api/src/modules/index.ts` | Added `ORDER_ROUTES.BASE` mount |
| `Apps/api/test/integration/order.integration.spec.ts` | 11 integration tests |
| `Apps/api/test/contract/routes.conformance.spec.ts` | Extended with ORDER_ROUTES (5 tests) + OrderDetailResponseSchema |

---

## Routes

| Constant | Method | Path | Status |
|----------|--------|------|--------|
| `GET_ALL` | GET | `/orders` | admin-only |
| `GET_BY_ID` | GET | `/orders/:id` | admin-only |
| `CREATE` | POST | `/orders` | admin-only, 201 |
| `TRANSITION` | POST | `/orders/:id/transition` | admin-only |
| `DELETE` | DELETE | `/orders/:id` | admin-only, 204 |

---

## Integration test coverage (11 tests)

### POST /orders (3)
- 201: creates from PENDING + RETURNED lots; lots move to IN_DELIVERY
- 409: lot already IN_DELIVERY → RESOURCE_CONFLICT
- 403: activator principal → FORBIDDEN

### GET /orders/:id (2)
- 200: returns OrderDetailDTO with lots breakdown; distributorName resolved
- 404: unknown id

### GET /orders (2)
- 200: returns paginated response with `items` + `meta`
- 403: activator principal

### POST /orders/:id/transition (4)
- 200: PENDING_DELIVERY → IN_DELIVERY
- 200: IN_DELIVERY → DELIVERED — cards AT_DISTRIBUTOR + isActive + distributorId; nbOfActiveCards bumped
- 200: IN_DELIVERY → RETURNED — lots RETURNED + isReturned; cards unchanged
- 409: illegal skip (PENDING_DELIVERY → DELIVERED) → RESOURCE_CONFLICT

### DELETE /orders/:id (3)
- 204: deletes PENDING_DELIVERY order; lots reverted to PENDING
- 409: order not in PENDING_DELIVERY
- 404: unknown id

---

## Conformance additions

- 5 ORDER_ROUTES registration tests (all return 401 without auth, not 404)
- `OrderDetailResponseSchema` shape test

---

## Validation results

```
tsc --noEmit             → clean
npm run test:unit        → 302/302 (26 files)
npm run test:int         → 87/87 (8 files)
```

---

## Implementation notes

- `GET_BY_ID` and `DELETE` share `/:id` by HTTP method — Express handles this correctly since they are registered as separate `.get`/`.delete` calls.
- No `actorId` passed for any Order handler — `IOrderService` takes no actorId (Order writes no Log).
- DELIVERED cascade test seeds a real `Set` row via `seedSet` to satisfy the Card FK constraint on `setId`.
