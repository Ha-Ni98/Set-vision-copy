# Sprint 12 Report — Card API (controller + wiring)

**Status:** ✅ Done  
**Sprint:** 12 of 16  
**Module:** Card  
**Layer:** API

---

## Deliverables

| File | Description |
|------|-------------|
| `Apps/api/src/modules/card/card.controller.ts` | 7 handlers; `actorId` for delete/revoke; `204` for delete, `200` for rest |
| `Apps/api/src/modules/card/card.routes.ts` | Composition root — manual DI, admin-only, `validateRequest` per segment |
| `Apps/api/src/modules/index.ts` | Added `CARD_ROUTES.BASE` mount |
| `Apps/api/test/integration/card.integration.spec.ts` | 15 integration tests |
| `Apps/api/test/contract/routes.conformance.spec.ts` | Extended with CARD_ROUTES (7 tests) + `CardDetailResponseSchema` shape test |

---

## Routes

| Constant | Method | Path | Status |
|----------|--------|------|--------|
| `GET_ALL` | GET | `/cards` | admin-only |
| `GET_AVAILABLE_FOR_LOT` | GET | `/cards/available-for-lot` | admin-only |
| `GET_BY_ID` | GET | `/cards/:id` | admin-only |
| `DELETE` | DELETE | `/cards/:id` | admin-only, 204 |
| `DISABLE` | POST | `/cards/:id/disable` | admin-only |
| `ENABLE` | POST | `/cards/:id/enable` | admin-only |
| `REVOKE` | POST | `/cards/:id/revoke` | admin-only |

`GET_AVAILABLE_FOR_LOT` registered **before** `GET_BY_ID` to prevent Express from matching `'available-for-lot'` as the `:id` param.

---

## Integration test coverage (15 tests)

### GET /cards (3)
- 200: returns paginated list to admin; seeded card appears in results
- 200: `flag=disabled` returns only disabled cards; non-disabled card excluded
- 403: activator principal → `AUTH_FORBIDDEN`

### GET /cards/available-for-lot (2)
- 200: returns only `PRINTED`, unassigned, non-disabled cards for given `subscriptionPlanId` (1 of 3)
- 200: static-before-param verification — `available-for-lot` resolves to the correct handler, not `/:id`

### GET /cards/:id (2)
- 200: returns `CardDetailDTO` that parses `CardDetailResponseSchema`; timeline starts with `IN_SET`
- 404: unknown id → `RESOURCE_NOT_FOUND`

### DELETE /cards/:id (3)
- 204: soft-deletes `IN_SET` card; `deletedAt` set in DB, row preserved
- 204: soft-deletes `PRINTED` card
- 409: `IN_LOT` card → `RESOURCE_CONFLICT`

### POST /cards/:id/disable (2)
- 200: `AT_DISTRIBUTOR` card → `isDisabled=true, isActive=false`; `distributor.nbOfActiveCards` decremented
- 409: already disabled → `RESOURCE_CONFLICT`

### POST /cards/:id/enable (2)
- 200: disabled card → `isDisabled=false, isActive=true, cardStat=AT_DISTRIBUTOR`; `nbOfActiveCards` incremented
- 409: not disabled → `RESOURCE_CONFLICT`

### POST /cards/:id/revoke (2)
- 200: `ACTIVATION_FAILED` → `isRevoked=true, cardStat=AT_DISTRIBUTOR`; `nbOfActiveCards` incremented
- 409: `AT_DISTRIBUTOR` card → `RESOURCE_CONFLICT`

---

## Conformance additions

- 7 `CARD_ROUTES` registration tests (all return 401 without auth)
- `CardDetailResponseSchema` shape test

---

## Implementation notes

- Log cleanup (`prisma.log.deleteMany`) required before user deletion in `afterEach` — `delete` and `revoke` create Log rows referencing the actor's `userId`, causing FK violation if users are deleted first.
- Pre-existing admin integration test failure (`409 — last enabled admin`) is unrelated to this sprint.

---

## Validation results

```
tsc --noEmit             → clean
npm run test:unit        → 350/350 (28 files)
npm run test:int         → 102/103 (pre-existing admin failure, not regressed)
```
