# Sprints — User / Auth / Admin / Activator (Sub-02 module set)

> Stage 02 · Sub-02 · Phase 02 — dependency-ordered sprints. **No code.**
> Plans: `plan-00-foundation.md`, `plan-user.md`, `plan-auth.md`, `plan-admin.md`, `plan-activator.md` · Rules: `module-implementation-rules.md`.
> Order law (phase §3): **foundation (mapper/interface) → logic (service) → API (controller/wiring)**, per module. Framework corrections precede all modules.

---

## Dependency order & status

| # | Sprint | Depends on | Status |
|---|--------|-----------|--------|
| 0 | Framework Foundation Corrections (FC-1…FC-6) | Sub-01 | ✅ Done |
| 1 | User — shared mapper | S0 (FC-1 only for context) | ✅ Done |
| 2 | Auth — Foundation (mapper + interface) | S1 | ✅ Done |
| 3 | Auth — Logic (service) | S2, FC-1/2/3 | ✅ Done |
| 4 | Auth — API (controller + wiring) | S3, FC-6/7 | ✅ Done |
| 5 | Admin — Foundation (mapper + interface) | S1, FC-5 | ✅ Done |
| 6 | Admin — Logic (service) | S5, FC-1/4/8 | ✅ Done |
| 7 | Admin — API (controller + wiring) | S6, FC-6 | ✅ Done |
| 8 | Activator — Foundation (mapper + interface) | S1, FC-5 | ✅ Done |
| 9 | Activator — Logic (service) | S8, FC-1/4 | ✅ Done |
| 10 | Activator — API (controller + wiring) | S9, FC-6 | ✅ Done |

**Cross-cutting validation** (applies to every sprint, in addition to its own block):
- `tsc --noEmit` clean (no `any` leaks, no unused exports).
- Routes use **contract constants** only; responses go through `sendSuccess`; mappers exclude sensitive fields (`password`, `tokenHash`, `deletedAt`) by listing returned fields, never spreading.
- No `console.*`; no `process.env` outside `env.ts`. Committed on green.

---

### Sprint 0: Framework Foundation Corrections   — Status: ✅ Done

**Goals**
- Land the confirmed framework changes (`plan-00-foundation.md` FC-1…FC-6) that every module depends on. FC-7 ships with Auth (S4); FC-8 with Admin (S6).

**Tasks**
- [ ] FC-1 Impl: rewrite `src/common/utils/password.utils.ts` to **Argon2id** (signatures unchanged); `package.json` add `argon2`, remove `bcrypt`/`@types/bcrypt`.
- [ ] FC-2 Impl: add `generateOpaqueToken()` + `hashRefreshToken()` (SHA-256) to `src/common/utils/token.utils.ts`.
- [ ] FC-3 Impl: add `REFRESH_TOKEN_EXPIRATION` (default `7d`) to `src/env.ts`, `.env.example`, `env-template.md`; ensure `ms` is a direct dep.
- [ ] FC-4 Impl: add `src/common/utils/password-generator.util.ts` (`generateTempPassword`).
- [ ] FC-5 Impl: add `src/common/http/pagination.ts` (`buildPaginationMeta`, optional `toSkipTake`).
- [ ] FC-6 Impl: add `src/modules/index.ts` (`moduleRouter`, initially empty); modify `src/app.ts` to mount `moduleRouter` at `env.API_PREFIX` before `globalErrorHandler`.
- [ ] Test: update `test/unit/common/utils/password.utils.spec.ts` (argon2id hash prefix, round-trip, wrong-pw → false).
- [ ] Test: `test/unit/common/utils/token.utils.spec.ts` — deterministic refresh hash (same in → same out; different in → different out).
- [ ] Test: `test/unit/common/utils/password-generator.spec.ts` — length, char-class coverage, two calls differ.
- [ ] Test: `test/unit/common/http/pagination.spec.ts` — meta math incl. `total=0 → totalPages=0`.
- [ ] Test: add `REFRESH_TOKEN_EXPIRATION` default case to `test/unit/env.spec.ts`.

