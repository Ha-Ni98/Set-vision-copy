# Set 1 — DISTRIBUTOR role & optional distributor login accounts

**Session:** Set 1 (plan only — no production code written) · **Date:** 2026-08-09 · **Branch:** `version-02-01`
**Inputs read:** `.claude/CLAUDE.md`, `Docs/Stage-04-fix/plan/v2-decisions.md`, `Docs/Stage-01-Contract/contract-rules.md`, `Docs/Stage-02-Backend/back-end-rules.md`, `Docs/Stage-03-Frontend/front-end-rules.md`, `Docs/Stage-04-fix/new-features-fixes/version-2-description.md` (Set 1 section).

**Scope guardrails for this set (restated so execution can't drift):** no order requests, no revocation requests, no dashboard content, no Telegram fields. `/portal` is an empty shell. No distributor-scoped read endpoints (Set 7 owns those).

**Audit basis:** all 15 backend `*.routes.ts` files read line-by-line; all 19 contract route-constant maps; `auth.middleware.ts`, `auth.service.ts`, `activator.service.ts`, `distributor.{service,mapper,controller,interface}.ts`; `server.ts`, `common/realtime/*`; `App.tsx`, `ProtectedRoute.tsx`, `AdminGuard.tsx`, `AuthProvider.tsx`, `nav-links.ts`, `lib/realtime.ts`, `LoginPage.tsx`; the activator create-account UI chain (`ActivatorsPage` → `CreateActivatorModal` → `create-activator.schema.ts` → `GeneratedPasswordPanel`); and every `prisma.distributor` / `distributorId` reference in `Apps/api/src`.

---

## 1. Prisma diff + migration

### 1.1 Enum: `UserRole`

```diff
 enum UserRole {
   ADMIN
   ACTIVATOR
+  DISTRIBUTOR
 }
```

Must stay byte-identical to `Apps/contract/src/modules/user/user.enums.ts` (§2.1). Appended last — Postgres enum ordering is only used for sorting, and nothing sorts by `role`.

### 1.2 Enum: `LogActionType`

```diff
   REMOVE_CARD
   REVOKE_CARD
+  LINK_USER_ACCOUNT
+  UNLINK_USER_ACCOUNT
 }
```

**Naming rationale:** the existing account-operation family is already role-neutral (`CHANGE_USER_PASSWORD`, `CHANGE_USER_STAT`, `CHANGE_USER_INFORMATION`) even though it is written from both `admin.service` and `activator.service`. `LINK_USER_ACCOUNT` / `UNLINK_USER_ACCOUNT` joins that family rather than starting a distributor-specific one, and leaves room for D7's Telegram link/unlink to extend the same batch in Set 6 (v2-decisions A2). See **Q1** if you want `LINK_DISTRIBUTOR_ACCOUNT` instead.

### 1.3 Model: `Distributor`

```diff
 model Distributor {
   id              String    @id @default(uuid())
+  userId          String?   @unique // nullable: inventory-only distributors have no login
   fullName        String
   storeName       String
   phone           String?
   ...
   deletedAt       DateTime?

+  user    User?   @relation(fields: [userId], references: [id], onDelete: SetNull)
   wilaya  Wilaya  @relation(fields: [wilayaId], references: [id])
   commune Commune @relation(fields: [communeId], references: [id])
   cards   Card[]
   orders  Order[]

   @@index([wilayaId])
   @@index([communeId])
   @@index([isEnabled])
 }
```

### 1.4 Model: `User`

```diff
   admin         Admin?
   activator     Activator?
+  distributor   Distributor?
   refreshTokens RefreshToken[]
   logs          Log[]
```

### 1.5 Indexes

**No new `@@index` is added.** `userId String? @unique` already creates a unique B-tree index, which serves both the uniqueness constraint and the one lookup that needs it (`realtime-gateway` + `auth.me()` resolving `User.id → Distributor`). Postgres allows multiple `NULL`s under a unique index, so any number of account-less distributors coexist.

### 1.6 `onDelete` choice — deliberate, and different from `Activator`

`Admin` and `Activator` use `onDelete: Cascade` because the profile row is *owned by* the `User` — no user, no profile. The relationship here is inverted: the `Distributor` owns itself and the `User` is an optional attachment. `Cascade` would delete a distributor (with its orders and cards) when its login is removed. **`SetNull` is required**, and it also makes a future hard-delete of the user row safe.

### 1.7 Migration

Name: **`add_distributor_role_and_account`** → `prisma/migrations/<timestamp>_add_distributor_role_and_account/`.

Contents: two `ALTER TYPE ... ADD VALUE`, one `ALTER TABLE "Distributor" ADD COLUMN "userId" TEXT`, one unique index, one FK.

**Postgres caveat the executing session must handle:** `ALTER TYPE ... ADD VALUE` cannot run inside a transaction block in PG < 12, and Prisma wraps migrations in one. On PG 12+ it is allowed as long as the new value is not *used* in the same transaction — which it isn't here (no data backfill references `DISTRIBUTOR`). If `prisma migrate dev` errors on the enum, the fallback per CLAUDE.md is `prisma migrate reset` + reseed, which is explicitly sanctioned (throwaway data).

**Reseed:** `load_wilaya` → `load_commission_durations` → `create_admin_account` → `load_mock_data`. **No seed script needs updating** — the only new column is nullable and no existing required field changes. Note for the report: `scripts/load-mock-data.ts:40` imports `seedDistributor` from `test/data/distributor.factory`, i.e. the seed path depends on a **frozen** test file. This set does not need to touch it; a future set that makes a distributor field required would.

---

## 2. Contract diff

Build order: contract changes land before any backend change. `madge --circular src` must be re-run — no new cross-module imports are introduced, so it should stay clean.

### 2.1 `modules/user/` — one line

| File | Change |
|---|---|
| `user.enums.ts` | `UserRole` += `DISTRIBUTOR = 'DISTRIBUTOR'` |
| `user.dtos.ts` | **none** |
| `user/index.ts` | **none** |

**Propagates automatically, no edit needed:** `common/auth.ts` (`JWTPayloadSchema.role = z.enum(UserRole)`), `auth.dtos.ts` (`AuthTokensResponseSchema.role`, `SessionUserResponseSchema.role`). Both accept `DISTRIBUTOR` the moment the enum grows.

### 2.2 `modules/log/`

| File | Change |
|---|---|
| `log.enums.ts` | `LogActionType` += `LINK_USER_ACCOUNT`, `UNLINK_USER_ACCOUNT` |

### 2.3 `modules/distributor/`

**`distributor.routes.ts`** — two new constants:

```diff
 export const DISTRIBUTOR_ROUTES = {
   BASE: '/distributors',
   ...
   DELETE: '/:id',
+  CREATE_ACCOUNT: '/:id/account',
+  UNLINK_ACCOUNT: '/:id/account',
 } as const;
```

`POST /:id/account` and `DELETE /:id/account` — same path, two methods, mirroring how `ACTIVATOR_ROUTES.UPDATE` and `DELETE` already share `'/:id'`. No Express param-shadow risk (`/:id/account` is strictly more specific than `/:id`).

**`distributor.command.ts`** — one new schema, mirroring `CreateActivatorSchema`:

```ts
export const CreateDistributorAccountSchema = z.object({
  username: z.string(),
  // Optional admin-chosen password, exactly as CreateActivatorSchema:
  // omit it to let the server generate one and return it once.
  password: z.string().min(8).optional(),
});
export type CreateDistributorAccountCommand = z.infer<typeof CreateDistributorAccountSchema>;
```

No command for unlink — the path param is the whole input.

**`distributor.dtos.ts`** — two fields on the base response, one new DTO:

```diff
 export const DistributorResponseSchema = z.object({
   id: z.uuid(),
+  // Account fields: null/false for inventory-only distributors (D2).
+  hasAccount: z.boolean(),
+  username: z.string().nullable(),
   fullName: z.string(),
   ...
 });
```

`DistributorDetailResponseSchema` extends `DistributorResponseSchema`, so it inherits both — no separate edit. `PaginatedDistributorsSchema` likewise.

```ts
// Sanctioned §0.1.1 exception: one-time create-account response.
// Byte-for-byte the shape of ActivatorWithCredentialsResponseSchema.
export const DistributorWithCredentialsResponseSchema = z.object({
  distributor: DistributorResponseSchema,
  generatedPassword: z.string(),
});
export type DistributorWithCredentialsDTO = z.infer<typeof DistributorWithCredentialsResponseSchema>;
```

**`distributor.query.ts`** — no change. `DistributorIdParamsSchema` covers both new routes.
**`distributor/index.ts`** — no change (already `export *` for routes/command/query/dtos).

### 2.4 Rule compliance

- Zero logic added; every type is `z.infer` of a schema. ✅
- No date fields added, so no `z.iso.datetime()` question. ✅
- `generatedPassword` in a DTO is the **same sanctioned §0.1.1 one-time-create exception** the activator module already carries, and is documented with the same comment. It is a credential we mint and hand to its owner once — not a stored secret read back. ✅
- No new file is created in `modules/distributor/` (no `events.ts` — this set publishes no distributor events). ✅

---

## 3. Backend — the route × roles table

> **This is the deliverable. Read it row by row. Ninety-two routes exist today; ninety-four after this set. Exactly two rows are new and both are `ADMIN`. Zero existing rows widen.**

Guard vocabulary in the code: `adminOnly = requireAuth({ roles: [ADMIN] })`, `activatorOnly = requireAuth({ roles: [ACTIVATOR] })`, `activatorOrAdmin = requireAuth({ roles: [ACTIVATOR, ADMIN] })`, bare `requireAuth()` = any authenticated principal, no guard = public.

Paths below are relative to `env.API_PREFIX` (`/api/v1`).

### 3.1 `auth` — `/auth` (the only place the new role changes behaviour)

| # | Method | Path | Current roles | **After Set 1** | Δ |
|---|---|---|---|---|---|
| 1 | POST | `/auth/login` | PUBLIC (+ `loginRateLimiter`) | PUBLIC | — (a `DISTRIBUTOR` user can now authenticate — the point of the set) |
| 2 | POST | `/auth/refresh` | PUBLIC | PUBLIC | — |
| 3 | POST | `/auth/logout` | **any authenticated** | **any authenticated** | now includes DISTRIBUTOR — **intended** |
| 4 | GET | `/auth/me` | **any authenticated** | **any authenticated** | now includes DISTRIBUTOR — **intended, and requires the `me()` fix in §3.9** |

Rows 3–4 are the only two routes in the whole API that do not name an explicit roles array. They are correct as-is: both are self-scoped (`req.user.id`), neither reads another principal's data.

### 3.2 `admin` — `/admins`

| # | Method | Path | Current | **After** | Δ |
|---|---|---|---|---|---|
| 5 | GET | `/admins/` | ADMIN | ADMIN | — |
| 6 | POST | `/admins/` | ADMIN | ADMIN | — |
| 7 | GET | `/admins/:id` | ADMIN | ADMIN | — |
| 8 | PATCH | `/admins/:id` | ADMIN | ADMIN | — |
| 9 | POST | `/admins/:id/toggle` | ADMIN | ADMIN | — |
| 10 | POST | `/admins/:id/reset-password` | ADMIN | ADMIN | — |
| 11 | DELETE | `/admins/:id` | ADMIN | ADMIN | — |

### 3.3 `activator` — `/activators`

| # | Method | Path | Current | **After** | Δ |
|---|---|---|---|---|---|
| 12 | GET | `/activators/me/stats` | ACTIVATOR | ACTIVATOR | — |
| 13 | GET | `/activators/` | ADMIN | ADMIN | — |
| 14 | POST | `/activators/` | ADMIN | ADMIN | — |
| 15 | GET | `/activators/:id` | ADMIN | ADMIN | — |
| 16 | PATCH | `/activators/:id` | ADMIN | ADMIN | — |
| 17 | POST | `/activators/:id/toggle` | ADMIN | ADMIN | — |
| 18 | POST | `/activators/:id/reset-password` | ADMIN | ADMIN | — |
| 19 | DELETE | `/activators/:id` | ADMIN | ADMIN | — |
| 20 | GET | `/activators/:id/performance` | ADMIN | ADMIN | — |

### 3.4 `activation` — `/keys` (public client surface)

| # | Method | Path | Current | **After** | Δ |
|---|---|---|---|---|---|
| 21 | POST | `/keys/verify` | PUBLIC | PUBLIC | — |
| 22 | POST | `/keys/submit` | PUBLIC | PUBLIC | — |
| 23 | POST | `/keys/:activationId/update` | PUBLIC | PUBLIC | — |
| 24 | POST | `/keys/:activationId/additional` | PUBLIC | PUBLIC | — |
| 25 | GET | `/keys/:activationId/status` | PUBLIC | PUBLIC | — |

Gated by knowledge of the card key, not by role. Untouched.

### 3.5 `activation` — `/activations`

| # | Method | Path | Current | **After** | Δ |
|---|---|---|---|---|---|
| 26 | GET | `/activations/pending` | ACTIVATOR + ADMIN | ACTIVATOR + ADMIN | **NEVER DISTRIBUTOR** ⚠️ |
| 27 | GET | `/activations/active` | ACTIVATOR | ACTIVATOR | — |
| 28 | GET | `/activations/my-history` | ACTIVATOR | ACTIVATOR | — |
| 29 | GET | `/activations/recent` | ACTIVATOR + ADMIN | ACTIVATOR + ADMIN | **NEVER DISTRIBUTOR** ⚠️ |
| 30 | GET | `/activations/` | ADMIN | ADMIN | — |
| 31 | GET | `/activations/:id` | ADMIN | ADMIN | — |
| 32 | POST | `/activations/:id/take` | ACTIVATOR | ACTIVATOR | — |
| 33 | POST | `/activations/:id/flag-wrong-info` | ACTIVATOR | ACTIVATOR | — |
| 34 | POST | `/activations/:id/request-additional` | ACTIVATOR | ACTIVATOR | — |
| 35 | POST | `/activations/:id/activate` | ACTIVATOR | ACTIVATOR | — |
| 36 | POST | `/activations/:id/cancel` | ACTIVATOR | ACTIVATOR | — |
| 37 | POST | `/activations/:id/release` | ACTIVATOR | ACTIVATOR | — |
| 38 | POST | `/activations/:id/freeze` | ACTIVATOR | ACTIVATOR | — |
| 39 | POST | `/activations/:id/activate-by-admin` | ADMIN | ADMIN | — |
| 40 | POST | `/activations/:id/cancel-by-admin` | ADMIN | ADMIN | — |
| 41 | POST | `/activations/:id/set-price` | ADMIN | ADMIN | — |

⚠️ **Rows 26 and 29 are the single most dangerous rows in this table** (v2-decisions R18). They are the only multi-role array in the codebase, and their service methods take **no viewer id** — `getPending()` and `getRecent()` return the *global* feed. Adding `DISTRIBUTOR` to `activatorOrAdmin` would hand every distributor every activation in the system, including other distributors' client data. **They stay `[ACTIVATOR, ADMIN]`.** Set 7's distributor-scoped activation list must be a *new, separately-scoped* endpoint, never a widening of these two.

### 3.6 Admin-only CRUD modules — all unchanged

| # | Method | Path | Current | **After** |
|---|---|---|---|---|
| 42 | GET | `/cards/` | ADMIN | ADMIN |
| 43 | GET | `/cards/available-for-lot` | ADMIN | ADMIN |
| 44 | GET | `/cards/:id` | ADMIN | ADMIN |
| 45 | DELETE | `/cards/:id` | ADMIN | ADMIN |
| 46 | POST | `/cards/:id/disable` | ADMIN | ADMIN |
| 47 | POST | `/cards/:id/enable` | ADMIN | ADMIN |
| 48 | POST | `/cards/:id/revoke` | ADMIN | ADMIN |
| 49 | GET | `/delivery-companies/` | ADMIN | ADMIN |
| 50 | POST | `/delivery-companies/` | ADMIN | ADMIN |
| 51 | PATCH | `/delivery-companies/:id` | ADMIN | ADMIN |
| 52 | POST | `/delivery-companies/:id/toggle` | ADMIN | ADMIN |
| 53 | GET | `/geography/wilayas` | ADMIN | ADMIN |
| 54 | GET | `/geography/wilayas/:wilayaId/communes` | ADMIN | ADMIN |
| 55 | GET | `/logs/` | ADMIN | ADMIN |
| 56 | GET | `/lots/available-for-order` | ADMIN | ADMIN |
| 57 | GET | `/lots/` | ADMIN | ADMIN |
| 58 | POST | `/lots/` | ADMIN | ADMIN |
| 59 | DELETE | `/lots/:id` | ADMIN | ADMIN |
| 60 | GET | `/orders/` | ADMIN | ADMIN |
| 61 | GET | `/orders/:id` | ADMIN | ADMIN |
| 62 | POST | `/orders/` | ADMIN | ADMIN |
| 63 | POST | `/orders/:id/transition` | ADMIN | ADMIN |
| 64 | DELETE | `/orders/:id` | ADMIN | ADMIN |
| 65 | GET | `/payments/` | ADMIN | ADMIN |
| 66 | POST | `/payments/` | ADMIN | ADMIN |
| 67 | DELETE | `/payments/:id` | ADMIN | ADMIN |
| 68 | GET | `/sets/` | ADMIN | ADMIN |
| 69 | POST | `/sets/` | ADMIN | ADMIN |
| 70 | POST | `/sets/:id/transition` | ADMIN | ADMIN |
| 71 | DELETE | `/sets/:id` | ADMIN | ADMIN |
| 72 | GET | `/statistics/dashboard` | ADMIN | ADMIN |
| 73 | GET | `/statistics/activators` | ADMIN | ADMIN |
| 74 | GET | `/statistics/distributors` | ADMIN | ADMIN |
| 75 | GET | `/statistics/inventory` | ADMIN | ADMIN |
| 76 | GET | `/statistics/orders` | ADMIN | ADMIN |
| 77 | GET | `/statistics/activations` | ADMIN | ADMIN |
| 78 | GET | `/statistics/overview` | ADMIN | ADMIN |
| 79 | GET | `/statistics/wilaya-heatmap` | ADMIN | ADMIN |
| 80 | GET | `/statistics/wilaya/:wilayaId` | ADMIN | ADMIN |
| 81 | GET | `/subscription-plans/commission-durations` | ADMIN | ADMIN |
| 82 | GET | `/subscription-plans/commissions` | ADMIN | ADMIN |
| 83 | PATCH | `/subscription-plans/commissions` | ADMIN | ADMIN |
| 84 | GET | `/subscription-plans/` | ADMIN | ADMIN |
| 85 | POST | `/subscription-plans/` | ADMIN | ADMIN |
| 86 | POST | `/subscription-plans/:id/toggle` | ADMIN | ADMIN |

`/statistics/distributors` (row 74) is the **admin's** distributor summary. It is not a distributor-facing route and does not widen.

### 3.7 `distributor` — `/distributors` (the only module gaining rows)

| # | Method | Path | Current | **After** | Δ |
|---|---|---|---|---|---|
| 87 | GET | `/distributors/` | ADMIN | ADMIN | — |
| 88 | POST | `/distributors/` | ADMIN | ADMIN | — |
| 89 | GET | `/distributors/:id` | ADMIN | ADMIN | — |
| 90 | PATCH | `/distributors/:id` | ADMIN | ADMIN | — |
| 91 | POST | `/distributors/:id/toggle` | ADMIN | ADMIN | — |
| 92 | DELETE | `/distributors/:id` | ADMIN | ADMIN | — |
| **93** | **POST** | **`/distributors/:id/account`** | *(new)* | **ADMIN** | **NEW** |
| **94** | **DELETE** | **`/distributors/:id/account`** | *(new)* | **ADMIN** | **NEW** |

Both new routes get `adminOnly` and `validateRequest({ params: DistributorIdParamsSchema, body: CreateDistributorAccountSchema })` (params only for the DELETE). Registration order in `distributor.routes.ts`: **after** the existing `/:id` routes is fine (Express matches on the full pattern, and `/:id/account` cannot be shadowed by `/:id`), but register them adjacent to the other `/:id/*` route (`TOGGLE`) for readability.

### 3.8 Socket namespaces (the other guard surface)

| Namespace | Current roles | **After** | Δ |
|---|---|---|---|
| `/client` | **no middleware** (public) | no middleware | — |
| `/activators` | `[ACTIVATOR]` | `[ACTIVATOR]` | — |
| `/admin` | `[ADMIN]` | `[ADMIN]` | — |
| **`/distributors`** | *(does not exist)* | **`[DISTRIBUTOR]`** | **NEW** — §6 |

### 3.9 Non-route backend changes

| # | Site | Change | Why |
|---|---|---|---|
| 1 | **`auth.service.ts:83-97` `me()`** | Convert the `if ADMIN … else Activator` into an **explicit three-way switch** on `user.role`. Each branch loads its own profile and throws its own `AuthError`. The `DISTRIBUTOR` branch: `prisma.distributor.findFirst({ where: { userId: user.id, deletedAt: null }, select: { fullName: true } })`; throw `AuthError('Distributor profile not found')` if absent. | **Blocking (R2).** Without it every `/auth/me` for a distributor throws `Activator profile not found`, the session never resolves, and every frontend guard hangs. Note `findFirst` + `deletedAt: null`, **not** `findUnique` — `Distributor` is soft-deleted and a soft-deleted distributor's login must not resolve a session. |
| 2 | `distributor.service.ts` `GEO_INCLUDE` | `{ wilaya: true, commune: true, user: { select: { username: true } } }` | One constant feeds `getAll`, `create`, `getById`, `update`, `toggle` — changing it covers every mapper call site at once. |
| 3 | `distributor.mapper.ts` | `toDTO` / `toDetailDTO` take `DistributorWithGeo & { user: { username: string } | null }` and emit `hasAccount: distributor.userId !== null`, `username: distributor.user?.username ?? null`. | Derives both new DTO fields from data already loaded — no extra query. |
| 4 | `distributor.interface.ts` | += `createAccount(id, cmd, actorId): Promise<DistributorWithCredentialsDTO>` and `unlinkAccount(id, actorId): Promise<DistributorDTO>` | 6-file pattern. |
| 5 | `distributor.controller.ts` | += `createAccount` (201 via `sendSuccess`) and `unlinkAccount` (200 via `sendSuccess`), both `actorId = req.user!.id`, both `try/catch → next(error)` | Matches the existing five handlers exactly. |
| 6 | `distributor.service.ts` | += the two methods — see §3.10 | — |
| 7 | `distributor.service.ts` `getAll` search | add `{ user: { username: { contains: query.search, mode: 'insensitive' } } }` to the `OR` | Mirrors `activator.service.getAll`, now that `username` is a visible column. Optional — see **Q4**. |
| 8 | `distributor.service.ts` `toggle` | when `existing.userId !== null`, also `tx.user.update({ where: { id: existing.userId }, data: { isEnabled: nextEnabled } })` inside the same transaction | See **Q2** — disabling a distributor should not leave its login live. Recommended yes. |

### 3.10 The two new service methods — mirroring `activator.service.create` exactly

`createAccount(id, cmd, actorId)`:

1. `findFirst({ where: { id, deletedAt: null }, include: GEO_INCLUDE })` → `NotFoundError('Distributor not found')`.
2. `if (distributor.userId) throw new ConflictError('Distributor already has an account')`.
3. `findUnique({ where: { username } })` on `User` → `ConflictError('Username already taken')`. *(Identical to `activator.service.ts:104-105`.)*
4. `const tempPassword = cmd.password ?? generateTempPassword()` — the same `common/utils/password-generator.util.ts`; `hashPassword` from `common/utils/password.utils.ts`. *(Identical to `activator.service.ts:109-110`.)*
5. One `$transaction`:
   - `tx.user.create({ data: { username, password: hashed, role: UserRole.DISTRIBUTOR, isEnabled: true } })`
   - `tx.distributor.update({ where: { id }, data: { userId: user.id }, include: GEO_INCLUDE })`
   - `tx.log.create({ actionType: LogActionType.LINK_USER_ACCOUNT, actionDescription: \`Linked login ${user.username} to distributor ${d.fullName}\`, userId: actorId })`
6. Return `DistributorMapper.toWithCredentialsDTO(updated, tempPassword)` — the plaintext password returned **once**, never stored, never re-fetchable. *(Identical to `activator.service.ts:139-144`.)*

`unlinkAccount(id, actorId)`:

1. `findFirst({ where: { id, deletedAt: null }, include: GEO_INCLUDE })` → `NotFoundError`.
2. `if (!distributor.userId) throw new NotFoundError('Distributor has no account')`.
3. One `$transaction`:
   - `tx.refreshToken.deleteMany({ where: { userId } })` — **kills live sessions immediately**; without this a still-valid refresh token would keep minting access tokens after unlink.
   - `tx.user.update({ where: { id: userId }, data: { deletedAt: new Date(), isEnabled: false } })` — soft delete, matching `activator.service.delete()`. `login()` already rejects on both flags (`auth.service.ts:21`).
   - `tx.distributor.update({ where: { id }, data: { userId: null }, include: GEO_INCLUDE })` — frees the `@unique` slot so a new login can be created later.
   - `tx.log.create({ actionType: LogActionType.UNLINK_USER_ACCOUNT, ... })`
4. Return `DistributorMapper.toDTO(updated, deliveredCount)`.

**Known consequence, stated rather than worked around:** the soft-deleted `User` row keeps its `username`, which stays globally unique, so that username cannot be re-used for a different account. This is exactly the existing behaviour of `activator.service.delete()` — one pattern, not two. See **Q3** if you want a hard delete instead.

**Access-token latency:** an unlinked distributor's *existing* access token stays valid until it expires (`JWT_EXPIRATION`, default 15m), because `requireAuth()` does not hit the DB by default. Refresh is dead immediately (step 3a), so the window is bounded by the access-token TTL and cannot be extended. Options: accept it (recommended — the portal is empty in this set, and it matches how `activator` toggle/delete already behave), or add `checkDB: true` to the distributor-facing guards in Set 7 when there is actually something to protect. Recorded here so Set 7 decides deliberately.

### 3.11 Rule compliance

- Every response through `sendSuccess`; no `res.status().json()` in a service. ✅
- Errors as `AppError` subclasses (`NotFoundError`, `ConflictError`). ✅
- No `console.*`. ✅
- No new DB call in middleware. ✅
- `common/` still imports nothing from `modules/` — the realtime gateway's new distributor join uses the `PrismaClient` it is already handed (§6). ✅
- Data write + log write in one `$transaction` (the majority pattern, R8). ✅
- Routes come from contract constants only; no string literal route in backend code. ✅

---

## 4. A `Distributor` with `userId = null` — every read site

`userId` is nullable and **nothing** in the existing codebase joins `User` from `Distributor`. The exhaustive list below is every `prisma.distributor` / `tx.distributor` / `distributor:` include / `distributorId` reference in `Apps/api/src` (tests excluded).

| # | Site | What it reads/writes | With `userId = null` |
|---|---|---|---|
| 1 | `distributor.service.getAll:39-46` | `findMany` + `count`, filter `deletedAt: null` (+ search/wilaya/commune) | **Works.** After §3.9-2 the `user` relation is included as `null`; mapper emits `hasAccount: false`, `username: null`. |
| 2 | `distributor.service.getAll:50-57` | `order.groupBy` delivered counts | **Works** — order-side only. |
| 3 | `distributor.service.create:69` | creates the row without `userId` | **Works** — that is the default and stays the default. Creating a distributor never creates a login. |
| 4 | `distributor.service.getById:98-110` | `findFirst` + card/order counts | **Works.** |
| 5 | `distributor.service.update:114-153` | `findFirst` + `update` (name/store/phone/geo only) | **Works** — `update` never touches `userId`. |
| 6 | `distributor.service.toggle:156-185` | flips `Distributor.isEnabled` | **Works.** With Q2 = yes, the `User` update is guarded by `if (existing.userId)` — a null userId simply skips it. |
| 7 | `distributor.service.delete:187-197` | soft delete `deletedAt` | **Works.** ⚠️ See the note below. |
| 8 | `order.service.create:100` | `findUnique({ where: { id: cmd.distributorId } })` | **Works** — id lookup only. **An account-less distributor can still receive orders.** |
| 9 | `order.service.create:130` | writes `distributorId` on the order | **Works.** |
| 10 | `order.service.transition:196-201` | cards → `AT_DISTRIBUTOR`; `nbOfActiveCards` += | **Works.** |
| 11 | `order.service.getAll:35,38,54` / `getById:74` / `:257` | `distributor: { select: { storeName: true } }` and search by `storeName` | **Works** — `storeName` is on `Distributor`, not `User`. |
| 12 | `order.mapper.ts:20,41` | `distributor.storeName`, `order.distributorId` | **Works.** |
| 13 | `card.service` `:30,39,83,115,135,154,167,186,203` | `include: { distributor: true }`, filter by `distributorId` | **Works** — `distributor: true` now also selects the new `userId` scalar, which nothing reads. |
| 14 | `card.service.disable/enable/revoke` `:139,171,207` | `tx.distributor.update` counters | **Works.** |
| 15 | `card.mapper.ts:19` | `distributor: { storeName } | null` | **Works** — already nullable for cards not yet at a distributor. |
| 16 | `activation.service.ts:85,188,702,1071,1111,1162,1243,1305` | `card.distributor` includes for the DTO distributor block | **Works** — reads `storeName`/`wilaya`/`commune` only, and the type is already `| null`. |
| 17 | `activation.service.activate:746` / `activateByAdmin:1206` | `tx.distributor.update` counters | **Works.** |
| 18 | `activation.mapper.ts:209,357` | distributor block in `ActiveRequestDTO` / `ActivationDetailDTO` | **Works** — no account field is added to these DTOs in this set. |
| 19 | `statistics.service.ts:96-98` | `distributor.count` / `aggregate` | **Works** — counts all non-deleted distributors regardless of account. |
| 20 | `statistics.service.ts:106,234-235,278-281,316` | top-distributor rollups via `card.distributor.storeName` | **Works.** |
| 21 | `statistics.service.ts:333` | `distributor.groupBy` (wilaya heatmap) | **Works.** |
| 22 | `statistics.service.ts:343-359,421-460` | wilaya heatmap + drilldown via `card.distributor.wilayaId` | **Works.** |
| 23 | `statistics.mapper.ts:78,96,169` | `topDistributors[]` shapes | **Works.** |
| 24 | `auth.service.me()` | **new** DISTRIBUTOR branch | An account-less distributor is never reachable here — there is no `User` to authenticate as. The branch only fires for a `User` whose `role = DISTRIBUTOR`. |
| 25 | `realtime-gateway` `/distributors` join | **new** — resolves `userId → Distributor.id` | Only reached by an authenticated distributor, i.e. one that *has* a `userId`. `findFirst` returning null is handled the same way the activator join handles it (log and skip). |
| 26 | Frontend `DistributorsTable` / `DistributorProfileCard` / `DistributorDetailPage` | consume `DistributorDTO` | **Works** — `hasAccount: false` / `username: null` render the "no account" state (§5.6). |

⚠️ **One gap worth recording, not fixing here:** `distributor.service.delete()` soft-deletes the distributor but does **not** disable a linked login, and (per v2-decisions §9.2) writes **no log** at all — `_actorId` is unused. After this set, deleting a distributor that has an account would leave that account able to sign in to an empty portal. It is not a data-exposure risk in Set 1 (the portal shows nothing and every API route is ADMIN- or ACTIVATOR-only), but it must be closed before Set 7 gives the portal real data. Raised as **Q5**.

---

## 5. Frontend

### 5.1 The problem being fixed (v2-decisions R1)

Three sites currently assume *"authenticated and not admin ⇒ activator"*:

- `App.tsx:109` — `<ProtectedRoute/>` gates `/dashboard`, `/requests`, `/history` on **authentication only**, no role check.
- `App.tsx:49-76` — `CatchAllRoute` renders `ActivatorLayout` for *any* authenticated session.
- `lib/realtime.ts:177` — `connectRoleSocket` sends every non-admin to `/activators`, where a distributor would be rejected `FORBIDDEN` and silently disconnected.

All three must become role-driven. The backend is already safe; this is the whole frontend job of the set.

### 5.2 One source of truth for "where does this role live"

New file **`Apps/web/src/config/role-home.ts`**:

```ts
import { UserRole } from "@my-app/contract";

// Typed as Record<UserRole, string>, so adding a fourth role later is a compile error
// until every consumer's landing page is decided — not a silent fallback to /dashboard.
export const ROLE_HOME: Record<UserRole, string> = {
  [UserRole.ADMIN]: "/admin",
  [UserRole.ACTIVATOR]: "/dashboard",
  [UserRole.DISTRIBUTOR]: "/portal",
};
```

Consumed by `RoleGuard`, `PublicOnlyRoute`, `AdminGuard` and `CatchAllRoute`. This replaces the four hardcoded `"/dashboard"` / `"/admin"` redirect literals that exist today and is what stops a future role silently landing in the activator portal.

### 5.3 Guards

| File | Change |
|---|---|
| **`components/layout/RoleGuard.tsx`** *(new)* | `RoleGuard({ allow }: { allow: UserRole[] })`. Reads `useSession()`. `isPending` → the existing full-screen `Loader2` treatment; no session → `<Navigate to="/login" replace/>`; role not in `allow` → `<Navigate to={ROLE_HOME[session.role]} replace/>`; otherwise `<Outlet/>`. |
| `components/layout/AdminGuard.tsx` | Re-implemented as `return <RoleGuard allow={[UserRole.ADMIN]} />`. **Export name and file path unchanged**, so `App.tsx` and everything else keep working. Behaviour change: a wrong-role user goes to `ROLE_HOME[role]` instead of the hardcoded `/dashboard` — which is precisely the fix (a distributor hitting `/admin/...` must land on `/portal`, not the activator dashboard). |
| `components/layout/ProtectedRoute.tsx` — `ProtectedRoute` | **Unchanged.** It stays the authentication-only outer gate; the role check is a nested `RoleGuard`. Two small components, each with one job. |
| `components/layout/ProtectedRoute.tsx` — `PublicOnlyRoute` | Line 37 becomes `<Navigate to={ROLE_HOME[session.role]} replace/>`. **This is the post-login redirect** — `LoginPage` never navigates itself (see its own header comment); `useLogin` invalidates `qk.auth.me()`, the refetch resolves, and this guard redirects declaratively. A distributor therefore lands on `/portal` with no change to `LoginPage.tsx` or `useLogin.ts`. |

### 5.4 Router (`App.tsx`)

```
<ProtectedRoute>                        ← authentication only (unchanged)
  └── <RoleGuard allow={[ACTIVATOR]}>   ← NEW
        └── <ActivatorLayout>  /dashboard  /requests  /history
  └── <RoleGuard allow={[DISTRIBUTOR]}> ← NEW
        └── <DistributorLayout>  /portal
<AdminGuard>                            ← now RoleGuard(ADMIN) under the hood
  └── <AdminLayout>  /admin/*
"*" → <CatchAllRoute/>
```

`CatchAllRoute` picks its layout from `useSession().data?.role` via a small switch — `ADMIN → AdminLayout`, `ACTIVATOR → ActivatorLayout`, `DISTRIBUTOR → DistributorLayout`, unauthenticated → the existing `ActivationProvider + PublicLayout` branch. Today it renders `ActivatorLayout` for everyone authenticated; after this set a distributor's 404 renders inside their own shell, which is also what satisfies manual test 3 ("blocked, not a blank page").

`PortalPage` is added to the `lazy()` block with the others: `const PortalPage = lazy(() => import("@/pages/distributor/PortalPage"))`.

### 5.5 The empty `/portal` shell

| File | Contents |
|---|---|
| `components/layout/DistributorLayout.tsx` *(new)* | Structural copy of `ActivatorLayout.tsx` — `DistributorHeader` + `DistributorSidebar` + `<main>{children ?? <Outlet/>}</main>`, including the same `children?: ReactNode` escape hatch `CatchAllRoute` needs. |
| `components/layout/DistributorHeader.tsx` *(new)* | Trimmed copy of `ActivatorHeader`: logo, mobile `Sheet` nav, `ThemeToggle`, `LanguageToggle`, `displayName` dropdown, logout → `/login`. **Deliberately omits** the notification bell, the mute toggle (`useNotificationSound`) and the reconnect indicator (`useRealtimeStatus`) — all three belong to features this set does not build. |
| `components/layout/DistributorSidebar.tsx` *(new)* | Structural copy of `ActivatorSidebar` over `DISTRIBUTOR_NAV_LINKS`. **Must not** copy the `usePendingActivations()` badge — that endpoint is `[ACTIVATOR, ADMIN]` and would 403 on every render (row 26). |
| `pages/distributor/PortalPage.tsx` *(new)* | `PageHeader` + a centered empty state: title `distributor.portal.emptyTitle`, body `distributor.portal.emptyBody`. No hooks, no queries, no data. That is the whole page in this set. |

**Why not reuse `ActivatorLayout`:** it renders `ACTIVATOR_NAV_LINKS` and mounts the pending-pool query. Reuse would produce a distributor sidebar full of activator links and a 403 loop.

### 5.6 Nav per role (`config/nav-links.ts`)

```diff
+export const DISTRIBUTOR_NAV_LINKS: NavLink[] = [
+  { to: "/portal", labelKey: "distributor.nav.portal", icon: LayoutDashboard },
+];
```

`ACTIVATOR_NAV_LINKS` and `ADMIN_NAV_LINKS` are **not touched**. As today, the link set is chosen by which layout renders, not by a runtime role switch — `DistributorSidebar` imports `DISTRIBUTOR_NAV_LINKS` the same way `ActivatorSidebar` imports `ACTIVATOR_NAV_LINKS`. One entry rather than an empty array, so the shell has a visible, working nav to test against (Sets 4/5/7 append to it).

### 5.7 Realtime client (`lib/realtime.ts`)

```diff
 const NS = {
   CLIENT: "/client",
   ACTIVATORS: "/activators",
   ADMIN: "/admin",
+  DISTRIBUTORS: "/distributors",
 } as const;
```

`connectRoleSocket(role)` becomes an exhaustive three-way switch over `UserRole` (a `Record<UserRole, string>` namespace map, so a future role fails to compile rather than defaulting to `/activators`). Listener attachment follows the same switch: `ADMIN → attachAdminNamespaceListeners`, `ACTIVATOR → attachActivatorNamespaceListeners`, `DISTRIBUTOR → attachDistributorNamespaceListeners` — which in this set attaches **nothing but** `attachStatusTracking` (already applied to every socket). No events exist yet; the connection is what manual test 2 verifies.

### 5.8 Admin UI — create / unlink a distributor login

Mirrors the activator flow component-for-component. Nothing new is invented.

| Activator (existing) | Distributor (new) |
|---|---|
| `CreateActivatorModal.tsx` | `components/CreateDistributorAccountModal.tsx` — username + optional password with the show/hide eye, then swaps to `GeneratedPasswordPanel` on success |
| `create-activator.schema.ts` | `components/create-distributor-account.schema.ts` — same `USERNAME_PATTERN`, same blank-password→`undefined` transform, same `AssertAssignable` compile-time guard against `CreateDistributorAccountCommand` |
| `GeneratedPasswordPanel.tsx` | **reused as-is** — it already accepts `titleKey`/`bodyKey` overrides for exactly this case |
| `ActivatorsPage` local `generatedPassword` state | `DistributorsPage` / `DistributorDetailPage` local `generatedPassword` state, cleared when the modal closes |
| `useCreateActivator` | `useCreateDistributorAccount` in `hooks/useDistributors.ts`, invalidating `qk.distributors.all()` |
| `activatorService.create` | `distributorsService.createAccount` / `unlinkAccount` in `services/distributors.service.ts`, built with `apiPath` + `withParams` over `DISTRIBUTOR_ROUTES.CREATE_ACCOUNT` / `UNLINK_ACCOUNT` |

Entry points (two, both existing components):

- **`DistributorActionsMenu.tsx`** — one item between "view" and "toggle": `KeyRound` icon, label `admin.distributors.account.create` when `!distributor.hasAccount`, `admin.distributors.account.unlink` (destructive styling) when it does. Stays a dumb menu — it raises `onRequestCreateAccount` / `onRequestUnlinkAccount`; `DistributorsTable` owns the one shared modal/dialog pair, exactly as it already owns the toggle/delete dialogs.
- **`DistributorProfileCard.tsx`** — one more `<dt>/<dd>` pair in the read-only `<dl>`: label `admin.distributors.account.label`, value `distributor.username` or `admin.distributors.account.none`. Read-only; the edit form is not touched.

Unlink is confirmed through an `AlertDialog` (the pattern `ActivatorsTable`/`DistributorsTable` already use for delete), warning that the user will be signed out.

**Not in this set:** an account column in `DistributorsTable`, a reset-password action, and any distributor-side self-service. See **Q6**.

### 5.9 Translation keys (`config/translations.json`)

Flat `key → {en, fr, ar}`, `ar` present as `""` per front-end-rules §6B.

| Key | en | fr |
|---|---|---|
| `distributor.nav.portal` | Portal | Portail |
| `distributor.portal.title` | Distributor Portal | Portail distributeur |
| `distributor.portal.emptyTitle` | Nothing here yet | Rien ici pour l'instant |
| `distributor.portal.emptyBody` | Your orders and requests will appear here. | Vos commandes et demandes apparaîtront ici. |
| `distributor.shell.openMenu` | Open menu | Ouvrir le menu |
| `admin.distributors.account.label` | Login account | Compte de connexion |
| `admin.distributors.account.none` | No account | Aucun compte |
| `admin.distributors.account.create` | Create login | Créer un identifiant |
| `admin.distributors.account.createTitle` | Create a login for this distributor | Créer un identifiant pour ce distributeur |
| `admin.distributors.account.username` | Username | Nom d'utilisateur |
| `admin.distributors.account.password` | Password (optional) | Mot de passe (facultatif) |
| `admin.distributors.account.passwordHelper` | Leave blank to auto-generate a password. | Laissez vide pour générer automatiquement un mot de passe. |
| `admin.distributors.account.successTitle` | Login created. | Identifiant créé. |
| `admin.distributors.account.successBody` | Share this password securely — it won't be shown again. | Partagez ce mot de passe en toute sécurité — il ne sera plus affiché. |
| `admin.distributors.account.unlink` | Unlink login | Dissocier l'identifiant |
| `admin.distributors.account.unlinkTitle` | Unlink this login? | Dissocier cet identifiant ? |
| `admin.distributors.account.unlinkBody` | The distributor will be signed out and can no longer sign in. Their orders, cards and statistics are unaffected. | Le distributeur sera déconnecté et ne pourra plus se connecter. Ses commandes, cartes et statistiques ne sont pas affectées. |
| `enums.logActionType.LINK_USER_ACCOUNT` | Linked Login Account | Identifiant associé |
| `enums.logActionType.UNLINK_USER_ACCOUNT` | Unlinked Login Account | Identifiant dissocié |

Reused as-is, no new key: `common.actions.{cancel,confirm,add,view,delete}`, `common.validation.{minLength,maxLength,invalidUsername}`, `auth.login.{showPassword,hidePassword}`, `common.status.{enabled,disabled}`.

**Also required (non-obvious, will fail to compile otherwise):** `LOG_ACTION_TONE` in `components/shared/StatusBadge.tsx:116` is a `Record<LogActionType, BadgeTone>` — the two new enum values **must** be added there (`LINK_USER_ACCOUNT: "success"`, `UNLINK_USER_ACCOUNT: "warning"`) or `tsc` fails. `LogsFilters.tsx` iterates `Object.values(LogActionType)` and needs no change once the translation keys exist.

### 5.10 Rule compliance

- Component → Hook → Service everywhere; no component calls a service. ✅
- One axios instance; routes from contract constants via `apiPath`/`withParams`. ✅
- No `useEffect` fetching. ✅
- No inline strings in JSX. ✅
- Layout survives loading and error states — `RoleGuard` reuses the existing full-screen loader; `PortalPage` has no data so no skeleton is needed. ✅
- No new library. ✅

---

## 6. Realtime — the `/distributors` namespace

### 6.1 `common/realtime/rooms.ts`

```diff
 export const NS = {
   CLIENT: '/client',
   ACTIVATORS: '/activators',
   ADMIN: '/admin',
+  DISTRIBUTORS: '/distributors',
 } as const;

 export const rooms = {
   activation: (activationId: string) => `activation:${activationId}`,
   activator:  (activatorId: string)  => `activator:${activatorId}`,
+  // Distributor.id, NOT User.id — same rule as rooms.activator (Stage-04-fix #3.4:
+  // joining by userId put every activator in a room nothing ever emits to).
+  distributor: (distributorId: string) => `distributor:${distributorId}`,
   ADMIN_BELL: 'admin',
 } as const;
```

**Room key: `Distributor.id`.** Non-negotiable — it is the CLAUDE.md non-negotiable and the bug Stage-04-fix #3.4 already fixed once for activators. Sets 4/5/6 will emit to `rooms.distributor(order.distributorId)`, which is a `Distributor.id`; a room keyed by `User.id` would receive nothing and fail silently.

### 6.2 `server.ts`

```diff
 io.of(NS.ACTIVATORS).use(authNamespace([UserRole.ACTIVATOR]));
 io.of(NS.ADMIN).use(authNamespace([UserRole.ADMIN]));
+io.of(NS.DISTRIBUTORS).use(authNamespace([UserRole.DISTRIBUTOR]));
```

`authNamespace` needs no change — it is already parameterised by a roles array and rejects with `FORBIDDEN`, which the client already handles as permanent (`realtime.ts:92`).

### 6.3 `common/realtime/realtime-gateway.ts`

Add a `distributorNs` alongside the other three, with a connection handler that is a line-for-line mirror of the activator join:

```ts
const distributorNs = io.of(NS.DISTRIBUTORS);

distributorNs.on('connection', (socket) => {
  const userId = socket.data.user?.id;
  if (!userId) return;
  prisma.distributor
    .findFirst({ where: { userId, deletedAt: null }, select: { id: true } })
    .then((distributor) => {
      if (distributor) void socket.join(rooms.distributor(distributor.id));
    })
    .catch((err) => logger.error({ err, userId }, 'Failed to resolve distributor for realtime join'));
});
```

`deletedAt: null` is the one intentional difference from the activator version — `Distributor` is soft-deleted and `Activator` is not.

### 6.4 Events

**None in this set.** No `eventBus.on(...)` is registered for `distributorNs`; `socket.types.ts` gains no entries; `AppEvents` is not widened; the contract gains no `distributor.events.ts`. The namespace exists, authenticates, and joins its room — that is the whole deliverable, and it is what Sets 4/5/6 build on.

Still true, and unchanged: only `realtime-gateway.ts` calls Socket.IO, and `common/` imports nothing from `modules/` (the handler uses the `PrismaClient` passed into `initRealtimeGateway`).

---

## 7. Open questions

| # | Question | My recommendation |
|---|---|---|
| **Q1** | `LogActionType` naming: role-neutral `LINK_USER_ACCOUNT` / `UNLINK_USER_ACCOUNT`, or distributor-specific `LINK_DISTRIBUTOR_ACCOUNT` / `UNLINK_DISTRIBUTOR_ACCOUNT`? | **Role-neutral.** It joins the existing `CHANGE_USER_*` family (already shared by admin and activator operations) and leaves Set 6's Telegram link/unlink somewhere sensible to extend. The distributor is named in `actionDescription` either way. |
| **Q2** | Should `distributor.toggle()` (disable a distributor) also disable its linked login? | **Yes** — in the same transaction, guarded by `if (userId)`. Two independent "enabled" flags is a trap, and it costs three lines now versus a live-account gap the day Set 7 puts data behind the portal. |
| **Q3** | Unlink: soft-delete the `User` (recommended) or hard-delete it? | **Soft-delete**, matching `activator.service.delete()`. Cost: the username stays reserved. Hard delete would free it and `onDelete: SetNull` makes it safe for `Distributor`, but a `User` that ever wrote a `Log` row cannot be hard-deleted (the `Log.user` FK restricts) — a distributor never writes logs today, but that is a latent trap. |
| **Q4** | Should the distributor list search also match `username` (as the activator list does)? | **Yes** — one clause, consistent with the activator page, and `username` is now a visible column. Say no and I'll drop it. |
| **Q5** | `distributor.delete()` (soft delete) currently ignores its `actorId`, writes **no log**, and — after this set — would leave a linked login able to sign in. Fix in Set 1 or defer? | **Fix the login half in Set 1** (delete → also unlink, same transaction). **Defer the missing-log half** to the Set 13 audit-log matrix, which owns log-coverage gaps. Flag if you'd rather have both now. |
| **Q6** | Reset-password for a distributor login — in scope? | **No.** Not in the Set 1 scope line, and unlink + recreate already recovers a lost password in two clicks. Trivial to add later as a third route mirroring `ACTIVATOR_ROUTES.RESET_PASSWORD`. |
| **Q7** | Should `DistributorsTable` get an "Account" column, or is the actions menu + profile card enough? | **Enough as planned.** The table is already at its column budget; the menu label itself tells you which state a row is in. |

**Known breakage to expect (not a question — recorded per CLAUDE.md):** this set makes the first contract change of the programme, so `Apps/contract/src/__tests__/conformance.test.ts` and `Apps/api/test/contract/routes.conformance.spec.ts` will fail and stay failing until Set 14 (v2-decisions R11). `npm run validate` is unusable from here on — run `tsc --noEmit`, `eslint`, and `madge --circular src` separately. Also expect the frozen `Apps/web/tests/unit/components/layout/{AdminGuard,ProtectedRoute}.test.tsx` to break on `AdminGuard`'s new internals. **No test file is touched.**

---

## 8. Manual test checklist

Prereqs: migration applied, DB reseeded, both dev servers running, admin login available (`mockadmin` / `Password123!`).

**Regression — nothing that worked stops working**

1. Log in as **admin** → lands on `/admin`. Walk every sidebar entry (dashboard, activators, distributors, orders, sets & lots, cards, activations, statistics, settings, logs). Every page loads; no 403; no blank shell.
2. Log in as an existing **activator** → lands on `/dashboard`. Pending pool loads, the sidebar Requests badge shows a count, and taking a request still works.
3. As that activator, open `/admin` directly in the URL bar → redirected to `/dashboard` (not a blank page, not a loop).
4. Log out from both accounts → back to `/login`, and re-entering `/admin` bounces to `/login`.

**Creating a distributor login**

5. Admin → Distributors → pick a distributor with no account. Its row menu shows **Create login**; the detail page shows *Login account: No account*.
6. Create a login with **a blank password** → the panel reveals a generated password once. Copy it. Close and reopen the modal → the password is gone (not re-fetchable).
7. Create a login on a second distributor with **an explicit password** (≥ 8 chars) → accepted. Try a 5-character password → blocked client-side before any request.
8. Try creating a login on a distributor that already has one → the menu offers **Unlink**, not Create.
9. Try creating a login with a username already used by an admin or activator → `409`, error toast, no partial row created (re-open the modal: no account was attached).

**The distributor session**

10. Sign in as the distributor from step 6 → lands on **`/portal`**, sees the distributor shell (logo, its own one-item sidebar, theme + language toggles, its full name in the menu) and the empty-state copy. **No activator sidebar, no notification bell, no console 403s.**
11. In that session, open `/admin` directly → redirected to `/portal`. Then `/dashboard` → redirected to `/portal`. Then `/nonsense` → a 404 rendered **inside the distributor shell**.
12. DevTools → Network → WS: one socket to **`/distributors`**, connected, no `FORBIDDEN`, no reconnect loop.
13. `curl -H "Authorization: Bearer <distributor token>" .../api/v1/activations/pending` → **403**. Repeat for `/activations/recent`, `/distributors/`, `/orders/`, `/statistics/dashboard` → **403** on every one.
14. `curl .../api/v1/auth/me` with the same token → **200**, `role: "DISTRIBUTOR"`, `fullName` = the distributor's full name.
15. Reload `/portal` → session restores without flashing to `/login`.

**Unlink**

16. As admin, unlink that distributor's login and confirm the dialog.
17. The distributor's still-open tab: the next refresh-token call fails and they land on `/login`. Signing in again with the same credentials → **rejected**.
18. The distributor row/detail is back to *No account*, and **Create login** reappears.

**Account-less distributors keep working (the D2 guarantee)**

19. Pick a distributor that never had a login: open its detail page → profile, stats, orders history and cards history all render.
20. Create an order for it, transition it `IN_DELIVERY → DELIVERED` → cards land at the distributor and `nbOfActiveCards` increases.
21. Revoke one of its cards → the counter moves.
22. Admin → Statistics: distributor totals, top-distributors and the wilaya heatmap all still populate.
23. Distributors list: search, wilaya/commune filters and pagination all still work; every row shows an account state.

**Audit trail**

24. Admin → Logs, filter by **Linked Login Account** → one row per step 6/7, naming the username and the distributor, actor = you.
25. Filter by **Unlinked Login Account** → one row from step 16.
26. Both badges render with a label and a colour (not a raw enum string).

**If Q2 is accepted**

27. Disable a distributor that has a login → that login can no longer sign in. Re-enable → it can again.
