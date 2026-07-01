# Plan — Admin Module

> Stage 02 · Sub-02 · Phase 01 — vertical-slice plan. **No code.**
> Spec: `Module-Contracts/admin.md` · Rules: `module-implementation-rules.md`, `test-rules.md`.

---

## 1. Files to create (6-file architecture)

`apps/api/src/modules/admin/`

- [x] `admin.mapper.ts` — `Admin`+`User` → `AdminDTO`; credential responses
- [x] `admin.interface.ts` — `IAdminService`
- [x] `admin.service.ts` — getAll / create / getById / update / toggle / resetPassword / delete
- [ ] ~~`admin.listener.ts`~~ — none (spec §3: no events; audit is inline)
- [x] `admin.controller.ts` — 7 handlers
- [x] `admin.routes.ts` — composition root, mounted at `ADMIN_ROUTES.BASE` (`/admins`), **all routes Admin-only**

Reuses `UserMapper.toUserIdentityDTO` is **not** sufficient (AdminDTO adds `fullName`/`phone`/`userId`); Admin owns its own mapper that composes `Admin` + `User`.

---

## 2. Contract & Schema Analysis

**Entities:** `Admin` + underlying `User` (role `ADMIN`).

`AdminDTO = { id, userId, fullName, username, phone, isEnabled, lastLoginAt, createdAt }`

| `AdminDTO` field | Source | Mapping |
|---|---|---|
| `id` | `Admin.id` | pass-through |
| `userId` | `Admin.userId` | pass-through |
| `fullName`, `phone` | `Admin` | trim on persist |
| `isEnabled` | **`User.isEnabled`** | spec §5 composes from User; note `Admin.isEnabled` column also exists — **use `User.isEnabled`** as the source of truth (toggle flips `User.isEnabled`) |
| `username` | `User.username` | pass-through |
| `lastLoginAt` | `User.lastLoginAt` | `?.toISOString() ?? null` |
| `createdAt` | `User.createdAt` | `.toISOString()` |
| excluded | `User.password`, `deletedAt` | never serialized |

> **Schema note (flag):** `Admin.isEnabled` duplicates `User.isEnabled`. The spec drives status off `User`. Recommend toggling/reading **only `User.isEnabled`** and treating `Admin.isEnabled` as vestigial (or keeping both in sync inside the transaction). Confirm before coding.

**Routes (`ADMIN_ROUTES`, BASE `/admins`, all Admin-only):**

| Constant | Method/Path | Input schema | Output |
|---|---|---|---|
| `GET_ALL` | GET `/` | query `GetAdminsQuerySchema` | `{ items: AdminDTO[], meta }` (paginated) |
| `CREATE` | POST `/` | body `CreateAdminSchema` | `AdminWithCredentialsDTO` (201) |
| `GET_BY_ID` | GET `/:id` | params `AdminIdParamsSchema` | `AdminDTO` |
| `UPDATE` | PATCH `/:id` | params + body `UpdateAdminSchema` | `AdminDTO` |
| `TOGGLE` | POST `/:id/toggle` | params | `AdminDTO` |
| `RESET_PASSWORD` | POST `/:id/reset-password` | params | `AdminGeneratedPasswordDTO` |
| `DELETE` | DELETE `/:id` | params | none (204) |

**Sanctioned exception (already in contract):** `AdminWithCredentialsDTO`/`AdminGeneratedPasswordDTO` carry a one-time plaintext `generatedPassword` (§0.1.1). Generated, returned once, stored only as a hash.

---

## 3. Component Definition

### `admin.interface.ts` — `IAdminService`
Every mutating method takes the **acting principal id** (`actorId: string`) for the `Log` author and the self-delete guard.
- `getAll(query: GetAdminsQuery): Promise<PaginatedResult<AdminDTO>>`
- `create(cmd: CreateAdminCommand, actorId: string): Promise<AdminWithCredentialsDTO>`
- `getById(id: string): Promise<AdminDTO>`
- `update(id: string, cmd: UpdateAdminCommand, actorId: string): Promise<AdminDTO>`
- `toggle(id: string, actorId: string): Promise<AdminDTO>`
- `resetPassword(id: string, actorId: string): Promise<AdminGeneratedPasswordDTO>`
- `delete(id: string, actorId: string): Promise<void>`

### `admin.service.ts` (injects `PrismaClient`)
- **getAll** — query `Admin` join `User` (Prisma `select` only needed fields); `search` over `fullName`/`username`/`phone` (case-insensitive, `User.deletedAt` null); paginate (`skip`/`take` from `page`/`limit`), count total, build `meta`, map each row.
- **create** — username uniqueness across **all** `User` (→ `ConflictError`/`RESOURCE_CONFLICT`) → generate temp password → bcrypt hash → `prisma.$transaction`: create `User`(role `ADMIN`, `isEnabled true`, hashed pw) → create `Admin`(profile) → write `Log` `CHANGE_USER_INFORMATION` (`userId = actorId`) → return `AdminDTO` + plaintext temp pw (once).
- **getById** — load `Admin`+`User` (deletedAt null) or `NotFoundError`.
- **update** — load → if `username` changing, re-check uniqueness (`RESOURCE_CONFLICT`) → update `Admin`/`User` fields (trim) → `Log` `CHANGE_USER_INFORMATION` → return.
- **toggle** — flip `User.isEnabled` → `Log` `CHANGE_USER_STAT` → return.
- **resetPassword** — generate temp pw → hash → update `User.password` → `Log` `CHANGE_USER_PASSWORD` → return plaintext once.
- **delete** — guard: `id`'s `userId === actorId` → `ForbiddenError`/`AUTH_FORBIDDEN` (cannot delete self); cannot delete the **last enabled admin** (count enabled, non-deleted admins; if ≤1 → `ConflictError`) → soft-delete (`User.deletedAt = now`; cascade/also mark `Admin`). **No log** (no `DELETE_USER` action type exists).