**Validation**
- [ ] `tsc --noEmit` clean.
- [ ] `npm run test:unit` green (existing suites still pass after the bcrypt→argon2 swap).
- [ ] `argon2` present, `bcrypt` removed from `package.json`/lockfile; no remaining `bcrypt` import.
- [ ] `app.ts` mounts `moduleRouter`; no routes registered yet (no behavior change).
- [ ] Committed on green.

---

### Sprint 1: User — shared mapper   — Status: ✅ Done

**Goals**
- Ship the only User file: a pure shared mapper (`toUserIdentityDTO`). No service/interface/controller/routes/listener (spec: no HTTP surface).

**Tasks**
- [ ] Impl: `src/modules/user/user.mapper.ts` — `toUserIdentityDTO(user): UserIdentityDTO`; pick the 6 safe fields, dates→ISO, `role as UserRole`, `UserIdentityResponseSchema.parse`.
- [ ] Test data: `test/data/user.factory.ts` — add `userEntity(overrides)` returning a Prisma-shaped `User` (incl. `password`, `deletedAt`). Keep existing `createUserPayload` (login command).
- [ ] Test: `test/unit/modules/user/user.mapper.spec.ts` — parses `UserIdentityResponseSchema`; **no** `password`/`deletedAt`; `lastLoginAt` null↔ISO; `role` ADMIN/ACTIVATOR matches `schema.prisma`.

**Validation**
- [ ] `tsc --noEmit` clean.
- [ ] `npm run test:unit` green.
- [ ] Mapper builds the DTO by listing fields (no entity spread); never returns `password`/`deletedAt`. No routes added.
- [ ] Committed on green.

---

### Sprint 2: Auth — Foundation (mapper + interface)   — Status: ✅ Done

**Goals**
- Auth mapper (token + session DTO assembly) and `IAuthService` contract. No service logic yet.

**Tasks**
- [ ] Impl: `src/modules/auth/auth.mapper.ts` — `toAuthTokensDTO(...)`, `toSessionUserDTO(user, profile)`; `.parse` each schema; never expose `password`/`tokenHash`.
- [ ] Impl: `src/modules/auth/auth.interface.ts` — `IAuthService` (`login`, `refresh`, `logout`, `me`).
- [ ] Test: `test/unit/modules/auth/auth.mapper.spec.ts` — `AuthTokensDTO`/`SessionUserDTO` parse; admin & activator profiles both resolve `fullName`; no secret leak.

**Validation**
- [ ] `tsc --noEmit` clean.
- [ ] `npm run test:unit` green.
- [ ] Interface methods return contract DTOs (no Prisma entities). Mapper excludes secrets.
- [ ] Committed on green.

---

### Sprint 3: Auth — Logic (service)   — Status: ✅ Done

**Goals**
- `AuthService` implementing `IAuthService`: login / refresh / logout / me. Uses FC-1 (argon2 verify), FC-2 (opaque + SHA-256 refresh), FC-3 (refresh TTL).

**Tasks**
- [ ] Impl: `src/modules/auth/auth.service.ts` (injects `PrismaClient`):
  - login (generic `AUTH_INVALID_CREDENTIALS` for missing/disabled/soft-deleted/wrong-pw; mint access JWT + opaque refresh; store SHA-256 hash w/ `expiredAt`; set `lastLoginAt`).
  - refresh (lookup by hash; expired/unknown → `AUTH_UNAUTHORIZED`; rotate: delete old, mint+store new).
  - logout (`deleteMany` by hash; idempotent).
  - me (load `User` + role profile → compose `SessionUserDTO`).
- [ ] Test data: `test/data/auth.factory.ts` / `seedUser` — persists a `User` with an argon2-hashed password for later integration.
- [ ] Test: `test/unit/modules/auth/auth.service.spec.ts` (mock Prisma) — login success (tokens, `lastLoginAt`, role); the 4 failure modes throw **identical** `AUTH_INVALID_CREDENTIALS`; refresh rotate vs `AUTH_UNAUTHORIZED`; logout idempotent.

**Validation**
- [ ] `tsc --noEmit` clean.
- [ ] `npm run test:unit` green.
- [ ] Refresh tokens persisted **only** as SHA-256 hash; access TTL 15m, refresh TTL from `REFRESH_TOKEN_EXPIRATION`. Throws `AppError` subclasses.
- [ ] Committed on green.

