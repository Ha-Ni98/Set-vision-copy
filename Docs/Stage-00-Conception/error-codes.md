# Error Codes Reference

The single, shared set of error codes for the whole monorepo. The **enum** is a `[CONTRACT]` artifact (`packages/contract/src/common/errors.ts`) consumed by both backend and frontend; the **code → HTTP status** mapping is owned by the backend error handler `[BACKEND]`. Every failed response uses the one envelope:

```
{ success: false, error: { code: ErrorCode, message: string, details?: unknown } }
```

`message` is human-readable; `details` is optional (e.g. field-level validation issues). The frontend switches on `code`, never on `message`.

---

## Codes

| Error Code | HTTP | Description | Typical triggers (from the modules) |
|------------|------|-------------|--------------------------------------|
| `AUTH_INVALID_CREDENTIALS` | **401** | Login failed. Always generic — never reveals which part was wrong. | Unknown username; wrong password; disabled or soft-deleted user at login (Auth). |
| `AUTH_UNAUTHORIZED` | **401** | Not authenticated, or the credential/token is missing, expired, or invalid. | Missing/expired/invalid access JWT on a protected route; invalid, expired, or already-rotated refresh token; a public capability (`activationId`) that doesn't resolve (Auth, Activation client portal). |
| `AUTH_FORBIDDEN` | **403** | Authenticated, but the principal lacks permission for this action. | Non-admin calling an admin-only route; a non-activator hitting `/activators/me/stats` or the activator work-queue routes; an admin trying to delete their own account (Admin, Activator, all admin routes). |
| `VALIDATION_ERROR` | **400** | Input failed schema or business validation. `details` carries the field issues. | Zod body/query parse failure; `communeId` not in `wilayaId` (Distributor, Order); payment `amount ≤ 0` (Payment); bad key format on verify (Activation); plan missing/inactive on set create (Set); empty lot/card selection. |
| `RESOURCE_NOT_FOUND` | **404** | The referenced entity does not exist. | Unknown id on get/update/transition/delete for any entity (Admin, Activator, Distributor, Subscription Plan, Set, Lot, Order, Card, Activation, Payment, Delivery Company); unknown `wilayaId` (Geography, Statistics drilldown); unknown `activationId` on client `status`/`update`/`additional`. |
| `RESOURCE_CONFLICT` | **409** | The request conflicts with current state or a uniqueness rule. | Duplicate username (Admin, Activator); duplicate `(type, duration)` plan (Subscription Plan); illegal state transition (Set, Order, Activation); deleting the last admin (Admin); deleting in a non-deletable state — `PRINTED` set, non-`PENDING` lot, non-`PENDING_DELIVERY` order, non-`IN_SET`/`PRINTED` card (Set, Lot, Order, Card); card already has a live activation (Activation submit); request already taken or activator at the 3-slot limit (Activation take); disable/enable/revoke guards (Card); payment `amount > credits`, or deleting an already-deleted payment (Payment); a lot not `PENDING`/`RETURNED` when added to an order (Order). |
| `RATE_LIMIT_EXCEEDED` | **429** | Too many requests in the window. | Failed-login lockout (5 attempts → 5-minute lockout, Auth); optional key-verification throttle on the public client portal (Activation). |
| `INTERNAL_SERVER_ERROR` | **500** | Unexpected, unhandled failure. The fallback when nothing more specific applies. | Uncaught exceptions, DB/transaction failures, anything not mapped above. |

---

## Enum (`packages/contract/src/common/errors.ts`)

```typescript
export enum ErrorCode {
  // Auth
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS', // 401
  AUTH_UNAUTHORIZED        = 'AUTH_UNAUTHORIZED',        // 401
  AUTH_FORBIDDEN           = 'AUTH_FORBIDDEN',           // 403
  // Validation
  VALIDATION_ERROR         = 'VALIDATION_ERROR',         // 400
  // Resources
  RESOURCE_NOT_FOUND       = 'RESOURCE_NOT_FOUND',       // 404
  RESOURCE_CONFLICT        = 'RESOURCE_CONFLICT',        // 409
  // Throttling
  RATE_LIMIT_EXCEEDED      = 'RATE_LIMIT_EXCEEDED',      // 429
  // System
  INTERNAL_SERVER_ERROR    = 'INTERNAL_SERVER_ERROR',    // 500
}
```

> This adds `RATE_LIMIT_EXCEEDED` to the base set in `contract-rules.md` §4.B, because the Auth login lockout and the public portal throttle return **429**. Everything else matches the base enum.

---

## Conventions

- **401 vs 403:** `AUTH_UNAUTHORIZED` = *not authenticated* (no/!valid token); `AUTH_FORBIDDEN` = *authenticated but not allowed* (wrong role or a self-action guard).
- **Generic auth message:** all three login failure modes return the same `AUTH_INVALID_CREDENTIALS` message — the server never discloses whether the username existed or the account was disabled.
- **Validation details:** `VALIDATION_ERROR` should populate `details` with the offending fields (e.g. the Zod `flatten()` output) so the frontend can map errors to inputs; business-rule validations (commune∈wilaya, amount≤0) reuse the same code with a plain message.
- **Conflict is the state-machine workhorse:** every guarded transition and uniqueness check across the inventory/activation lifecycles surfaces as `RESOURCE_CONFLICT` (409), with the message naming the current state.
- **No leaking internals:** `INTERNAL_SERVER_ERROR` carries a generic message; the real cause is logged server-side, never returned.
- **Mapping ownership:** the table's HTTP column is implemented once in the backend error handler (Stage 2 Sub-01); services throw typed errors carrying an `ErrorCode`, and the handler translates code → status + envelope.
