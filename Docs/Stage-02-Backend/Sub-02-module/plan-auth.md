# Plan — Auth Module

> Stage 02 · Sub-02 · Phase 01 — vertical-slice plan. **No code.**
> Spec: `Module-Contracts/auth.md` · Rules: `module-implementation-rules.md`, `test-rules.md`.

---

## 1. Files to create (6-file architecture)

`apps/api/src/modules/auth/`

- [x] `auth.mapper.ts` — token + session DTO assembly
- [x] `auth.interface.ts` — `IAuthService`
- [x] `auth.service.ts` — login / refresh / logout / me
- [ ] ~~`auth.listener.ts`~~ — none (spec §3 Events: none)
- [x] `auth.controller.ts` — 4 handlers
- [x] `auth.routes.ts` — composition root, mounted at `AUTH_ROUTES.BASE` (`/auth`)

Reuses `UserMapper.toUserIdentityDTO` (User module) only indirectly; the session DTO needs `fullName` from the `Admin`/`Activator` profile, so Auth composes its own `SessionUserDTO`.

---

## 2. Contract & Schema Analysis

**Entities:** `User` (read for credential check; write `lastLoginAt`), `RefreshToken` (issue / rotate / revoke).

**Routes (`AUTH_ROUTES`, BASE `/auth`):**

| Constant | Method/Path | Access | Input (schema) | Output DTO |
|---|---|---|---|---|
| `LOGIN` | POST `/login` | Public | body `LoginSchema` | `AuthTokensDTO` |
| `REFRESH` | POST `/refresh` | Public (valid refresh token) | body `RefreshTokenSchema` | `AuthTokensDTO` |
| `LOGOUT` | POST `/logout` | Authenticated | body `RefreshTokenSchema` | none (204) |
| `ME` | GET `/me` | Authenticated | — (principal from `requireAuth`) | `SessionUserDTO` |

**DTOs (already in contract):** `AuthTokensDTO { accessToken, refreshToken, role }`, `SessionUserDTO { id, username, role, fullName }`. Both are sanctioned §0.1.3 exceptions (raw tokens to their owner).

---

## 3. Component Definition

### `auth.interface.ts` — `IAuthService`
- `login(cmd: LoginCommand): Promise<AuthTokensDTO>`
- `refresh(cmd: RefreshTokenCommand): Promise<AuthTokensDTO>`
- `logout(cmd: RefreshTokenCommand): Promise<void>`
- `me(principal: JWTPayload): Promise<SessionUserDTO>`

### `auth.service.ts` (injects `PrismaClient`)
- **login** — find `User` by `username` where `deletedAt` null → if missing **or** `!isEnabled` → `AppError(401, AUTH_INVALID_CREDENTIALS)` (generic, never reveal which) → `comparePassword`; mismatch → same generic 401 → mint access JWT from `JWTPayload {id, role}` (`generateToken`, 15 min) + an opaque refresh token (`crypto.randomBytes`) → store the **hash** of the refresh token in `RefreshToken` with `expiredAt` → set `User.lastLoginAt = now` → return `{accessToken, refreshToken, role}`.
- **refresh** — hash the provided token → look up `RefreshToken` by `tokenHash` → if not found or `expiredAt` past → `AppError(401, AUTH_UNAUTHORIZED)` → **rotate**: delete the old row, mint new access+refresh, store new hash (role read from the owning `User`) → return tokens. (Reuse of the old token now misses → 401.)
- **logout** — hash token → `deleteMany({ where: { tokenHash } })` → idempotent (succeeds even if already gone).
- **me** — from `requireAuth` principal load `User` + its role profile (`Admin` or `Activator` by `role`) → compose `SessionUserDTO { id, username, role, fullName }`.

### `auth.mapper.ts`
- `toAuthTokensDTO(accessToken, refreshToken, role)` → `AuthTokensResponseSchema.parse`.
- `toSessionUserDTO(user, profile)` → pick `id`, `username` (User) + `fullName` (profile) + `role` → `SessionUserResponseSchema.parse`. **Never** expose `password`/`tokenHash`.