### `admin.mapper.ts`
- `toDTO(admin, user): AdminDTO` → `AdminResponseSchema.parse`; composes the two entities; excludes `password`/`deletedAt`.
- `toWithCredentialsDTO(admin, user, generatedPassword)` → `AdminWithCredentialsResponseSchema.parse`.
- `toGeneratedPasswordDTO(generatedPassword)` → `AdminGeneratedPasswordResponseSchema.parse`.
- `toPersistence(cmd)` → trim `username`/`phone`/`fullName` (hashing done in the service).

### `admin.controller.ts` (injects `IAdminService`)
Thin handlers; read `req.validated`; pass `req.user.id` as `actorId` for mutations; status `201` create, `200` reads/updates/toggle/reset, `204` delete. `try/catch → next`.

### `admin.routes.ts` (composition root)
```
service = new AdminService(prisma); controller = new AdminController(service)
const adminOnly = requireAuth({ roles: [UserRole.ADMIN] })
router.get   (GET_ALL,        adminOnly, validateRequest({ query: GetAdminsQuerySchema }),                controller.getAll)
router.post  (CREATE,         adminOnly, validateRequest({ body: CreateAdminSchema }),                    controller.create)
router.get   (GET_BY_ID,      adminOnly, validateRequest({ params: AdminIdParamsSchema }),                controller.getById)
router.patch (UPDATE,         adminOnly, validateRequest({ params: AdminIdParamsSchema, body: UpdateAdminSchema }), controller.update)
router.post  (TOGGLE,         adminOnly, validateRequest({ params: AdminIdParamsSchema }),                controller.toggle)
router.post  (RESET_PASSWORD, adminOnly, validateRequest({ params: AdminIdParamsSchema }),                controller.resetPassword)
router.delete(DELETE,         adminOnly, validateRequest({ params: AdminIdParamsSchema }),                controller.delete)
```
Note: `GET_ALL`/`CREATE` share path `/`, and `GET_BY_ID`/`UPDATE`/`DELETE` share `/:id` — distinguished by verb. Mount at `ADMIN_ROUTES.BASE`.

---

## 4. Events
None (spec §3). Audit logging is **inline** `Log` writes in the service. **No listener.** Realtime untouched.

---

## 5. Foundation corrections (confirmed — do first)

Framework changes, now **confirmed**. Full instructions in **`plan-00-foundation.md`**; Admin depends on:

- **FC-1 — Argon2id** (`hashPassword` for create + reset password).
- **FC-4 — temp-password generator** (`generateTempPassword`) for create + reset; returned once, hashed before persist, never logged plaintext.
- **FC-5 — pagination helper** (`buildPaginationMeta`); `getAll` returns `{ items, meta }` via `sendSuccess`.
- **FC-6 — app router registry**: mount `adminRouter` at `ADMIN_ROUTES.BASE`; conformance coverage.
- **FC-8 — `Admin.isEnabled` single source of truth**: read status from `User.isEnabled`; keep `Admin.isEnabled` in sync inside the transaction.

**Module-local (not framework):** inline `Log` writes — the Admin service writes `Log` rows directly (`actionType`, `actionDescription` composed by the service, `userId = actorId`) inside/after the transaction. No Log service is introduced.

---

## 6. Test Strategy (`test/`)

**Factories** (`test/data/admin.factory.ts`)
- `createAdminPayload(overrides)` → `CreateAdminCommand` (faker `fullName`/`username`/`phone`).
- `seedAdmin(prisma, overrides)` → persists `User`(ADMIN)+`Admin` for integration; returns ids.

**Unit — service (mock Prisma)** (`test/unit/modules/admin/admin.service.spec.ts`)
- create: duplicate username → `RESOURCE_CONFLICT`; success → transaction called, returns one-time pw, `Log CHANGE_USER_INFORMATION` written.
- getById/update/toggle/reset on unknown id → `RESOURCE_NOT_FOUND`.
- toggle → flips `isEnabled`, logs `CHANGE_USER_STAT`.
- resetPassword → new pw hashed, logs `CHANGE_USER_PASSWORD`.
- delete self → `AUTH_FORBIDDEN`; delete last enabled admin → `RESOURCE_CONFLICT`; otherwise soft-delete (sets `deletedAt`).

**Unit — mapper**: `AdminDTO` parses against `AdminResponseSchema`; no `password`/`deletedAt`; dates ISO.

**Integration** (`test/integration/admin.integration.spec.ts`, authed as admin via `auth.fixture`)
- 200 list (admin); **403** `AUTH_FORBIDDEN` for a non-admin (activator) principal.
- 201 create returns `AdminDTO` + one-time password; **409** on duplicate username.
- 200 update; 409 on username collision.
- 200 toggle flips status.
- 200 reset-password returns a new one-time password.
- **403** deleting self; **409** deleting the last admin; **200/204** otherwise (soft delete; row hidden from subsequent list/get).
- **404** unknown id on get/update/toggle/reset/delete.

**Contract conformance**: assert all `ADMIN_ROUTES` registered; parse a `create`/`getById` `res.body.data` through `AdminResponseSchema` / `AdminWithCredentialsResponseSchema`.
