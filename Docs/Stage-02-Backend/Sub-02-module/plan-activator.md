# Plan — Activator Module

> Stage 02 · Sub-02 · Phase 01 — vertical-slice plan. **No code.**
> Spec: `Module-Contracts/activator.md` · Rules: `module-implementation-rules.md`, `test-rules.md`.

---

## 1. Files to create (6-file architecture)

`apps/api/src/modules/activator/`

- [x] `activator.mapper.ts` — `Activator`+`User`(+derived) → DTOs; `Decimal`→number
- [x] `activator.interface.ts` — `IActivatorService`
- [x] `activator.service.ts` — getAll / create / getById / update / toggle / resetPassword / delete / performance / myStats
- [ ] ~~`activator.listener.ts`~~ — none (spec §3: no events here; activation realtime lives in the Activation module)
- [x] `activator.controller.ts` — 9 handlers
- [x] `activator.routes.ts` — composition root, mounted at `ACTIVATOR_ROUTES.BASE` (`/activators`)

**Scope guard (spec):** the work-queue, history, and take/flag/activate/cancel/freeze actions are the **Activation** module — NOT here. This module owns the activator entity, its admin management, and the activator's own dashboard stats. Derived fields read from `Activation`/`Payment` but mutate neither.

---

## 2. Contract & Schema Analysis

**Entities:** `Activator` + underlying `User` (role `ACTIVATOR`); reads `Activation` (counts/avg/success/series) and `Payment` (`totalPaid`).

`ActivatorDTO = { id, userId, fullName, username, phone, isEnabled, totalEarning, credits, nbOfActivation, nbOfSuccessfulActivation, avgActivationTimeSeconds, lastLoginAt, createdAt }`
`ActivatorDetailDTO = ActivatorDTO + { totalPaid, creditsOwed, successRate }`

| DTO field | Source | Mapping |
|---|---|---|
| `id`,`userId`,`fullName`,`phone` | `Activator` | pass-through (trim on persist) |
| `username`,`isEnabled`,`lastLoginAt`,`createdAt` | `User` | dates → ISO; `isEnabled` from `User` |
| `totalEarning`,`credits` | `Activator` (`Decimal`) | **`Decimal`→number, 2dp (DZD)** |
| `nbOfActivation`,`nbOfSuccessfulActivation` | `Activator` | int pass-through |
| `avgActivationTimeSeconds` | **derived** | `avg(completedAt − takenAt)` over completed activations; `null` if none |
| `totalPaid` (detail) | **derived** | sum of non-deleted `Payment.totalAmount` (`isDeleted=false`) |
| `creditsOwed` (detail) | = `credits` | mirror |
| `successRate` (detail) | **derived** | `nbOfSuccessfulActivation / nbOfActivation` (guard ÷0 → 0) |
| excluded | `User.password`, `deletedAt` | never serialized |

> Derived fields are **computed, not stored**. `avgActivationTimeSeconds` basis = `takenAt → completedAt` (consistent with commission tiers). `Decimal`→number must be 2dp.

**Routes (`ACTIVATOR_ROUTES`, BASE `/activators`):**

| Constant | Method/Path | Access | Input | Output |
|---|---|---|---|---|
| `GET_ALL` | GET `/` | Admin | query `GetActivatorsQuerySchema` | `{ items: ActivatorDTO[], meta }` |
| `CREATE` | POST `/` | Admin | body `CreateActivatorSchema` | `ActivatorWithCredentialsDTO` (201) |
| `GET_BY_ID` | GET `/:id` | Admin | params `ActivatorIdParamsSchema` | `ActivatorDetailDTO` |
| `UPDATE` | PATCH `/:id` | Admin | params + body `UpdateActivatorSchema` | `ActivatorDTO` |
| `TOGGLE` | POST `/:id/toggle` | Admin | params | `ActivatorDTO` |
| `RESET_PASSWORD` | POST `/:id/reset-password` | Admin | params | `ActivatorGeneratedPasswordDTO` |
| `DELETE` | DELETE `/:id` | Admin | params | none (204) |
| `PERFORMANCE` | GET `/:id/performance` | Admin | params + query `ActivatorPerformanceQuerySchema` | `ActivatorPerformanceDTO` |
| `MY_STATS` | GET `/me/stats` | Activator (self) | — (principal) | `ActivatorDashboardDTO` |

**Route-order caveat:** `/me/stats` must be registered **before** `/:id` (and `/:id/...`) or Express will match `me` as an `:id` (and fail uuid validation). Register `MY_STATS` first.

