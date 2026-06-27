# Stage 01 · Phase 01 — Contract Architecture Plan

> Blueprint for `@my-app/contract` (workspace: `Apps/contract`). Derived strictly from `Docs/Stage-00-Conception/Module-Contracts/*.md`, `Docs/Stage-00-Conception/schema.prisma`, and `Docs/Stage-00-Conception/database.md`, under the rules of `Docs/Stage-01-Contract/contract-rules.md`. **No code — only the architecture.**

---

## 0. Conflict & precedence resolution

The phase file and `contract-rules.md §0` require flagging any **WHICH conflict** (a spec asks for something the rules forbid). Three were raised; the user has confirmed Option A on all three. They are reproduced here so the next phases (sprint planning + execution) treat them as governed exceptions, not drift.

### Sanctioned `§5` exceptions (confirmed)

1. **One-time `generatedPassword` in Admin/Activator create + reset responses.**
   - DTOs allowed: `AdminWithCredentialsDTO`, `ActivatorWithCredentialsDTO`, `GeneratedPasswordDTO`.
   - Rationale: the value is freshly generated, returned exactly once, and only the Argon2id hash is persisted. It is not a leak of a stored credential.
   - Containment: the field `generatedPassword` exists **only** on these three DTOs. It never appears on any list, detail, or get-by-id DTO.

2. **Client account values (incl. password / OTP) on `ActiveRequestDTO`.**
   - This is the only contract DTO that carries real `value`s for `ActivationInformation` / `WrongInformation` / `AdditionalInformation`.
   - Rationale: the activator's job *is* to use those credentials to perform the Snapchat activation. The data is the work product, not a server secret.
   - Containment: every other activation DTO (`KeyVerificationDTO`, `ActivationDetailDTO`, `PendingActivationDTO`, `RecentActivationDTO`, `ActivatorHistoryItemDTO`, `AdminActivationDTO`) masks password/OTP values. Card `key` is masked everywhere outside the assigned-activator and history contexts.

3. **Raw `accessToken` + `refreshToken` on `AuthTokensDTO`.**
   - Rationale: the login/refresh endpoints must deliver a session token to its rightful owner. Only the refresh token's **hash** is persisted server-side.
   - Containment: tokens never appear on any other DTO. `tokenHash` (DB) is never modelled in the contract.

### HOW conflicts (none)

No phase file or spec contradicted `contract-rules.md` on naming, file layout, schema-derived typing, or any other HOW-level concern. The plan below follows §2–§5 of the rules file verbatim.

### Other conflict-adjacent notes (no action needed)

- Several specs (Order, Set transitions, Lot create, DeliveryCompany, Card disable/enable) explicitly state that some mutations write no `Log` row because `LogActionType` has no matching value. This is a backend concern; the contract simply exports the enum as the schema defines it.
- `submittedInformation` in `ActivationDetailDTO` (admin view) keeps `value` typed as `string | null` but is **masked at the mapper** — masking is a backend mapping concern, the contract shape is unchanged.

---

## Part 1 — Common & Global

This part is **defined first** because every module depends on it. It maps 1:1 to `packages/contract/src/common/`.

### 1.1 `src/common/types.ts`

#### `ApiResponse<T>` — discriminated union (type-only)

The transport envelope. Documented as the **explicit exception** to "everything is a Zod schema" — Zod cannot express an open generic without a factory, and the union form lets the backend's error handler and `sendSuccess` helper type-check against `success`.

Shape (canonical, per `contract-rules.md §4.A`):
- `{ success: true; data: T; message?: string }`
- `{ success: false; error: { code: ErrorCode; message: string; details?: unknown } }`

Default `T = null` so void endpoints (e.g. logout, delete) type cleanly.

#### `PaginationMetaSchema` / `PaginationMeta`

Zod schema, exported with its inferred type:
- `page: int ≥ 1`
- `limit: int ≥ 1`
- `total: int ≥ 0`
- `totalPages: int ≥ 0`

#### `paginated<T>(item)` — factory

Returns `z.object({ items: z.array(item), meta: PaginationMetaSchema })`. Used by every list DTO that needs runtime-validated items.

#### `PaginatedResult<T>` — companion type

Plain TS type `{ items: T[]; meta: PaginationMeta }` for cases where the inferred type from the factory is awkward to spell.

### 1.2 `src/common/errors.ts`

`ErrorCode` enum — full list derived by sweeping every spec's `[BACKEND]` test scenarios and the rules file's example:

```
AUTH_INVALID_CREDENTIALS   — bad login, disabled/soft-deleted user
AUTH_UNAUTHORIZED          — missing/invalid/expired/rotated token
AUTH_FORBIDDEN             — wrong role (admin-only / activator-only routes), self-delete attempt
VALIDATION_ERROR           — shape errors, commune ∉ wilaya, amount ≤ 0, plan inactive on Set create, etc.
RESOURCE_NOT_FOUND         — unknown id on get/update/transition/delete
RESOURCE_CONFLICT          — username taken; last admin; lot/set/order in wrong state for the action;
                             card flag guard fails; amount > credits; payment already deleted;
                             plan combo exists; take when already taken / slots full
INTERNAL_SERVER_ERROR      — server fallback
```

No additional codes are required: every flagged error path across the 16 specs lands in one of the six domain buckets above plus the fallback. Adding more would split the same semantic across codes.

### 1.3 `src/common/auth.ts`

`JWTPayloadSchema` / `JWTPayload` — the shape of a decoded access token, shared between the backend's `requireAuth` guard and any frontend session state.

Fields (from `schema.prisma::User`):
- `id: z.uuid()`
- `role: z.enum(UserRole)` — imported from `modules/user/user.enums.ts`

**No other auth primitive belongs in `common`.** `AuthTokensDTO`, `LoginCommand`, `RefreshTokenCommand`, `SessionUserDTO`, and the `AUTH_ROUTES` constants live in the `auth` module (§5 of the rules — `common` is for cross-module primitives only; the *feature* of authenticating is a module).

### 1.4 Cross-cutting conventions

These are restatements of `contract-rules.md §3` so the per-module sections below can stay terse:

