# Module Specification: Activation

## 1. Context [CONTRACT]
- Prisma Entity: `Activation`, `ActivationInformation`, `ActivationStep`, `WrongInformation`, `AdditionalInformation` (and writes `Card.cardStat`, `Activator` counters/earnings, `Distributor` counters)
- Depends on: Card (lookup + `cardStat` cascade); SubscriptionPlan + `SubscriptionPlanCommission` + `CommissionDuration` (price at completion); Activator (counters, earnings, balance); Distributor (counters); `common` (`ApiResponse`, `ErrorCode`, `paginated`); Log (backend — inline audit on price override)
- Consumed by: Statistics; the Activator dashboard (slot/stat counts).
- Two route groups in `activation.routes.ts`: **`KEY_ROUTES`** (`BASE: '/keys'`, public client portal) and **`ACTIVATION_ROUTES`** (`BASE: '/activations'`, activator + admin). Both exported from the module barrel.
- Contract enum owned here: **`ClientActivationStatus`** — the resolved client-facing status (the public portal never sees raw `ActivationStat`): `INVALID`, `READY`, `SUBMITTED`, `PROCESSING`, `NEEDS_CORRECTION`, `NEEDS_OTP`, `UNDER_REVIEW`, `ACTIVATED`, `FAILED`.

## 2. API Interface [CONTRACT]

### Public — client portal (`KEY_ROUTES`, `BASE: '/keys'`)

- Route Constant: `KEY_ROUTES.VERIFY` (POST `/keys/verify`)
  - Access: Public
  - Input (body): `VerifyKeyCommand` { key }
  - Output: `KeyVerificationDTO` { status (`ClientActivationStatus`), subscriptionLabel?, planKey?, activationId?, submittedFields?, flaggedFields?, requestedFields?, accountUsername? }

- Route Constant: `KEY_ROUTES.SUBMIT` (POST `/keys/submit`)
  - Access: Public
  - Input (body): `SubmitActivationCommand` { key, fullName, phone, accountFields }
  - Output: `ClientActivationStatusDTO` { activationId, status }

- Route Constant: `KEY_ROUTES.UPDATE` (PUT `/keys/:activationId/update`)
  - Access: Public (the `activationId` UUID is the bearer capability)
  - Input (body): `UpdateActivationCommand` { accountFields }
  - Input (query/params): `ActivationIdParams` { activationId }
  - Output: `ClientActivationStatusDTO`

- Route Constant: `KEY_ROUTES.ADDITIONAL` (POST `/keys/:activationId/additional`)
  - Access: Public (capability via `activationId`)
  - Input (body): `SubmitAdditionalInfoCommand` { accountFields }
  - Input (query/params): `ActivationIdParams`
  - Output: `ClientActivationStatusDTO`

- Route Constant: `KEY_ROUTES.STATUS` (GET `/keys/:activationId/status`)
  - Access: Public (capability via `activationId`; polling fallback for the socket)
  - Input (query/params): `ActivationIdParams`
  - Output: `ClientActivationStatusDTO`

### Activator (`ACTIVATION_ROUTES`, activator principal)

- Route Constant: `ACTIVATION_ROUTES.GET_PENDING` (GET `/activations/pending`)
  - Access: Authenticated (activator)
  - Output: `PendingActivationDTO[]` { id, subscriptionLabel, keyMasked, requestedAt }