### `auth.controller.ts` (injects `IAuthService`)
- `login` → `sendSuccess(res, dto, 200)`.
- `refresh` → `sendSuccess(res, dto, 200)`.
- `logout` → service then `res.status(204).send()` (no body).
- `me` → reads `req.user` (`JWTPayload`) → `sendSuccess(res, dto, 200)`.
All `try/catch → next(error)`; read `req.validated.body`.

### `auth.routes.ts` (composition root)
```
service = new AuthService(prisma)
controller = new AuthController(service)
router.post(LOGIN,  validateRequest({ body: LoginSchema }),        controller.login)
router.post(REFRESH, validateRequest({ body: RefreshTokenSchema }), controller.refresh)
router.post(LOGOUT, requireAuth(), validateRequest({ body: RefreshTokenSchema }), controller.logout)
router.get(ME,      requireAuth(), controller.me)
```
Mount `router` at `AUTH_ROUTES.BASE` in the app router registry (see §5).

---

## 4. Events
None in/out (spec §3). **No listener.** Realtime layer untouched — Auth emits nothing to the bus.

---

## 5. Foundation corrections (confirmed — do first)

These are **framework** changes, not module files, and are now **confirmed**. Full instructions live in **`plan-00-foundation.md`**; Auth depends on:

- **FC-1 — Argon2id** (replaces bcrypt in `password.utils.ts`, signatures unchanged): `comparePassword` used for login verify.
- **FC-2 — SHA-256 refresh-token hashing** + `generateOpaqueToken` in `token.utils.ts` (deterministic; `RefreshToken.tokenHash` is `@unique`, looked up by hash — never argon2/bcrypt it).
- **FC-3 — `REFRESH_TOKEN_EXPIRATION` env** (default `7d`) → drives `RefreshToken.expiredAt`.
- **FC-6 — app router registry**: mount `authRouter` at `AUTH_ROUTES.BASE`; update the conformance coverage check.
- **FC-7 — login rate-limit middleware** (429, 5 fails / 5-min window) applied only on `LOGIN`; the 429 test in §6 depends on it. May add a `RATE_LIMITED` `ErrorCode` (one-line contract addition).

Do FC-1/2/3 before building this module; FC-6/7 land with the Auth sprint.

---

## 6. Test Strategy (`test/`)

**Factories** (`test/data/`)
- reuse `user.factory.ts` `createUserPayload` (login command).
- add a `seedUser` helper / `auth.factory.ts`: persists a `User` (bcrypt-hashed password) so integration can log in; `auth.fixture.ts` already mints valid JWTs for authed routes.

**Unit — service (mock Prisma)** (`test/unit/modules/auth/auth.service.spec.ts`)
- login success → tokens minted, `lastLoginAt` updated, role returned.
- login: unknown username / wrong password / disabled / soft-deleted → all throw **identical** `AUTH_INVALID_CREDENTIALS` (assert same code+message).
- refresh: valid → old row deleted, new hash stored; expired/unknown → `AUTH_UNAUTHORIZED`.
- logout: deletes matching row; second call still resolves (idempotent).

**Unit — mapper**: `SessionUserDTO`/`AuthTokensDTO` parse against their schemas; no `password`/`tokenHash` leak.

**Integration** (`test/integration/auth.integration.spec.ts`, real test DB)
- 200 valid login returns tokens+role; `lastLoginAt` updated.
- 401 `AUTH_INVALID_CREDENTIALS` for the three failure modes (identical body).
- 200 refresh rotates; reusing the old refresh token → 401.
- 200 logout revokes; repeat logout → still 200/204 (idempotent).
- 401 `/me` without/with-invalid JWT; 200 returns composed `SessionUserDTO` (admin profile and activator profile both resolve `fullName`).
- **429** after 5 failed attempts (only once the rate-limit middleware from §5.5 lands).

**Contract conformance** (`test/contract/routes.conformance.spec.ts`)
- assert all `AUTH_ROUTES` constants are registered on the app router (replace the Sub-02 TODO with a real coverage check).
- parse `/me` and `/login` `res.body.data` through `SessionUserResponseSchema` / `AuthTokensResponseSchema`.