- **Types from schemas.** `export type X = z.infer<typeof XSchema>` — never a stand-alone interface for a thing the contract validates.
- **Dates as ISO strings.** Every `DateTime` in `schema.prisma` becomes `z.iso.datetime()` in any DTO. Never `z.date()`.
- **Decimal money** crosses the wire as `number` (2 dp, DZD). Schemas use `z.number()` with `.multipleOf(0.01)` where the spec requires it on input (e.g. payment `amount`, activation `setPrice`); on output we trust the backend mapper. **Decimal precision is a backend mapper concern; the contract never imports `Decimal.js` or any Prisma type.**
- **UUIDs as `z.uuid()`** for every id field; `schema.prisma` already pins all PKs/FKs to `String @id @default(uuid())`, so this is uniform.
- **Enums.** Every native Prisma enum that crosses the wire is re-declared once in the owning module's `*.enums.ts` and referenced via `z.enum(EnumName)` (rules §3.7 Zod 4 form). Values are copied **verbatim** from `schema.prisma`. No enum may be defined in two places.
- **Routes.** Constants `as const`, keys **UPPERCASE**, values **relative paths** (e.g. `'/:id'`, not `'/users/:id'`); the `BASE` key carries the module prefix.
- **Sensitive fields built mechanically.** DTO schemas are written field-by-field, never `omit`-from-entity. The Section 0 exceptions are the only places a "sensitive" field is intentional.
- **Strict `tsconfig`** baseline: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`.
- **No `any`.** Use `unknown` and narrow.

### 1.5 Build order rationale

Part 1 must compile before any module: `common/types.ts` and `common/errors.ts` have no dependencies, `common/auth.ts` depends on `modules/user/user.enums.ts` only. So the actual implementation order is:

1. `common/types.ts`, `common/errors.ts`.
2. `modules/user/user.enums.ts` (just the `UserRole` enum + `UserIdentityDTO`).
3. `common/auth.ts`.
4. Every other module in any order (see dependency map in Part 2).

---

## Part 2 — Module Blueprints

Each module entry lists: source, content files needed (file-count rule — omit empty files), routes constant, commands, queries/params, DTOs, events, sensitive-field exclusions, and inter-module dependencies. **Read-only modules omit `command.ts`; modules with no events omit `events.ts`; the User module omits routes/command/query entirely.**

### Module index & dependency map

```
Foundation:
  user        ← (depends on nothing; provides UserRole + UserIdentityDTO)
  common/auth ← user.enums (UserRole)

Identity & ops:
  auth          ← user (UserRole, UserIdentityDTO)
  admin         ← user
  activator     ← user
  payment       ← activator, admin (only via DTO field names — no type import)

Geography & couriers (lookup):
  geography           ← (none)
  delivery-company    ← (none)

Catalog:
  subscription-plan   ← (own enums: SubscriptionType, SubscriptionDuration)

Inventory:
  distributor   ← geography (FK shape only — IDs are uuid strings)
  set           ← subscription-plan
  lot           ← subscription-plan
  order         ← subscription-plan, lot, distributor, geography, delivery-company
  card          ← subscription-plan, set, lot, distributor (label/name resolution only)

Activation:
  activation    ← card, subscription-plan, activator, distributor
                  (re-exports its own ClientActivationStatus enum + AccountInformation re-use)

Cross-cutting:
  statistics    ← (reads-only, no schema imports — its DTOs reference geography.wilayaId only)
  log           ← user (resolved userName)