---

### Sprint 4: Auth — API (controller + wiring)   — Status: ✅ Done

**Goals**
- Controller, composition root, route registration, and the login rate-limiter (FC-7). First module mounted on `moduleRouter`.

**Tasks**
- [ ] Impl: `src/modules/auth/auth.controller.ts` — `login`/`refresh` (`sendSuccess` 200), `logout` (204), `me` (reads `req.user`); `try/catch → next`.
- [ ] Impl: `src/modules/auth/auth.routes.ts` — manual DI (`new AuthService(prisma)` → `AuthController`); register `LOGIN`/`REFRESH`/`LOGOUT`/`ME` with `validateRequest` + `requireAuth` per the plan.
- [ ] FC-7 Impl: `src/common/middlewares/rate-limit.middleware.ts` (`loginRateLimiter`, 5/5-min, IP+username, `ApiResponse` error shape); add `express-rate-limit`; apply only on `LOGIN`. Optionally add `RATE_LIMITED` to contract `ErrorCode`.
- [ ] Wire: mount `authRouter` at `AUTH_ROUTES.BASE` in `src/modules/index.ts`.
- [ ] Test: `test/integration/auth.integration.spec.ts` — 200 login (+`lastLoginAt`); 401 identical body for the 3 failure modes; refresh rotates + old token → 401; logout idempotent (200/204); `/me` 401 missing/invalid, 200 composed DTO; **429** after 5 fails.
- [ ] Test: extend `test/contract/routes.conformance.spec.ts` — assert all `AUTH_ROUTES` registered; parse `/login` & `/me` `data` through `AuthTokensResponseSchema`/`SessionUserResponseSchema`.

**Validation**
- [ ] `tsc --noEmit` clean.
- [ ] `npm run test:unit` green (incl. conformance); `npm run test:int` green with the test DB up.
- [ ] Routes use `AUTH_ROUTES` constants; rate-limiter only on `LOGIN`; conformance coverage now includes Auth.
- [ ] Committed on green.

---

### Sprint 5: Admin — Foundation (mapper + interface)   — Status: ✅ Done

**Goals**
- Admin mapper (composes `Admin`+`User`, credential responses) and `IAdminService`.

**Tasks**
- [ ] Impl: `src/modules/admin/admin.mapper.ts` — `toDTO(admin, user)`, `toWithCredentialsDTO(...)`, `toGeneratedPasswordDTO(...)`, `toPersistence(cmd)` (trim); `isEnabled` from `User`; `.parse` each schema; exclude `password`/`deletedAt`.
- [ ] Impl: `src/modules/admin/admin.interface.ts` — `IAdminService` (mutations take `actorId`).
- [ ] Test data: `test/data/admin.factory.ts` — `createAdminPayload(overrides)`, `seedAdmin(prisma, overrides)`.
- [ ] Test: `test/unit/modules/admin/admin.mapper.spec.ts` — `AdminDTO` parses `AdminResponseSchema`; no `password`/`deletedAt`; dates ISO; credential DTOs parse.

**Validation**
- [ ] `tsc --noEmit` clean.
- [ ] `npm run test:unit` green.
- [ ] `isEnabled` sourced from `User`; `generatedPassword` only in the two credential DTOs, never in `AdminDTO`.
- [ ] Committed on green.

---

### Sprint 6: Admin — Logic (service)   — Status: ✅ Done

**Goals**
- `AdminService`: getAll / create / getById / update / toggle / resetPassword / delete. Uses FC-1 (argon2), FC-4 (temp pw), FC-5 (pagination), FC-8 (`isEnabled` single source).