**Sanctioned exception (in contract):** `ActivatorWithCredentialsDTO`/`ActivatorGeneratedPasswordDTO` one-time plaintext `generatedPassword`. The stored login password is **never** in any DTO — the admin table's "reveal password" can only show the one-time create/reset value.

---

## 3. Component Definition

### `activator.interface.ts` — `IActivatorService`
Mutations take `actorId` (Log author).
- `getAll(query): Promise<PaginatedResult<ActivatorDTO>>`
- `create(cmd, actorId): Promise<ActivatorWithCredentialsDTO>`
- `getById(id): Promise<ActivatorDetailDTO>`
- `update(id, cmd, actorId): Promise<ActivatorDTO>`
- `toggle(id, actorId): Promise<ActivatorDTO>`
- `resetPassword(id, actorId): Promise<ActivatorGeneratedPasswordDTO>`
- `delete(id, actorId): Promise<void>`
- `performance(id, query): Promise<ActivatorPerformanceDTO>`
- `myStats(principalUserId): Promise<ActivatorDashboardDTO>`

### `activator.service.ts` (injects `PrismaClient`)
- **getAll** — `Activator` join `User`; `search` (fullName/username/phone, deletedAt null); paginate; derive `avgActivationTimeSeconds` per row from completed activations; map. Header sums (total successful, total credits owed) come from the same aggregate.
- **create** — username uniqueness across **all** users (→ `RESOURCE_CONFLICT`) → temp pw → bcrypt hash → `$transaction`: create `User`(role `ACTIVATOR`) → create `Activator`(profile, `initialCredits`→`credits`, counters 0) → `Log CHANGE_USER_INFORMATION` (`userId=actorId`) → return `ActivatorDTO` + one-time pw.
- **getById** — load `Activator`+`User` → derive `avgActivationTimeSeconds`, `successRate`, `totalPaid` (sum non-deleted `Payment`) → `ActivatorDetailDTO` or `RESOURCE_NOT_FOUND`.
- **update** — load → username uniqueness if changing → update (trim) → `Log CHANGE_USER_INFORMATION`.
- **toggle** — flip `User.isEnabled` → `Log CHANGE_USER_STAT`.
- **resetPassword** — generate+hash → update `User.password` → `Log CHANGE_USER_PASSWORD` → one-time pw.
- **delete** — soft-delete `User` (+`Activator`). Edge (optional): block with `RESOURCE_CONFLICT` if the activator has in-progress activations (`PROCESSING`/`WRONG_INFORMATION`/`ADDITIONAL_INFORMATION`/`FREEZE`).
- **performance** — aggregate the activator's `ACTIVATED` activations per day over N days (default 30) → `{ date, count, earned }[]`.
- **myStats** — principal must be an activator → read own `Activator` → derive `totalEarnings`, `creditsBalance`, `totalActivations`, `activationsToday`, `avgActivationTimeSeconds`, `weekly: { date, count }[]`, `earningsTrendPercent` (vs previous period), `activeSlotsUsed` = count of own activations in `PROCESSING`/`WRONG_INFORMATION`/`ADDITIONAL_INFORMATION`/`FREEZE`. If the principal has no `Activator` row → `AUTH_FORBIDDEN`.

### `activator.mapper.ts`
- `toDTO(activator, user, derived)` → `ActivatorResponseSchema.parse`; `Decimal`→number(2dp).
- `toDetailDTO(activator, user, derived)` → `ActivatorDetailResponseSchema.parse`.
- `toWithCredentialsDTO(...)`, `toGeneratedPasswordDTO(...)`, `toPerformanceDTO(series)`, `toDashboardDTO(stats)` → each `.parse` its schema.
- `toPersistence(cmd)` → `initialCredits`→`credits`; trim username/phone/fullName; hashing in service.
- Helper: `decimalToNumber(d)` → `Number(d.toFixed(2))` (or Prisma `Decimal.toNumber()` rounded).

### `activator.controller.ts` (injects `IActivatorService`)
Thin; read `req.validated`; pass `req.user.id` as `actorId` (mutations) and as `principalUserId` (`myStats`). `201` create, `200` reads/updates, `204` delete. `try/catch → next`.