```

No cycles. `madge --circular` should be clean.

---

### Module: `user`

- **Source:** `module-contracts/user.md`
- **Prisma entity:** `User`
- **HTTP surface:** **none** (creation/mutation flows through Admin, Activator, and Auth modules; see §2 of the spec).
- **Content files:** `user.enums.ts`, `user.dtos.ts`, `index.ts`. (No `routes.ts`, `command.ts`, `query.ts`, `events.ts`.)

**Enums (`user.enums.ts`)**
- `UserRole` — values `ADMIN`, `ACTIVATOR` (verbatim from `schema.prisma::UserRole`).

**DTOs (`user.dtos.ts`)**
- `UserIdentityResponseSchema` → `UserIdentityDTO` = `{ id: uuid, username, role: UserRole, isEnabled: boolean, lastLoginAt: iso.datetime | null, createdAt: iso.datetime }`.

**Excluded sensitive fields:** `password`, `tokenHash` (the latter lives on `RefreshToken`, never on `User` in the contract), `deletedAt` (internal soft-delete marker).

---

### Module: `auth`

- **Source:** `module-contracts/auth.md`
- **Prisma entities (read/write):** `User` (credential check + `lastLoginAt`), `RefreshToken` (issue/rotate/revoke).
- **Content files:** `auth.routes.ts`, `auth.command.ts`, `auth.dtos.ts`, `index.ts`. (No `enums.ts`, `query.ts`, `events.ts`.)

**Routes (`auth.routes.ts`)** — `AUTH_ROUTES` with `BASE: '/auth'`:
- `LOGIN: '/login'` (POST, public)
- `REFRESH: '/refresh'` (POST, public — refresh token in body)
- `LOGOUT: '/logout'` (POST, authenticated)
- `ME: '/me'` (GET, authenticated)

**Commands (`auth.command.ts`)**
- `LoginSchema` → `LoginCommand` = `{ username, password }`.
- `RefreshTokenSchema` → `RefreshTokenCommand` = `{ refreshToken }` (also used by `/logout`).

**Queries / Params:** none.

**DTOs (`auth.dtos.ts`)**
- `AuthTokensResponseSchema` → `AuthTokensDTO` = `{ accessToken, refreshToken, role: UserRole }`. *(Sanctioned exception §0.1.3.)*
- `SessionUserResponseSchema` → `SessionUserDTO` = `{ id: uuid, username, role: UserRole, fullName }`. `fullName` is composed by the backend from `Admin`/`Activator`.

**Events:** none.

**Excluded sensitive fields:** `User.password`, `RefreshToken.tokenHash`. *(The raw `accessToken`/`refreshToken` strings returned by login/refresh are the §0.1.3 confirmed exception.)*

**Cross-module dependencies:** `user/user.enums.ts` (`UserRole`).

---

### Module: `admin`

- **Source:** `module-contracts/admin.md`
- **Prisma entities:** `Admin` (+ `User` of role `ADMIN`).
- **Content files:** `admin.routes.ts`, `admin.command.ts`, `admin.query.ts`, `admin.dtos.ts`, `index.ts`. (No `enums.ts`, `events.ts`.)

**Routes (`admin.routes.ts`)** — `ADMIN_ROUTES`, `BASE: '/admins'`:
- `GET_ALL: '/'` (GET)
- `CREATE: '/'` (POST)
- `GET_BY_ID: '/:id'` (GET)
- `UPDATE: '/:id'` (PATCH)
- `TOGGLE: '/:id/toggle'` (POST)
- `RESET_PASSWORD: '/:id/reset-password'` (POST)
- `DELETE: '/:id'` (DELETE)

**Commands (`admin.command.ts`)**
- `CreateAdminSchema` → `CreateAdminCommand` = `{ fullName, username, phone }`.
- `UpdateAdminSchema` → `UpdateAdminCommand` = `{ fullName?, phone?, username? }` (all optional with `exactOptionalPropertyTypes`).

**Queries / Params (`admin.query.ts`)**
- `GetAdminsQuerySchema` → `GetAdminsQuery` = `{ page?, limit?, search? }` (`page`/`limit` via `z.coerce`).
- `AdminIdParamsSchema` → `AdminIdParams` = `{ id: uuid }`.

**DTOs (`admin.dtos.ts`)**
- `AdminResponseSchema` → `AdminDTO` = `{ id, userId, fullName, username, phone, isEnabled, lastLoginAt: iso.datetime|null, createdAt: iso.datetime }`.
- `AdminWithCredentialsResponseSchema` → `AdminWithCredentialsDTO` = `{ admin: AdminDTO, generatedPassword }`. *(Sanctioned exception §0.1.1.)*
- `GeneratedPasswordResponseSchema` → `GeneratedPasswordDTO` = `{ generatedPassword }`. *(Sanctioned exception §0.1.1.)*
- Paginated wrapper via `paginated(AdminResponseSchema)` for the list endpoint.

**Events:** none.

**Excluded sensitive fields:** `User.password` hash, `deletedAt`, internal `Admin` flags (none beyond `isEnabled` which is exposed). The plaintext `generatedPassword` is the §0.1.1 exception.

**Cross-module dependencies:** `user/user.enums.ts` (`UserRole`), `common` (`paginated`, `ErrorCode`).

---

### Module: `activator`

- **Source:** `module-contracts/activator.md`
- **Prisma entities:** `Activator` (+ `User` of role `ACTIVATOR`).
- **Content files:** `activator.routes.ts`, `activator.command.ts`, `activator.query.ts`, `activator.dtos.ts`, `index.ts`. (No `enums.ts`, `events.ts`.)

**Routes (`activator.routes.ts`)** — `ACTIVATOR_ROUTES`, `BASE: '/activators'`:
- `GET_ALL: '/'`
- `CREATE: '/'`
- `GET_BY_ID: '/:id'`
- `UPDATE: '/:id'`
- `TOGGLE: '/:id/toggle'`
- `RESET_PASSWORD: '/:id/reset-password'`
- `DELETE: '/:id'`
- `PERFORMANCE: '/:id/performance'`
- `MY_STATS: '/me/stats'`

**Commands**
- `CreateActivatorSchema` → `CreateActivatorCommand` = `{ fullName, username, phone, initialCredits?: number }`.
- `UpdateActivatorSchema` → `UpdateActivatorCommand` = `{ fullName?, phone?, username? }`.

**Queries / Params**
- `GetActivatorsQuerySchema` → `GetActivatorsQuery` = `{ page?, limit?, search? }`.
- `ActivatorIdParamsSchema` → `ActivatorIdParams` = `{ id: uuid }`.
- `ActivatorPerformanceQuerySchema` → `ActivatorPerformanceQuery` = `{ days?: int.min(1).default(30) }`.

**DTOs**
- `ActivatorResponseSchema` → `ActivatorDTO` = `{ id, userId, fullName, username, phone, isEnabled, totalEarning: number, credits: number, nbOfActivation: int, nbOfSuccessfulActivation: int, avgActivationTimeSeconds: number|null, lastLoginAt: iso.datetime|null, createdAt: iso.datetime }`.
- `ActivatorDetailResponseSchema` → `ActivatorDetailDTO` = `ActivatorDTO ∪ { totalPaid: number, creditsOwed: number, successRate: number }`. Modelled as `ActivatorResponseSchema.extend(...)`.
- `ActivatorWithCredentialsResponseSchema` → `ActivatorWithCredentialsDTO` = `{ activator: ActivatorDTO, generatedPassword }`. *(Sanctioned §0.1.1.)*
- `GeneratedPasswordResponseSchema` re-used from admin module via re-export from `common/auth`? **No** — keep `GeneratedPasswordDTO` local per module to avoid coupling. (Decision: each module owns its credential-response DTO; same shape, different namespace.)
- `ActivatorPerformanceResponseSchema` → `ActivatorPerformanceDTO` = `{ series: Array<{ date: iso.datetime, count: int, earned: number }> }`.
- `ActivatorDashboardResponseSchema` → `ActivatorDashboardDTO` = `{ totalEarnings: number, earningsTrendPercent: number, creditsBalance: number, totalActivations: int, activationsToday: int, avgActivationTimeSeconds: number|null, activeSlotsUsed: int, weekly: Array<{ date: iso.datetime, count: int }> }`.
- Paginated wrapper via `paginated(ActivatorResponseSchema)`.

**Events:** none (activator-relevant real-time events live in the activation module).

**Excluded sensitive fields:** `User.password`, `deletedAt`. Login password is **never** exposed (the spec confirms the admin "reveal password" column can only show the one-time credential). The plaintext `generatedPassword` is the §0.1.1 exception.

**Cross-module dependencies:** `user/user.enums.ts`, `common`.

---

### Module: `payment`

- **Source:** `module-contracts/payment.md`
- **Prisma entity:** `Payment` (writes `Activator.credits`).
- **Content files:** `payment.routes.ts`, `payment.command.ts`, `payment.query.ts`, `payment.dtos.ts`, `index.ts`.

**Routes** — `PAYMENT_ROUTES`, `BASE: '/payments'`:
- `GET_ALL: '/'`
- `CREATE: '/'`
- `DELETE: '/:id'`

**Commands**
- `RecordPaymentSchema` → `RecordPaymentCommand` = `{ activatorId: uuid, amount: number.positive().multipleOf(0.01), date?: iso.datetime }`.

**Queries / Params**
- `GetPaymentsQuerySchema` → `GetPaymentsQuery` = `{ activatorId?: uuid, includeDeleted?: coerce.boolean, page?, limit? }`.
- `PaymentIdParamsSchema` → `PaymentIdParams` = `{ id: uuid }`.

**DTOs**
- `PaymentResponseSchema` → `PaymentDTO` = `{ id, activatorId, amount: number, previousCredits: number, paymentDate: iso.datetime, recordedByName, isDeleted: boolean }`.
- Paginated wrapper via `paginated(PaymentResponseSchema)`.

**Events:** none.

**Excluded sensitive fields:** none — `Payment` has no sensitive columns. `Admin`/`Activator` are referenced only through resolved display fields (`recordedByName`, `activatorId`).

**Cross-module dependencies:** `common`. No type-level dependency on Admin/Activator modules (only field-name conventions).

---

### Module: `subscription-plan`

- **Source:** `module-contracts/subscription-plan.md`
- **Prisma entities:** `SubscriptionPlan`, `SubscriptionPlanCommission`, `CommissionDuration`.
- **Content files:** `subscription-plan.enums.ts`, `subscription-plan.routes.ts`, `subscription-plan.command.ts`, `subscription-plan.query.ts`, `subscription-plan.dtos.ts`, `index.ts`. (No `events.ts`.)

**Enums** (verbatim from `schema.prisma`):
- `SubscriptionType` — `SNAPCHAT_PLUS`.
- `SubscriptionDuration` — `ONE_DAY, ONE_WEEK, TWO_WEEK, ONE_MONTH, THREE_MONTH, SIXTH_MONTH, ONE_YEAR, UNLIMITED`.

**Routes** — `SUBSCRIPTION_PLAN_ROUTES`, `BASE: '/subscription-plans'`:
- `GET_ALL: '/'`
- `CREATE: '/'`
- `TOGGLE: '/:id/toggle'`
- `GET_COMMISSION_DURATIONS: '/commission-durations'`
- `GET_COMMISSIONS: '/commissions'`
- `UPDATE_COMMISSION: '/commissions'` (PATCH)

**Commands**
- `CreateSubscriptionPlanSchema` → `CreateSubscriptionPlanCommand` = `{ subscriptionType: enum, subscriptionDuration: enum }`.
- `UpdateCommissionSchema` → `UpdateCommissionCommand` = `{ subscriptionPlanId: uuid, commissionDurationId: uuid, commission: number.nonnegative().multipleOf(0.01) }`.

**Queries / Params**
- `GetSubscriptionPlansQuerySchema` → `GetSubscriptionPlansQuery` = `{ active?: coerce.boolean }`.
- `SubscriptionPlanIdParamsSchema` → `SubscriptionPlanIdParams` = `{ id: uuid }`.

**DTOs**
- `SubscriptionPlanResponseSchema` → `SubscriptionPlanDTO` = `{ id, subscriptionType, subscriptionDuration, label, isActive }`.
- `CommissionDurationResponseSchema` → `CommissionDurationDTO` = `{ id, key, label, nbMinuteMin: int, nbMinuteMax: int|null }`.
- `CommissionCellResponseSchema` → `CommissionCellDTO` = `{ subscriptionPlanId, commissionDurationId, commission: number }`.
- `CommissionMatrixResponseSchema` → `CommissionMatrixDTO` = `{ tiers: CommissionDurationDTO[], rows: Array<{ planId, planLabel, cells: Array<{ commissionDurationId, commission: number | null }> }> }`.

**Events:** none.

**Excluded sensitive fields:** none — entirely catalog data.

**Cross-module dependencies:** `common`.

---

### Module: `geography`

- **Source:** `module-contracts/geography.md`
- **Prisma entities:** `Wilaya`, `Commune` (seed-only, read-only via API).
- **Content files:** `geography.routes.ts`, `geography.query.ts`, `geography.dtos.ts`, `index.ts`. (No `command.ts`, `enums.ts`, `events.ts`.)

**Routes** — `GEOGRAPHY_ROUTES`, `BASE: '/geography'`:
- `GET_WILAYAS: '/wilayas'`
- `GET_COMMUNES: '/wilayas/:wilayaId/communes'`

**Queries / Params**
- `WilayaIdParamsSchema` → `WilayaIdParams` = `{ wilayaId: uuid }`.

**DTOs**
- `WilayaResponseSchema` → `WilayaDTO` = `{ id, wilayaCode, frName, arName }`.
- `CommuneResponseSchema` → `CommuneDTO` = `{ id, communeCode, wilayaId, frName, arName }`.

**Events:** none. **Excluded sensitive fields:** none.

**Cross-module dependencies:** `common`. (`WilayaIdParamsSchema` is re-used by the `statistics` module — exported from the module barrel and re-imported, not duplicated.)

---

### Module: `delivery-company`

- **Source:** `module-contracts/delivery-company.md`
- **Prisma entity:** `DeliveryCompany`.
- **Content files:** `delivery-company.routes.ts`, `delivery-company.command.ts`, `delivery-company.query.ts`, `delivery-company.dtos.ts`, `index.ts`.

**Routes** — `DELIVERY_COMPANY_ROUTES`, `BASE: '/delivery-companies'`:
- `GET_ALL: '/'`
- `CREATE: '/'`
- `UPDATE: '/:id'` (PATCH)
- `TOGGLE: '/:id/toggle'`

(No `DELETE` route — by design, see spec.)

**Commands**
- `CreateDeliveryCompanySchema` → `CreateDeliveryCompanyCommand` = `{ name, registeredName }`.
- `UpdateDeliveryCompanySchema` → `UpdateDeliveryCompanyCommand` = `{ name?, registeredName? }`.

**Queries / Params**
- `GetDeliveryCompaniesQuerySchema` → `GetDeliveryCompaniesQuery` = `{ active?: coerce.boolean }`.
- `DeliveryCompanyIdParamsSchema` → `DeliveryCompanyIdParams` = `{ id: uuid }`.

**DTOs**
- `DeliveryCompanyResponseSchema` → `DeliveryCompanyDTO` = `{ id, name, registeredName, isActive }`.

**Events:** none. **Excluded sensitive fields:** none.

**Cross-module dependencies:** `common`.

---

### Module: `distributor`

- **Source:** `module-contracts/distributor.md`
- **Prisma entity:** `Distributor` (FKs `Wilaya`, `Commune`).
- **Content files:** `distributor.routes.ts`, `distributor.command.ts`, `distributor.query.ts`, `distributor.dtos.ts`, `index.ts`.

**Routes** — `DISTRIBUTOR_ROUTES`, `BASE: '/distributors'`:
- `GET_ALL: '/'`
- `CREATE: '/'`
- `GET_BY_ID: '/:id'`
- `UPDATE: '/:id'`
- `TOGGLE: '/:id/toggle'`
- `DELETE: '/:id'`

**Commands**
- `CreateDistributorSchema` → `CreateDistributorCommand` = `{ fullName, storeName, phone, wilayaId: uuid, communeId: uuid }`.
- `UpdateDistributorSchema` → `UpdateDistributorCommand` = `{ fullName?, storeName?, phone?, wilayaId?: uuid, communeId?: uuid }`.

**Queries / Params**
- `GetDistributorsQuerySchema` → `GetDistributorsQuery` = `{ page?, limit?, search?, wilayaId?: uuid, communeId?: uuid }`.
- `DistributorIdParamsSchema` → `DistributorIdParams` = `{ id: uuid }`.

**DTOs**
- `DistributorResponseSchema` → `DistributorDTO` = `{ id, fullName, storeName, phone, wilayaId, wilayaName, communeId, communeName, isEnabled, nbOfActiveCards: int, nbOfActivation: int, deliveredOrdersCount: int, createdAt: iso.datetime }`.
- `DistributorDetailResponseSchema` → `DistributorDetailDTO` = `DistributorResponseSchema.extend({ soldKeys: int, ordersCount: int })`.
- Paginated wrapper via `paginated(DistributorResponseSchema)`.

**Events:** none. **Excluded sensitive fields:** `deletedAt`.

**Cross-module dependencies:** `common`. (FK ids typed as `uuid` only — no import from `geography`.)

---

### Module: `set`

- **Source:** `module-contracts/set.md`
- **Prisma entity:** `Set` (owns the generated `Card` rows).
- **Content files:** `set.enums.ts`, `set.routes.ts`, `set.command.ts`, `set.query.ts`, `set.dtos.ts`, `index.ts`. (No `events.ts`.)

**Enums** (verbatim from `schema.prisma::SetStat`):
- `SetStat` — `NOT_PRINTED, PENDING_PRINTING, PRINTED`.

**Routes** — `SET_ROUTES`, `BASE: '/sets'`:
- `GET_ALL: '/'`
- `CREATE: '/'`
- `TRANSITION: '/:id/transition'`
- `DELETE: '/:id'`

**Commands**
- `CreateSetSchema` → `CreateSetCommand` = `{ numberOfKeys: int.positive(), subscriptionPlanId: uuid }`.
- `TransitionSetSchema` → `TransitionSetCommand` = `{ to: z.enum([SetStat.PENDING_PRINTING, SetStat.PRINTED]) }`. *(Narrowed to allowed targets — illegal moves are §0 conflict-clean since `RESOURCE_CONFLICT` covers them.)*

**Queries / Params**
- `GetSetsQuerySchema` → `GetSetsQuery` = `{ page?, limit?, search?, subscriptionPlanId?: uuid, state?: SetStat }`.
- `SetIdParamsSchema` → `SetIdParams` = `{ id: uuid }`.

**DTOs**
- `SetResponseSchema` → `SetDTO` = `{ id, setNumber, subscriptionPlanId, subscriptionLabel, numberOfKeys: int, setStat: SetStat, createdAt: iso.datetime, printedAt: iso.datetime|null }`.
- Paginated wrapper via `paginated(SetResponseSchema)`.

**Events:** none. **Excluded sensitive fields:** none.

**Cross-module dependencies:** `common`. (Plan id typed as `uuid` only.)

---

### Module: `lot`

- **Source:** `module-contracts/lot.md`
- **Prisma entity:** `Lot` (joined to `Order` via `OrderLot`).
- **Content files:** `lot.enums.ts`, `lot.routes.ts`, `lot.command.ts`, `lot.query.ts`, `lot.dtos.ts`, `index.ts`.

**Enums** (verbatim from `schema.prisma::LotStat`):
- `LotStat` — `PENDING, IN_DELIVERY, DELIVERED, RETURNED`.

**Routes** — `LOT_ROUTES`, `BASE: '/lots'`:
- `GET_ALL: '/'`
- `GET_AVAILABLE_FOR_ORDER: '/available-for-order'`
- `CREATE: '/'`
- `DELETE: '/:id'`

**Commands**
- `CreateLotSchema` → `CreateLotCommand` = `{ subscriptionPlanId: uuid, cardIds: z.array(z.uuid()).nonempty() }`.

**Queries / Params**
- `GetLotsQuerySchema` → `GetLotsQuery` = `{ page?, limit?, search?, subscriptionPlanId?: uuid, state?: LotStat }`.
- `GetAvailableLotsQuerySchema` → `GetAvailableLotsQuery` = `{ subscriptionPlanId?: uuid }`.
- `LotIdParamsSchema` → `LotIdParams` = `{ id: uuid }`.

**DTOs**
- `LotResponseSchema` → `LotDTO` = `{ id, lotNumber, subscriptionPlanId, subscriptionLabel, lotStat: LotStat, nbOfCards: int, deliveredCardsCount: int, isReturned: boolean, createdAt: iso.datetime, deliveryDate: iso.datetime|null }`.
- Paginated wrapper.

**Events:** none. **Excluded sensitive fields:** none.

**Cross-module dependencies:** `common`.

---

### Module: `order`

- **Source:** `module-contracts/order.md`
- **Prisma entities:** `Order`, `OrderLot` (join).
- **Content files:** `order.enums.ts`, `order.routes.ts`, `order.command.ts`, `order.query.ts`, `order.dtos.ts`, `index.ts`.

**Enums** (verbatim from `schema.prisma`):
- `OrderStat` — `PENDING_DELIVERY, IN_DELIVERY, DELIVERED, RETURNED`.
- `DeliveryType` — `HOME, PICKUP_POINT, STORE`.

**Routes** — `ORDER_ROUTES`, `BASE: '/orders'`:
- `GET_ALL: '/'`
- `GET_BY_ID: '/:id'`
- `CREATE: '/'`
- `TRANSITION: '/:id/transition'`
- `DELETE: '/:id'`

**Commands**
- `CreateOrderSchema` → `CreateOrderCommand` = `{ distributorId: uuid, lotIds: z.array(z.uuid()).nonempty(), receivedName, receivedPhone, wilayaId: uuid, communeId: uuid, deliveryCompanyId: uuid, deliveryType: DeliveryType, orderPrice: number.positive().multipleOf(0.01), deliverPrice: number.nonnegative().multipleOf(0.01) }`.
- `TransitionOrderSchema` → `TransitionOrderCommand` = `{ to: z.enum([OrderStat.IN_DELIVERY, OrderStat.DELIVERED, OrderStat.RETURNED]), deliveredCount?: int.nonnegative() }`. (Backend enforces "`deliveredCount` only meaningful when `to=DELIVERED`".)

**Queries / Params**
- `GetOrdersQuerySchema` → `GetOrdersQuery` = `{ page?, limit?, search?, distributorId?: uuid, wilayaId?: uuid, deliveryCompanyId?: uuid, state?: OrderStat, dateFrom?: iso.datetime, dateTo?: iso.datetime }`.
- `OrderIdParamsSchema` → `OrderIdParams` = `{ id: uuid }`.

**DTOs**
- `OrderResponseSchema` → `OrderDTO` = `{ id, orderNumber, distributorId, distributorName, receivedName, receivedPhone, wilayaId, wilayaName, communeId, communeName, deliveryCompanyId, deliveryCompanyName, deliveryType: DeliveryType, lotNumbers: string[], cardsCount: int, orderPrice: number, deliverPrice: number, cardsDeliveredCount: int, orderStat: OrderStat, createdAt: iso.datetime, completedAt: iso.datetime|null }`.
- `OrderDetailResponseSchema` → `OrderDetailDTO` = `OrderResponseSchema.extend({ lots: Array<{ lotId: uuid, lotNumber, subscriptionLabel, cardsCount: int, lotStat: LotStat }> })`. (Imports `LotStat` from the `lot` module.)
- Paginated wrapper.

**Events:** none. **Excluded sensitive fields:** none.

**Cross-module dependencies:** `lot/lot.enums.ts` (`LotStat` used in `OrderDetailDTO`). `common`.

---

### Module: `card`

- **Source:** `module-contracts/card.md`
- **Prisma entity:** `Card`.
- **Content files:** `card.enums.ts`, `card.routes.ts`, `card.query.ts`, `card.dtos.ts`, `index.ts`. (No `command.ts` — the admin actions take only path params; no `events.ts`.)

**Enums** (verbatim from `schema.prisma::CardStat`):
- `CardStat` — `IN_SET, PRINTED, IN_LOT, AT_DISTRIBUTOR, ACTIVATION_PROGRESS, ACTIVATED, ACTIVATION_FAILED`.
- `CardFlag` — `disabled, revoked` (contract-only convenience enum for the `flag` query param; values are lowercase as used by the spec).

**Routes** — `CARD_ROUTES`, `BASE: '/cards'`:
- `GET_ALL: '/'`
- `GET_AVAILABLE_FOR_LOT: '/available-for-lot'`
- `GET_BY_ID: '/:id'`
- `DELETE: '/:id'`
- `DISABLE: '/:id/disable'`
- `ENABLE: '/:id/enable'`
- `REVOKE: '/:id/revoke'`

**Queries / Params**
- `GetCardsQuerySchema` → `GetCardsQuery` = `{ page?, limit?, search?, state?: CardStat, setNumber?, lotNumber?, distributorId?: uuid, subscriptionPlanId?: uuid, flag?: CardFlag }`.
- `GetAvailableCardsQuerySchema` → `GetAvailableCardsQuery` = `{ subscriptionPlanId: uuid }`.
- `CardIdParamsSchema` → `CardIdParams` = `{ id: uuid }`.

**DTOs**
- `CardResponseSchema` → `CardDTO` = `{ id, key, subscriptionPlanId, subscriptionLabel, setNumber, lotNumber: string|null, distributorName: string|null, cardStat: CardStat, isActive: boolean, isDisabled: boolean, isRevoked: boolean, createdAt: iso.datetime }`.
- `CardDetailResponseSchema` → `CardDetailDTO` = `CardResponseSchema.extend({ distributionTimeline: Array<{ stat: CardStat, at: iso.datetime }> })`.
- `AvailableCardResponseSchema` → `AvailableCardDTO` = `{ id, key, subscriptionLabel }`.
- Paginated wrapper via `paginated(CardResponseSchema)`.

**Events:** none. **Excluded sensitive fields:** `deletedAt`. (`key` is the printed card key — an identifier, not a secret; consistent with `database.md`.)

**Cross-module dependencies:** `common`.

---

### Module: `activation`

The largest module. Two route groups (`KEY_ROUTES` public client portal, `ACTIVATION_ROUTES` activator + admin), three audiences, and the strictest exposure rules in the system.

- **Source:** `module-contracts/activation.md`
- **Prisma entities:** `Activation`, `ActivationInformation`, `ActivationStep`, `WrongInformation`, `AdditionalInformation`.
- **Content files:** `activation.enums.ts`, `activation.routes.ts`, `activation.command.ts`, `activation.query.ts`, `activation.dtos.ts`, `activation.events.ts`, `index.ts`. **(All six content files used.)**

**Enums (`activation.enums.ts`)** (verbatim from `schema.prisma` + one contract-owned):
- `ActivationStat` — `PENDING, PROCESSING, WRONG_INFORMATION, ADDITIONAL_INFORMATION, FREEZE, ACTIVATED, ACTIVATED_BY_ADMIN, CANCELLED_BY_ACTIVATOR, REMOVED_FROM_ACTIVATOR, CANCELLED_BY_ADMIN`.
- `AccountInformation` — `USERNAME, EMAIL, PHONE_NUMBER, OTP, BIRTHDAY, PASSWORD`.
- `ClientActivationStatus` (**contract-owned, not in Prisma**) — `INVALID, READY, SUBMITTED, PROCESSING, NEEDS_CORRECTION, NEEDS_OTP, UNDER_REVIEW, ACTIVATED, FAILED`. The public portal sees this; raw `ActivationStat` never crosses to the client.

**Routes (`activation.routes.ts`)** — **two exports**:

`KEY_ROUTES`, `BASE: '/keys'` (public):
- `VERIFY: '/verify'`
- `SUBMIT: '/submit'`
- `UPDATE: '/:activationId/update'` (PUT)
- `ADDITIONAL: '/:activationId/additional'`
- `STATUS: '/:activationId/status'`

`ACTIVATION_ROUTES`, `BASE: '/activations'` (activator + admin):
- `GET_PENDING: '/pending'`
- `GET_ACTIVE: '/active'`
- `TAKE: '/:id/take'`
- `FLAG_WRONG: '/:id/flag-wrong-info'`
- `REQUEST_ADDITIONAL: '/:id/request-additional'`
- `ACTIVATE: '/:id/activate'`
- `CANCEL: '/:id/cancel'`
- `FREEZE: '/:id/freeze'`
- `GET_MY_HISTORY: '/my-history'`
- `GET_RECENT: '/recent'`
- `GET_ALL: '/'`
- `GET_BY_ID: '/:id'`
- `ACTIVATE_BY_ADMIN: '/:id/activate-by-admin'`
- `CANCEL_BY_ADMIN: '/:id/cancel-by-admin'`
- `SET_PRICE: '/:id/set-price'`

**Commands (`activation.command.ts`)**

A shared sub-schema for client account submissions:
- `AccountFieldSchema` = `z.object({ field: z.enum(AccountInformation), value: z.string() })` (value type stays `string` — the contract is wire-shape; the activation module's mapper handles per-plan field semantics).
- `AccountFieldsSchema` = `z.array(AccountFieldSchema).nonempty()`.

Public:
- `VerifyKeySchema` → `VerifyKeyCommand` = `{ key }`.
- `SubmitActivationSchema` → `SubmitActivationCommand` = `{ key, fullName, phone, accountFields: AccountFieldsSchema }`.
- `UpdateActivationSchema` → `UpdateActivationCommand` = `{ accountFields }`.
- `SubmitAdditionalInfoSchema` → `SubmitAdditionalInfoCommand` = `{ accountFields }`.

Activator:
- `FlagWrongInfoSchema` → `FlagWrongInfoCommand` = `{ fields: z.array(z.enum(AccountInformation)).nonempty() }`.
- `RequestAdditionalInfoSchema` → `RequestAdditionalInfoCommand` = `{ fields: z.array(z.enum(AccountInformation)).nonempty() }`.
- `FreezeRequestSchema` → `FreezeRequestCommand` = `{ reason: z.string().min(1) }`.

Admin:
- `SetActivatorPriceSchema` → `SetActivatorPriceCommand` = `{ amount: number.nonnegative().multipleOf(0.01) }`.

**Queries / Params (`activation.query.ts`)**
- `ActivationIdParamsSchema` → `ActivationIdParams` = `{ activationId: uuid }`. *(Used by `KEY_ROUTES` UPDATE/ADDITIONAL/STATUS.)*
- `ActivationActionParamsSchema` → `ActivationActionParams` = `{ id: uuid }`. *(Used by every `ACTIVATION_ROUTES` action.)* (Two param schemas because the route segment names differ — `:activationId` vs `:id` — keeping them distinct prevents accidental cross-use.)
- `GetActivationsQuerySchema` → `GetActivationsQuery` = `{ page?, limit?, subscriptionPlanId?: uuid, activatorId?: uuid, state?: ActivationStat, distributorId?: uuid, wilayaId?: uuid, communeId?: uuid, dateFrom?: iso.datetime, dateTo?: iso.datetime, key?: string }`.
- `GetActivatorHistoryQuerySchema` → `GetActivatorHistoryQuery` = `{ page?, limit?, status?: ActivationStat, sortBy?: z.enum(['requestedAt','completedAt','durationSeconds','activationPrice']), dateFrom?: iso.datetime, dateTo?: iso.datetime, search?: string }`. (The `sortBy` enum closes the spec's open list — backend rejects others with `VALIDATION_ERROR`.)

**DTOs (`activation.dtos.ts`)**

Helper subshapes (not exported individually if unused outside the module):
- `ClientBlockSchema` = `{ fullName, phone }`.
- `DistributorBlockSchema` = `{ storeName, wilayaName, communeName }`.
- `AccountFieldValueSchema` = `{ fieldLabel: string, value: string }`. *(Used for resolved fields, including masked values where applicable.)*
- `TimelineEntrySchema` = `{ stat: ActivationStat, createdAt: iso.datetime, wrongFields: AccountFieldValue[], additionalFields: AccountFieldValue[], freezeReason: string|null }`.
- `CardHistoryEntrySchema` = `{ stat: CardStat, at: iso.datetime }`. (Imports `CardStat`.)

Client-facing (public):
- `KeyVerificationResponseSchema` → `KeyVerificationDTO` = `{ status: ClientActivationStatus, subscriptionLabel?, planKey?, activationId?: uuid, submittedFields?: AccountFieldValue[] /* password/OTP masked by backend */, flaggedFields?: Array<{ field: AccountInformation, label: string }>, requestedFields?: Array<{ field: AccountInformation, label: string }>, accountUsername?: string }`.
- `ClientActivationStatusResponseSchema` → `ClientActivationStatusDTO` = `{ activationId: uuid, status: ClientActivationStatus }`.

Activator-facing:
- `PendingActivationResponseSchema` → `PendingActivationDTO` = `{ id: uuid, subscriptionLabel, keyMasked, requestedAt: iso.datetime }`.
- `ActiveRequestResponseSchema` → `ActiveRequestDTO` = `{ id: uuid, subscriptionLabel, key /* unmasked, assigned-activator only */, takenAt: iso.datetime, state: ActivationStat, distributor: DistributorBlock, client: ClientBlock, accountFields: AccountFieldValue[] /* unmasked */, otpValue: string|null, freezeReason: string|null }`. **(Sanctioned exposure §0.1.2.)**
- `ActivatorHistoryItemResponseSchema` → `ActivatorHistoryItemDTO` = `{ id, subscriptionLabel, key /* unmasked for own history */, state: ActivationStat, requestedAt, takenAt: iso.datetime|null, completedAt: iso.datetime|null, durationSeconds: int|null, earning: number|null, client: ClientBlock }`.
- `RecentActivationResponseSchema` → `RecentActivationDTO` = `{ id, subscriptionLabel, keyMasked, completedAt: iso.datetime, state: ActivationStat }`.

Admin-facing:
- `AdminActivationResponseSchema` → `AdminActivationDTO` = `{ id, key, subscriptionLabel, activatorFullName: string|null, distributorStoreName, clientName, clientPhone, state: ActivationStat, requestedAt: iso.datetime, takenAt: iso.datetime|null, completedAt: iso.datetime|null, durationSeconds: int|null, activationPrice: number|null, freezeReason: string|null }`.
- `ActivationDetailResponseSchema` → `ActivationDetailDTO` = `{ id, client: ClientBlock, distributor: DistributorBlock, activator: { id: uuid, fullName: string }|null, submittedInformation: AccountFieldValue[] /* password/OTP masked by mapper */, timeline: TimelineEntry[], cardHistory: CardHistoryEntry[], financial: { activationPrice: number|null, commissionTierLabel: string|null } }`.

Paginated wrappers via `paginated(...)` for `GET_ALL`, `GET_MY_HISTORY`.

**Events (`activation.events.ts`)**

`ActivationEvents` typed map — wire shapes for the WebSocket gateway (Stage 2). Listens: none.

- `'activation:created'` → `PendingActivationDTO`.
- `'activation:taken'` → `{ activationId: uuid, activatorId: uuid, timestamp: iso.datetime }`.
- `'activation:client-updated'` → `{ activationId: uuid, activatorId: uuid, timestamp: iso.datetime }`.
- `'activation:frozen'` → `{ activationId: uuid, timestamp: iso.datetime }`.
- `'activation:resolved'` → `{ activationId: uuid, activatorId: uuid, outcome: ActivationStat, timestamp: iso.datetime }`. (`outcome` constrained at the schema level to `ACTIVATED_BY_ADMIN | CANCELLED_BY_ADMIN`.)
- `'activation:status-changed'` → `{ activationId: uuid, status: ClientActivationStatus, timestamp: iso.datetime }`.

Payload schemas live alongside the type map so backend and frontend can validate at the socket boundary.

**Excluded sensitive fields:** outside `ActiveRequestDTO` (§0.1.2 exception), every account `value` is masked at the mapper. `User.password`, `RefreshToken.tokenHash` never appear.

**Cross-module dependencies:**
- `card/card.enums.ts` (`CardStat` for `cardHistory`).
- `common`.

---

### Module: `statistics`

- **Source:** `module-contracts/statistics.md`
- **Prisma entities:** none owned; aggregates across the model.
- **Content files:** `statistics.routes.ts`, `statistics.query.ts`, `statistics.dtos.ts`, `index.ts`. (No `command.ts`, `enums.ts`, `events.ts`.)

**Routes** — `STATISTICS_ROUTES`, `BASE: '/statistics'`:
- `DASHBOARD: '/dashboard'`
- `ACTIVATORS_SUMMARY: '/activators'`
- `DISTRIBUTORS_SUMMARY: '/distributors'`
- `INVENTORY_SUMMARY: '/inventory'`
- `ORDERS_SUMMARY: '/orders'`
- `ACTIVATIONS_SUMMARY: '/activations'`
- `OVERVIEW: '/overview'`
- `WILAYA_HEATMAP: '/wilaya-heatmap'`
- `WILAYA_DRILLDOWN: '/wilaya/:wilayaId'`

**Queries / Params**
- `StatisticsPeriodSchema` (shared enum-like): `z.enum(['today','this_week','this_month','last_30d','last_90d','this_year','custom'])`. Spec leaves "period" open — closing the set here is the §0 HOW resolution (`contract-rules.md §3.4`: no magic strings). `custom` activates `dateFrom`/`dateTo`.
- `StatisticsOverviewQuerySchema` → `StatisticsOverviewQuery` = `{ period: StatisticsPeriod, dateFrom?: iso.datetime, dateTo?: iso.datetime, subscriptionPlanId?: uuid, wilayaId?: uuid }`.
- `WilayaHeatmapQuerySchema` → `WilayaHeatmapQuery` = `{ period?: StatisticsPeriod, subscriptionPlanId?: uuid }`.
- `WilayaDrilldownQuerySchema` → `WilayaDrilldownQuery` = `{ period?: StatisticsPeriod }`.
- Re-uses `WilayaIdParamsSchema` from the `geography` module (imported at the route handler boundary — see "Cross-module dependencies").

**DTOs** (high-level — each composes the smaller series types listed):
- `DashboardStatsResponseSchema` → `DashboardStatsDTO` — 4 cards.
- `ActivatorsSummaryResponseSchema` → `ActivatorsSummaryDTO` = `{ totalActivators: int, onlineNow: int, totalSuccessful: int, totalCreditsOwed: number }`.
- `DistributorsSummaryResponseSchema` → `DistributorsSummaryDTO` = `{ totalDistributors: int, activeWithStock: int, totalCardsInStock: int, activationsThisMonth: int }`.
- `InventorySummaryResponseSchema` → `InventorySummaryDTO` — counts grouped by `SetStat`, `LotStat`, `CardStat` + flag counts.
- `OrdersSummaryResponseSchema` → `OrdersSummaryDTO` = `{ totalOrders: { all: int, month: int, week: int }, pendingDelivery: int, inDelivery: int, totalRevenue: number }`.
- `ActivationsSummaryResponseSchema` → `ActivationsSummaryDTO` = `{ total: { all: int, today: int, week: int, month: int }, byState: Array<{ state: ActivationStat, count: int }>, avgDurationSeconds: number|null, totalRevenue: number }`.
- `StatisticsOverviewResponseSchema` → `StatisticsOverviewDTO` — six pre-aggregated series: `activationsOverTime: Array<{ date: iso.datetime, count: int }>`, `activationsByState: Array<{ state: ActivationStat, count: int }>`, `topActivators: Array<{ activatorId: uuid, fullName: string, count: int, earned: number }>`, `topDistributors: Array<{ distributorId: uuid, storeName: string, count: int }>`, `avgTimeTrend: Array<{ date: iso.datetime, avgSeconds: number }>`, `revenueOverTime: Array<{ date: iso.datetime, revenue: number }>`.
- `WilayaHeatmapResponseSchema` → `WilayaHeatmapDTO` = `Array<{ wilayaId: uuid, wilayaName: string, distributorsCount: int, activationsCount: int, cancellationsCount: int, avgActivationTimeSeconds: number|null }>`.
- `WilayaDrilldownResponseSchema` → `WilayaDrilldownDTO` — per-wilaya detailed breakdown (top distributors in wilaya, activation counts by plan, time series for the period).

**Events:** none. **Excluded sensitive fields:** none — every figure is aggregated. The plan must verify no DTO accidentally surfaces a user-identifying value beyond resolved display names already public elsewhere.

**Cross-module dependencies:**
- `set/set.enums` (`SetStat`), `lot/lot.enums` (`LotStat`), `card/card.enums` (`CardStat`), `order/order.enums` (`OrderStat`), `activation/activation.enums` (`ActivationStat`) — for `byState` series.
- `geography/geography.query` (`WilayaIdParamsSchema`).
- `common`.

This module is the **last** built; touching it confirms every other enum already exists.

---

### Module: `log`

- **Source:** `module-contracts/log.md`
- **Prisma entity:** `Log`.
- **Content files:** `log.enums.ts`, `log.routes.ts`, `log.query.ts`, `log.dtos.ts`, `index.ts`. (No `command.ts` — writes are internal/backend-only; no `events.ts`.)

**Enums** (verbatim from `schema.prisma::LogActionType`):
- `LogActionType` — `CHANGE_USER_PASSWORD, CHANGE_USER_STAT, CHANGE_USER_INFORMATION, SET_PAYMENT, DELETE_PAYMENT, ADD_DISTRIBUTOR, CHANGE_DISTRIBUTOR_INFORMATION, CHANGE_DISTRIBUTOR_STAT, CHANGE_ACTIVATION_COMMISSION, REMOVE_LOT, REMOVE_SET, REMOVE_CARD, REVOKE_CARD`.

**Routes** — `LOG_ROUTES`, `BASE: '/logs'`:
- `GET_ALL: '/'`

**Queries / Params**
- `GetLogsQuerySchema` → `GetLogsQuery` = `{ page?, limit?, userId?: uuid, actionType?: LogActionType, dateFrom?: iso.datetime, dateTo?: iso.datetime, search?: string }`.

**DTOs**
- `LogResponseSchema` → `LogDTO` = `{ id: uuid, actionType: LogActionType, actionDescription: string, userName: string, createdAt: iso.datetime }`.
- Paginated wrapper via `paginated(LogResponseSchema)`.

**Events:** none. **Excluded sensitive fields:** none — `userName` is the resolved display name only.

**Cross-module dependencies:** `common`.

---

## Part 3 — Root barrel & build artefacts

### `src/index.ts`

Re-exports `common/*` and every module barrel. **Order** in the file mirrors the dependency map (foundation → identity → catalog → inventory → activation → cross-cutting), so a reader can trace the type graph top-to-bottom.

### `package.json` (planned, not authored here)

- Workspace name: `@my-app/contract`.
- Dependencies: `zod` (the version the monorepo pins — plan assumes **Zod 4**; if the repo lands on Zod 3, the deprecated `z.string().email()` / `z.string().datetime()` chained forms are used consistently, per `contract-rules.md §3.7`).
- Dev dependencies: `typescript`, `madge` (for the §6 no-cycle check).
- No runtime dependency on Prisma, Express, Argon2, or any backend framework — `contract-rules.md` hard constraint.

### `tsconfig.json`

Strict baseline from `contract-rules.md §3.8`:
- `strict: true`
- `noUncheckedIndexedAccess: true`
- `noImplicitOverride: true`
- `exactOptionalPropertyTypes: true`
- `verbatimModuleSyntax: true`

Plus the workspace defaults — `target` ES2022, `module` ESNext, `moduleResolution` bundler/NodeNext per the monorepo's existing apps.

---

## Part 4 — Validation checklist mapping (`contract-rules.md §6`)

This is the contract the *next* phases must satisfy. Listing it here so sprint planning can copy it directly:

1. **Zero logic** — no functions with behaviour. ✔ Only the `paginated()` factory and re-exports.
2. **Schemas are the source** — every input/output type via `z.infer`. ✔ Planned for every DTO/command/query above.
3. **Strict types** — `tsc --noEmit` clean. ✔ Strict baseline pinned in Part 3.
4. **No magic strings** — routes + fixed values via constants/enums. ✔ All routes named in Part 2; the `StatisticsPeriod` enum closes the only spec-open string set.
5. **No sensitive data in any DTO** — except the three §0-sanctioned exposures, all narrow and documented.
6. **Dates are ISO strings.** ✔ Every `iso.datetime()` use noted above; no `z.date()` planned.
7. **Lint clean.** ✔ No exceptions planned.
8. **No circular dependencies.** ✔ Dependency map is a DAG (foundation → modules → statistics).
9. **Everything exported.** ✔ Each module barrel re-exports its files; root barrel re-exports each module.
10. **Commit on green.** Operational rule for the execute phase, not the plan.

---

## Part 5 — Open items for Phase 02 (sprint planning)

Items deliberately deferred because they are sprinting decisions, not architecture:

- **Field-label resolver** for activation account fields. The spec calls for `{ fieldLabel, value }` pairs in DTOs but `fieldLabel` is locale-dependent. The contract defines the *shape* (`string`); whether the backend resolves labels server-side or the frontend looks them up from a label-bag belongs to Stage 2/3. (Plan assumes server-side resolution since the spec describes it that way; nothing in the contract precludes the other choice.)
- **Pagination defaults.** Every list query carries `page`/`limit` as optional `coerce.number`. Defaults (e.g. `page=1`, `limit=10`) are encoded at the schema level (`.default(1)`, `.default(10)`) so the parsed query is always concrete — but the **upper bound on `limit`** (the spec mentions 100 in some places, leaves it open in others) needs a single project-wide rule decided in Phase 02. Plan reserves `min(1).max(100)` as the working default.
- **Status code mapping.** `ErrorCode` enum lives in the contract; the HTTP-status mapping (`AUTH_FORBIDDEN → 403`, etc.) is a backend concern. The plan does not enumerate it.
- **Re-exports between modules** for shared schemas (e.g. `WilayaIdParamsSchema` from `geography` re-used by `statistics`). The mechanism is straightforward (`export { WilayaIdParamsSchema } from '../geography'`), but each re-export must be added consciously to avoid accidental coupling. Phase 02 to decide the exact re-export list.

Nothing in this list is blocking; the architecture above can be authored without resolving them.