**Tasks**
- [ ] Impl: `src/modules/admin/admin.service.ts` (injects `PrismaClient`):
  - getAll (join + `search`, `deletedAt` null, paginate via `buildPaginationMeta`).
  - create (username uniqueness across all users → `RESOURCE_CONFLICT`; temp pw → argon2; `$transaction` User(ADMIN)+Admin; `Log CHANGE_USER_INFORMATION`; one-time pw).
  - getById (`RESOURCE_NOT_FOUND`).
  - update (re-check username; `Log CHANGE_USER_INFORMATION`).
  - toggle (flip `User.isEnabled`, sync `Admin.isEnabled` in tx; `Log CHANGE_USER_STAT`).
  - resetPassword (temp pw → hash → `Log CHANGE_USER_PASSWORD`; one-time pw).
  - delete (guard not-self → `AUTH_FORBIDDEN`; not last enabled admin → `RESOURCE_CONFLICT`; soft-delete; no log).
- [ ] Test: `test/unit/modules/admin/admin.service.spec.ts` (mock Prisma) — duplicate username 409; create writes log + one-time pw; unknown id → 404 on get/update/toggle/reset; toggle/reset write correct log types; delete-self → 403; delete-last-admin → 409; otherwise soft-delete.

**Validation**
- [ ] `tsc --noEmit` clean.
- [ ] `npm run test:unit` green.
- [ ] Each mutation writes the correct `Log` type (delete writes none); status flips off `User.isEnabled`; pagination uses `buildPaginationMeta`.
- [ ] Committed on green.

---

### Sprint 7: Admin — API (controller + wiring)   — Status: ✅ Done

**Goals**
- Controller, composition root, admin-only route registration, integration + conformance.

**Tasks**
- [ ] Impl: `src/modules/admin/admin.controller.ts` — 7 thin handlers; pass `req.user.id` as `actorId`; `201` create, `200` reads/updates/toggle/reset, `204` delete; `try/catch → next`.
- [ ] Impl: `src/modules/admin/admin.routes.ts` — manual DI; `requireAuth({ roles: [ADMIN] })` on all; `validateRequest` per segment.
- [ ] Wire: mount `adminRouter` at `ADMIN_ROUTES.BASE` in `src/modules/index.ts`.
- [ ] Test: `test/integration/admin.integration.spec.ts` — 200 list / 403 non-admin; 201 create + one-time pw / 409 dup; 200 update / 409 collision; 200 toggle; 200 reset; 403 self-delete / 409 last-admin / 200–204 otherwise (row hidden after); 404 unknown id.
- [ ] Test: extend `test/contract/routes.conformance.spec.ts` — all `ADMIN_ROUTES` registered; parse `create`/`getById` `data` through `AdminWithCredentialsResponseSchema`/`AdminResponseSchema`.

**Validation**
- [ ] `tsc --noEmit` clean.
- [ ] `npm run test:unit` green; `npm run test:int` green.
- [ ] All routes admin-gated via `requireAuth({ roles:[ADMIN] })` and use `ADMIN_ROUTES` constants; conformance includes Admin.
- [ ] Committed on green.

---

### Sprint 8: Activator — Foundation (mapper + interface)   — Status: ✅ Done

**Goals**
- Activator mapper (`Decimal`→number, derived fields, credential/perf/dashboard DTOs) and `IActivatorService`.

**Tasks**
- [ ] Impl: `src/modules/activator/activator.mapper.ts` — `toDTO`, `toDetailDTO`, `toWithCredentialsDTO`, `toGeneratedPasswordDTO`, `toPerformanceDTO`, `toDashboardDTO`, `toPersistence` (`initialCredits`→`credits`, trim); `decimalToNumber` helper (2dp); `.parse` each schema.
- [ ] Impl: `src/modules/activator/activator.interface.ts` — `IActivatorService` (9 methods; mutations take `actorId`, `myStats` takes `principalUserId`).
- [ ] Test data: `test/data/activator.factory.ts` — `createActivatorPayload`, `seedActivator`, plus `Activation`/`Payment` seed helpers (no hardcoded ids).
- [ ] Test: `test/unit/modules/activator/activator.mapper.spec.ts` — DTOs parse; `Decimal`→number 2dp; no `password`; `avgActivationTimeSeconds` null when no completed activations.

**Validation**
- [ ] `tsc --noEmit` clean.
- [ ] `npm run test:unit` green.
- [ ] Money serialized as 2dp number; derived fields computed (not stored); login password never in any DTO.
- [ ] Committed on green.

---

### Sprint 9: Activator — Logic (service)   — Status: ✅ Done

