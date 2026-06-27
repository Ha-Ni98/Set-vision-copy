# Module Specification: Log

## 1. Context [CONTRACT]
- Prisma Entity: `Log`
- Depends on: User (resolve actor name); `common` (`ApiResponse`, `ErrorCode`, `paginated`)
- Consumed by: every writing module — they call this module's internal `createLog` writer inside their own transactions (backend DI, not an HTTP route).

## 2. API Interface [CONTRACT]
`LOG_ROUTES` (`BASE: '/logs'`). Read-only HTTP surface; the trail is immutable (no create/update/delete routes — log rows are written internally).

- Route Constant: `LOG_ROUTES.GET_ALL` (GET `/logs`)
  - Access: Admin
  - Input (query/params): `GetLogsQuery` { page?, limit?, userId?, actionType?, dateFrom?, dateTo?, search? }
  - Output: `LogDTO[]` (paginated)

`LogDTO` = { id, actionType (`LogActionType`), actionDescription, userName (resolved actor), createdAt }.

(No `command.ts` — writes are internal; no `events.ts`.)

## 3. Events [CONTRACT]
(none — logging is performed by direct, inline calls from other modules, not via the event bus)

## 4. Business Logic (Service) [BACKEND]
- **getAll:** require admin → query `Log` join `User` → filters (`userId`, `actionType`, `dateFrom`/`dateTo`, `search` over `actionDescription`) → order `createdAt` desc → paginate → resolve `userName` → map.
- **createLog (internal, not a route):** `createLog(actionType, actionDescription, userId)` inserts a `Log` row. Called by other services **within the same transaction** as the audited action so the log can't drift from the action. The action types written are exactly those in `LogActionType` (the writer is only invoked by operations that have a matching type).

## 5. Data Mapping [BACKEND]
- **toDTO:** resolve `userName` from the actor's profile (`Admin`/`Activator` `fullName`, falling back to `User.username`); pass `actionType`; `createdAt` → ISO.
- **toPersistence:** trim `actionDescription`.

## 6. Technical Constraints [BACKEND]
- Append-only / immutable: no update or delete surface. Logged actions are bounded to the `LogActionType` enum — operations without a matching type (set/lot/order creation & state transitions, order/distributor/card-disable, etc.) write **no** log. `createLog` runs inside the caller's transaction for atomicity. Results ordered newest-first. All dates ISO 8601.

## 7. Test Scenarios [BACKEND]
- 200 — list ordered newest-first with `userName` resolved; each filter (`userId`, `actionType`, date range, `search`) narrows correctly; 403 for a non-admin principal.
- Conformance — every `LogDTO` parses against the contract schema; `actionType` is always a valid `LogActionType`.
- (Writer integration is exercised through the modules that call `createLog` — e.g. a `SET_PAYMENT` row appears after a payment is recorded.)