- Route Constant: `ACTIVATION_ROUTES.GET_ACTIVE` (GET `/activations/active`)
  - Access: Authenticated (activator)
  - Output: `ActiveRequestDTO[]` (the caller's own 0–3 in-progress requests)

- Route Constant: `ACTIVATION_ROUTES.TAKE` (POST `/activations/:id/take`)
  - Access: Authenticated (activator)
  - Input (query/params): `ActivationIdParams` { id }
  - Output: `ActiveRequestDTO` (or 409 if already taken / slots full)

- Route Constant: `ACTIVATION_ROUTES.FLAG_WRONG` (POST `/activations/:id/flag-wrong-info`)
  - Access: Authenticated (activator)
  - Input (body): `FlagWrongInfoCommand` { fields } (`AccountInformation` keys)
  - Input (query/params): `ActivationIdParams`
  - Output: `ActiveRequestDTO`

- Route Constant: `ACTIVATION_ROUTES.REQUEST_ADDITIONAL` (POST `/activations/:id/request-additional`)
  - Access: Authenticated (activator)
  - Input (body): `RequestAdditionalInfoCommand` { fields } (Snapchat: `OTP`)
  - Input (query/params): `ActivationIdParams`
  - Output: `ActiveRequestDTO`

- Route Constant: `ACTIVATION_ROUTES.ACTIVATE` (POST `/activations/:id/activate`)
  - Access: Authenticated (activator)
  - Input (query/params): `ActivationIdParams`
  - Output: `ActiveRequestDTO`

- Route Constant: `ACTIVATION_ROUTES.CANCEL` (POST `/activations/:id/cancel`)
  - Access: Authenticated (activator)
  - Input (query/params): `ActivationIdParams`
  - Output: none

- Route Constant: `ACTIVATION_ROUTES.FREEZE` (POST `/activations/:id/freeze`)
  - Access: Authenticated (activator)
  - Input (body): `FreezeRequestCommand` { reason }
  - Input (query/params): `ActivationIdParams`
  - Output: `ActiveRequestDTO`

- Route Constant: `ACTIVATION_ROUTES.GET_MY_HISTORY` (GET `/activations/my-history`)
  - Access: Authenticated (activator)
  - Input (query/params): `GetActivatorHistoryQuery` { page?, limit?, status?, sortBy?, dateFrom?, dateTo?, search? }
  - Output: `ActivatorHistoryItemDTO[]` (paginated)

- Route Constant: `ACTIVATION_ROUTES.GET_RECENT` (GET `/activations/recent`)
  - Access: Authenticated (activator)
  - Output: `RecentActivationDTO[]` (last 10 completed, global)

### Admin (`ACTIVATION_ROUTES`, admin principal)

- Route Constant: `ACTIVATION_ROUTES.GET_ALL` (GET `/activations`)
  - Access: Admin
  - Input (query/params): `GetActivationsQuery` { page?, limit?, subscriptionPlanId?, activatorId?, state?, distributorId?, wilayaId?, communeId?, dateFrom?, dateTo?, key? }
  - Output: `AdminActivationDTO[]` (paginated). Used for the activations table **and** the dashboard's frozen/pending lists via `state=FREEZE` / `state=PENDING`.

- Route Constant: `ACTIVATION_ROUTES.GET_BY_ID` (GET `/activations/:id`)
  - Access: Admin
  - Input (query/params): `ActivationIdParams`
  - Output: `ActivationDetailDTO`

- Route Constant: `ACTIVATION_ROUTES.ACTIVATE_BY_ADMIN` (POST `/activations/:id/activate-by-admin`)
  - Access: Admin
  - Input (query/params): `ActivationIdParams`
  - Output: `AdminActivationDTO`

- Route Constant: `ACTIVATION_ROUTES.CANCEL_BY_ADMIN` (POST `/activations/:id/cancel-by-admin`)
  - Access: Admin
  - Input (query/params): `ActivationIdParams`
  - Output: `AdminActivationDTO`

- Route Constant: `ACTIVATION_ROUTES.SET_PRICE` (POST `/activations/:id/set-price`)
  - Access: Admin
  - Input (body): `SetActivatorPriceCommand` { amount }
  - Input (query/params): `ActivationIdParams`
  - Output: `AdminActivationDTO`

**DTO shapes (account fields are `{ fieldLabel, value }`, backend-resolved per plan):**
- `ActiveRequestDTO` = { id, subscriptionLabel, key, takenAt, state (`ActivationStat`), distributor:{ storeName, wilayaName, communeName }, client:{ fullName, phone }, accountFields:[{ fieldLabel, value }], otpValue?, freezeReason? } — **the only DTO that exposes real account values** (incl. password/OTP), and only to the assigned activator.
- `PendingActivationDTO`, `RecentActivationDTO`, `ActivatorHistoryItemDTO` = list rows (resolved labels; keys masked except in history where the activator owns it).
- `AdminActivationDTO` = list row { id, key, subscriptionLabel, activatorFullName?, distributorStoreName, clientName, clientPhone, state, requestedAt, takenAt?, completedAt?, durationSeconds?, activationPrice?, freezeReason? }.
- `ActivationDetailDTO` = { client, distributor, activator?, submittedInformation:[{ fieldLabel, value }] (**password/OTP masked**), timeline:[{ stat, createdAt, wrongFields:[{fieldLabel,value}], additionalFields:[{fieldLabel,value}], freezeReason? }], cardHistory:[{ stat, at }], financial:{ activationPrice, commissionTierLabel } }.

## 3. Events [CONTRACT]
Consumed by the WebSocket gateway (Stage 2 init) and the client status subscription. Listens: none.
- Emits `activation:created` — payload `PendingActivationDTO` — trigger: client submit, or a new `PENDING` spawned after cancel/timeout → refresh the activator pending pool.
- Emits `activation:taken` — payload { activationId, activatorId, timestamp } — trigger: an activator takes a request → remove it from other pools.
- Emits `activation:client-updated` — payload { activationId, activatorId, timestamp } — trigger: client correction or OTP submitted → notify the assigned activator (bell).
- Emits `activation:frozen` — payload { activationId, timestamp } — trigger: activator freezes → notify admin (bell).
- Emits `activation:resolved` — payload { activationId, activatorId, outcome, timestamp } — trigger: admin resolves a freeze → notify the activator.
- Emits `activation:status-changed` — payload { activationId, status (`ClientActivationStatus`), timestamp } — trigger: any state change → push to the client's status subscription.

## 4. Business Logic (Service) [BACKEND]

### Client (public)
- **verify:** find `Card` by `key` (not soft-deleted). If missing **or** `isActive=false` → `INVALID` (generic). Else resolve from `cardStat` + latest non-terminal activation: `AT_DISTRIBUTOR` w/ none → `READY`; `ACTIVATION_PROGRESS` → map the live activation (`PENDING→SUBMITTED`, `PROCESSING→PROCESSING`, `WRONG_INFORMATION→NEEDS_CORRECTION` + `flaggedFields`, `ADDITIONAL_INFORMATION→NEEDS_OTP` + `requestedFields`, `FREEZE→UNDER_REVIEW`) + `activationId` + `submittedFields` (password masked); `ACTIVATED→ACTIVATED` (+ `accountUsername`); `ACTIVATION_FAILED→FAILED`.
- **submit:** find card by `key`; require `isActive` + `AT_DISTRIBUTOR` + no live activation (else `RESOURCE_CONFLICT`) → **transaction** { create `Activation`(`PENDING`, client info) → create `ActivationInformation` rows from `accountFields` → create `ActivationStep`(`PENDING`) → card `→ACTIVATION_PROGRESS` } → emit `activation:created` + `activation:status-changed` → return { activationId, `SUBMITTED` }.
- **update:** load by `activationId`; require `WRONG_INFORMATION` (else `RESOURCE_CONFLICT`) → **transaction** { write each corrected value onto the matching `WrongInformation` row of the current step (**not** back into `ActivationInformation`) → create `ActivationStep`(`PROCESSING`) → `activationStat=PROCESSING` } → emit `client-updated` + `status-changed` → return status.
- **additional:** load; require `ADDITIONAL_INFORMATION` → **transaction** { write the supplied value(s) onto the `AdditionalInformation` row(s) of the current step → create `ActivationStep`(`PROCESSING`) → `PROCESSING` } → emit `client-updated` + `status-changed` → return status.
- **status:** load by `activationId` → map to `ClientActivationStatus`.

### Activator
- **getPending:** activations in `PENDING`, unassigned, ordered `requestedAt` asc → masked keys.
- **getActive:** the caller's activations in `PROCESSING`/`WRONG_INFORMATION`/`ADDITIONAL_INFORMATION`/`FREEZE` → resolve `accountFields` **latest-wins** (latest step value per field, else `ActivationInformation`), `otpValue` if present, distributor + client blocks → `ActiveRequestDTO[]`.
- **take:** count the caller's active requests; if ≥ 3 → `RESOURCE_CONFLICT` → **atomic** update `PENDING→PROCESSING` set `activatorId`, `takenAt=now` guarded `WHERE activationStat=PENDING` (0 rows → 409 already taken) → create `ActivationStep`(`PROCESSING`) → emit `activation:taken` → return.
- **flagWrong:** load; require caller-owned + working state → `WRONG_INFORMATION` → create `ActivationStep`(`WRONG_INFORMATION`) + `WrongInformation` rows (value null) for each field → emit `status-changed` → return.
- **requestAdditional:** load; same guard → `ADDITIONAL_INFORMATION` → step + `AdditionalInformation` rows (value null) → emit `status-changed` → return.
- **activate:** load; require caller-owned + working state → **transaction** { `ACTIVATED`, `completedAt=now`, compute `activationPrice` from the plan's commission for the tier matching `takenAt→completedAt` (catch-all if beyond) → card `→ACTIVATED` → activator `nbOfActivation++`, `nbOfSuccessfulActivation++`, `totalEarning += price`, `credits += price` → distributor `nbOfActivation++`, `nbOfActiveCards--` → `ActivationStep`(`ACTIVATED`) } → emit `status-changed` → return.
- **cancel:** load; require caller-owned + working state → **transaction** { `CANCELLED_BY_ACTIVATOR`, `completedAt=now`, step → create a **new** `Activation`(`PENDING`) for the same card copying client info + `ActivationInformation` → new `ActivationStep`(`PENDING`); card stays `ACTIVATION_PROGRESS`; activator `nbOfActivation++` } → emit `activation:created` (new) + `status-changed` → return.
- **freeze:** load; require caller-owned + working state → `FREEZE`, `freezReason=reason` → `ActivationStep`(`FREEZE`) → emit `activation:frozen` + `status-changed` → return.
- **getMyHistory / getRecent:** read terminal activations (own / global last 10), resolve labels, compute `durationSeconds` and `earning`.
- **(system) auto-release:** a scheduled job moves working-state activations idle beyond the Settings inactivity timeout to `REMOVED_FROM_ACTIVATOR`, spawns a new `PENDING` (copying info), emits `activation:created`. Not a route.

### Admin
- **getAll:** query activations join card/plan/activator/distributor → filters → paginate → resolve → `AdminActivationDTO`.
- **getById:** assemble `ActivationDetailDTO`: blocks, `submittedInformation` latest-wins (**password/OTP masked**), `timeline` from `ActivationStep` rows (each with its `WrongInformation`/`AdditionalInformation` fields+values and `freezeReason`), `cardHistory` (derived), `financial`.
- **activateByAdmin:** load; require `FREEZE` → **transaction** { `ACTIVATED_BY_ADMIN`, `completedAt=now`, compute price, card `→ACTIVATED`, credit the **assigned** activator (counters + earnings as in `activate`), distributor counters, step } → emit `activation:resolved` + `status-changed` → return.
- **cancelByAdmin:** load; require `FREEZE` → **transaction** { `CANCELLED_BY_ADMIN`, `completedAt=now`, card `→ACTIVATION_FAILED`, activator `nbOfActivation++` (no success/earning), step } → emit `activation:resolved` + `status-changed` → return.
- **setPrice:** load; require completed (`ACTIVATED`/`ACTIVATED_BY_ADMIN`) → set `activationPrice=amount`, adjust the activator's `totalEarning`/`credits` by the delta → write `Log` `CHANGE_ACTIVATION_COMMISSION` → return.

## 5. Data Mapping [BACKEND]
- **toDTO:** resolve `subscriptionLabel`, distributor/activator/client fields, and each account `fieldLabel` (per `AccountInformation` + plan). **Exposure rule:** `ActiveRequestDTO` (assigned activator only) carries real `value`s incl. password/OTP; `ActivationDetailDTO` and `KeyVerificationDTO` **mask** password/OTP values. Mask non-owned keys in pools/recent (last 4). `Decimal` price → number (2 dp); all timestamps → ISO; `durationSeconds` computed `takenAt→completedAt`.
- **toPersistence:** `accountFields` → one row per `AccountInformation` (`@@unique(activationId, accountInform)` on the initial submission); corrections/additional written onto the step-scoped `WrongInformation`/`AdditionalInformation` rows, never back into `ActivationInformation`.

## 6. Technical Constraints [BACKEND]
- Take is an **atomic** guarded update (no double-assignment); the 3-slot limit is enforced server-side. The `activationId` UUID is the public capability for `update`/`additional`/`status` (non-guessable). Price tier is chosen from `takenAt→completedAt` against `CommissionDuration` bounds (catch-all when beyond). Account `value`s (password/OTP) are exposed only via `ActiveRequestDTO`. The only logged action is `CHANGE_ACTIVATION_COMMISSION` (price override) — admin activate/cancel resolutions are **not** logged (no matching action type). All money `Decimal(12,2)`; all dates ISO 8601.
- **Assumptions flagged for confirmation:** (a) `ACTIVATED_BY_ADMIN` credits the assigned activator the computed commission; (b) `nbOfActivation` counts every terminal outcome the activator was assigned, `nbOfSuccessfulActivation` counts only `ACTIVATED` + `ACTIVATED_BY_ADMIN`.

## 7. Test Scenarios [BACKEND]
- verify — `INVALID` for unknown key, `isActive=false`, or disabled card; correct mapped status for each live state; `ACTIVATED`/`FAILED` end states.
- submit — creates `PENDING` + card `ACTIVATION_PROGRESS`; 409 if the card already has a live activation or isn't active.
- update/additional — 409 unless in `WRONG_INFORMATION` / `ADDITIONAL_INFORMATION`; success returns to `PROCESSING`; values land on the step rows, not `ActivationInformation`.
- take — 200 first caller; 409 second caller (already taken); 409 when the caller is at 3 slots.
- flag-wrong / request-additional / activate / cancel / freeze — 409 if not caller-owned or not in a working state; activate credits the activator and flips the card to `ACTIVATED`; cancel spawns a fresh `PENDING`; freeze sets the reason and emits `activation:frozen`.
- admin activate-by-admin / cancel-by-admin — 409 unless `FREEZE`; outcomes flip the card to `ACTIVATED` / `ACTIVATION_FAILED` respectively.
- set-price — 200 only when completed; adjusts activator earnings by the delta and logs `CHANGE_ACTIVATION_COMMISSION`.
- exposure — `ActiveRequestDTO` (assigned activator) shows password/OTP; `ActivationDetailDTO` and `KeyVerificationDTO` mask them; pool/recent keys masked.