### `activator.routes.ts` (composition root)
```
const adminOnly = requireAuth({ roles: [UserRole.ADMIN] })
const activatorOnly = requireAuth({ roles: [UserRole.ACTIVATOR] })
router.get   (MY_STATS,       activatorOnly, controller.myStats)              // BEFORE /:id
router.get   (GET_ALL,        adminOnly, validateRequest({ query: GetActivatorsQuerySchema }),  controller.getAll)
router.post  (CREATE,         adminOnly, validateRequest({ body: CreateActivatorSchema }),      controller.create)
router.get   (GET_BY_ID,      adminOnly, validateRequest({ params: ActivatorIdParamsSchema }),  controller.getById)
router.patch (UPDATE,         adminOnly, validateRequest({ params: ActivatorIdParamsSchema, body: UpdateActivatorSchema }), controller.update)
router.post  (TOGGLE,         adminOnly, validateRequest({ params: ActivatorIdParamsSchema }),  controller.toggle)
router.post  (RESET_PASSWORD, adminOnly, validateRequest({ params: ActivatorIdParamsSchema }),  controller.resetPassword)
router.delete(DELETE,         adminOnly, validateRequest({ params: ActivatorIdParamsSchema }),  controller.delete)
router.get   (PERFORMANCE,    adminOnly, validateRequest({ params: ActivatorIdParamsSchema, query: ActivatorPerformanceQuerySchema }), controller.performance)
```
Mount at `ACTIVATOR_ROUTES.BASE`.

---

## 4. Events
None here (spec §3) — activation realtime events belong to the Activation module; audit logging is inline. **No listener.** This module emits nothing to the bus / does not touch `common/realtime/`.

---

## 5. Foundation corrections (confirmed — do first)

Framework changes, now **confirmed**. Full instructions in **`plan-00-foundation.md`**; Activator depends on:

- **FC-1 — Argon2id** (`hashPassword` for create + reset).
- **FC-4 — temp-password generator** (`generateTempPassword`) for create + reset.
- **FC-5 — pagination helper**; `getAll` returns `{ items, meta }`.
- **FC-6 — app router registry**: mount `activatorRouter` at `ACTIVATOR_ROUTES.BASE`; conformance coverage.

**Module-local (not framework):**
- **Inline `Log` writes** — service writes `Log` rows directly (`userId = actorId`).
- **`Decimal` serialization** — centralize a `decimalToNumber(d) → Number(d.toFixed(2))` helper in this module's mapper (DZD, 2dp).
- **Cross-module reads** — `Activation`/`Payment` queries here are **read-only** aggregates. Coordinate field names with the Activation module plan so derived computations stay consistent (avg time basis `takenAt→completedAt`; `ACTIVATED` for performance).

---

## 6. Test Strategy (`test/`)

**Factories** (`test/data/activator.factory.ts`)
- `createActivatorPayload(overrides)` → `CreateActivatorCommand` (incl. optional `initialCredits`).
- `seedActivator(prisma, overrides)` → persists `User`(ACTIVATOR)+`Activator`; helpers to seed `Activation`/`Payment` rows for derived-field tests (no hardcoded ids).

**Unit — service (mock Prisma)** (`test/unit/modules/activator/activator.service.spec.ts`)
- create: duplicate username → `RESOURCE_CONFLICT`; success → `initialCredits`→`credits`, counters 0, one-time pw, `Log CHANGE_USER_INFORMATION`.
- getById: `successRate = succ/total` (and ÷0 → 0), `totalPaid` excludes `isDeleted` payments; unknown → `RESOURCE_NOT_FOUND`.
- update/toggle/reset → matching log types written.
- myStats: non-activator principal → `AUTH_FORBIDDEN`; `activeSlotsUsed` counts only the four in-progress states.
- delete: soft-deletes; optional 409 when in-progress activations exist.

**Unit — mapper**: `ActivatorDTO`/`ActivatorDetailDTO` parse against schemas; `Decimal`→number 2dp; no `password`; `avgActivationTimeSeconds` null when no completed activations.

**Integration** (`test/integration/activator.integration.spec.ts`)
- 200 list (admin) with derived avg time + header sums; **403** for non-admin.
- 201 create → one-time pw; **409** duplicate username.
- 200 detail with `successRate`/`totalPaid`/`creditsOwed`; **404** unknown id.
- 200 update / toggle / reset-password each persist + correct log.
- 200 `myStats` for an activator principal (`activeSlotsUsed` reflects in-progress); **403** admin (or any non-activator) hitting `/me/stats`.
- 200 `performance` returns a `{date,count,earned}[]` series for N days.
- delete soft-deletes; optional **409** with in-progress activations.

**Contract conformance**: assert all `ACTIVATOR_ROUTES` registered; parse `getById` `res.body.data` through `ActivatorDetailResponseSchema`, `myStats` through `ActivatorDashboardResponseSchema`.