**Goals**
- `ActivatorService`: getAll / create / getById / update / toggle / resetPassword / delete / performance / myStats. Read-only aggregates over `Activation`/`Payment`. Uses FC-1/4/5.

**Tasks**
- [ ] Impl: `src/modules/activator/activator.service.ts` (injects `PrismaClient`):
  - getAll (join + `search`, paginate, derive per-row `avgActivationTimeSeconds`, header sums).
  - create (username uniqueness; temp pw → argon2; `$transaction` User(ACTIVATOR)+Activator, `initialCredits`→`credits`, counters 0; `Log CHANGE_USER_INFORMATION`; one-time pw).
  - getById (derive `avgActivationTimeSeconds`/`successRate` ÷0→0/`totalPaid` non-deleted `Payment`; 404).
  - update / toggle / resetPassword (matching `Log` types).
  - delete (soft-delete; optional 409 if in-progress activations).
  - performance (per-day `ACTIVATED` over N days → `{date,count,earned}[]`).
  - myStats (non-activator principal → `AUTH_FORBIDDEN`; derive totals, `activationsToday`, weekly, `earningsTrendPercent`, `activeSlotsUsed` = 4 in-progress states).
- [ ] Test: `test/unit/modules/activator/activator.service.spec.ts` (mock Prisma) — dup username 409; `successRate`/`totalPaid` math; unknown 404; log types on update/toggle/reset; `myStats` 403 for non-activator + `activeSlotsUsed` states; delete soft-delete + optional 409.

**Validation**
- [ ] `tsc --noEmit` clean.
- [ ] `npm run test:unit` green.
- [ ] Derived fields match the plan (avg basis `takenAt→completedAt`, `ACTIVATED` for performance); `Activation`/`Payment` accessed read-only; correct `Log` types.
- [ ] Committed on green.

---

### Sprint 10: Activator — API (controller + wiring)   — Status: ✅ Done

**Goals**
- Controller, composition root, route registration (with `/me/stats` ordered before `/:id`), integration + conformance.

**Tasks**
- [ ] Impl: `src/modules/activator/activator.controller.ts` — 9 thin handlers; `req.user.id` as `actorId`/`principalUserId`; `201`/`200`/`204`; `try/catch → next`.
- [ ] Impl: `src/modules/activator/activator.routes.ts` — manual DI; register `MY_STATS` (activator-only) **before** `/:id` routes; admin-only on the rest; `validateRequest` per segment.
- [ ] Wire: mount `activatorRouter` at `ACTIVATOR_ROUTES.BASE` in `src/modules/index.ts`.
- [ ] Test: `test/integration/activator.integration.spec.ts` — 200 list (+derived/sums) / 403 non-admin; 201 create + one-time pw / 409 dup; 200 detail (`successRate`/`totalPaid`/`creditsOwed`) / 404; 200 update/toggle/reset + log; 200 `myStats` (activator) / 403 non-activator; 200 `performance` series; delete soft-delete (+optional 409).
- [ ] Test: extend `test/contract/routes.conformance.spec.ts` — all `ACTIVATOR_ROUTES` registered; parse `getById` through `ActivatorDetailResponseSchema`, `myStats` through `ActivatorDashboardResponseSchema`.

**Validation**
- [ ] `tsc --noEmit` clean.
- [ ] `npm run test:unit` green; `npm run test:int` green.
- [ ] `/me/stats` resolves before `/:id` (no uuid-parse clash); role gates correct; conformance covers all four modules' route sets.
- [ ] Committed on green.

---

## Done criteria (whole set)

- All 11 sprints committed green; `tsc --noEmit` clean across `apps/api`.
- `npm run test:unit` (unit + conformance) and `npm run test:int` green.
- `routes.conformance.spec.ts` asserts every `AUTH_ROUTES`/`ADMIN_ROUTES`/`ACTIVATOR_ROUTES` constant is registered (User has none).
- No secret ever serialized (`password`/`tokenHash`/`deletedAt`); one-time `generatedPassword` only in its sanctioned DTOs.
- No service imports `getIO()`; realtime layer untouched (these modules emit/listen to nothing).
