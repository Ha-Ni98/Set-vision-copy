# Plan — Foundation Corrections (prerequisite to Sub-02 modules)

> Stage 02 · Sub-02 · Phase 01 — **confirmed** corrections to the Sub-01 framework. **No code here, only instructions.**
> These are **framework** changes (under `apps/api/src/common/`, `env.ts`, `app.ts`, `package.json`) — not module files. Do them **before / alongside** the first module sprint; Auth depends on FC-1/2/3, Admin & Activator on FC-4/5/8, the conformance suite on FC-6.
> Status legend: ✅ = confirmed by product owner (2026-06-30), do it.

---

## FC-1 ✅ Password hashing → Argon2id (honor the binding spec)

The contract docs and every module spec (`auth.md`/`admin.md`/`activator.md` §6) mandate **Argon2id**; Sub-01 shipped bcrypt. Switch the framework to Argon2id and keep the existing call sites unchanged.

- `apps/api/package.json`: add `argon2`; remove `bcrypt` + `@types/bcrypt`.
- Rewrite `common/utils/password.utils.ts` **keeping the same signatures** so no caller changes:
  - `hashPassword(plain: string): Promise<string>` → `argon2.hash(plain, { type: argon2.argon2id })`.
  - `comparePassword(plain: string, hash: string): Promise<boolean>` → `argon2.verify(hash, plain)` (note argument order; wrap so a malformed hash returns `false`, never throws).
- Update `test/unit/common/utils/password.utils.spec.ts`: assert the hash starts with `$argon2id$`, round-trips, and a wrong password returns `false`.
- Re-run `test:unit` green before building modules.

> Only `password.utils.ts` consumers are affected (login verify + admin/activator create/reset). Refresh tokens are **not** hashed this way — see FC-2.

---

## FC-2 ✅ Refresh-token hashing — deterministic SHA-256

`RefreshToken.tokenHash` is `@unique` and is **looked up by hash**, so the hash must be deterministic. Argon2/bcrypt are salted and cannot be queried — do **not** use them here.

- Add to `common/utils/token.utils.ts`:
  - `generateOpaqueToken(): string` → `crypto.randomBytes(32).toString('hex')` (the raw refresh token returned to the client).
  - `hashRefreshToken(raw: string): string` → `crypto.createHash('sha256').update(raw).digest('hex')` (what gets persisted / queried).
- Auth service: store `hashRefreshToken(raw)`; look up / rotate / revoke by the same hash.
- Add a small unit test: same input → same hash; different input → different hash.

---

## FC-3 ✅ Refresh-token TTL env var

Only the 15-min access TTL (`JWT_EXPIRATION`) exists.

- `env.ts`: add `REFRESH_TOKEN_EXPIRATION: z.string().default('7d')`.
- `.env.example` (and `env-template.md`): add `REFRESH_TOKEN_EXPIRATION="7d"` under an Auth section.
- Auth service computes `expiredAt = new Date(Date.now() + ms(env.REFRESH_TOKEN_EXPIRATION))` (the `ms` package is already a transitive dep via `token.utils`; add it explicitly if not in `package.json`).
- Add a case to `test/unit/env.spec.ts` for the default.

---

## FC-4 ✅ Temp-password generator util

Admin & Activator `create` and `resetPassword` mint a one-time plaintext password.

- Add `common/utils/password-generator.util.ts`:
  - `generateTempPassword(length = 14): string` — crypto-backed (`crypto.randomInt`), drawn from a set guaranteeing ≥1 lower, ≥1 upper, ≥1 digit, ≥1 symbol; shuffled.
- Returned **once** in the create/reset response; immediately hashed via FC-1 before persisting; never logged in plaintext.
- Unit test: length, character-class coverage, and that two calls differ.

---

## FC-5 ✅ Pagination helper + response shape

List endpoints return the contract `paginated()` shape `{ items, meta }`.

- Add `common/http/pagination.ts`:
  - `buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta` (imports `PaginationMeta` from `@my-app/contract`; `totalPages = Math.ceil(total / limit)`).
  - optional `toSkipTake(query: { page; limit }): { skip; take }`.
- Services return `PaginatedResult<DTO>`; controllers `sendSuccess(res, { items, meta })`. No new envelope helper needed — `sendSuccess` already wraps in `ApiResponse`.
- Unit test the meta math (incl. `total = 0 → totalPages = 0`).

---

## FC-6 ✅ App router registry (mount module routers)

`app.ts` currently mounts an empty `express.Router()` at `env.API_PREFIX`. Give modules a single composition point.

- Create `apps/api/src/modules/index.ts`:
  - export `const moduleRouter = Router()` that mounts each module router at its contract `BASE`, e.g. `moduleRouter.use(AUTH_ROUTES.BASE, authRouter)`, `ADMIN_ROUTES.BASE`, `ACTIVATOR_ROUTES.BASE` (User has none). Each sprint appends its line here.
- Modify `app.ts`: replace `app.use(env.API_PREFIX, express.Router())` with `app.use(env.API_PREFIX, moduleRouter)` (keep it **before** `globalErrorHandler`).
- Update `test/contract/routes.conformance.spec.ts`: replace the `// TODO (Sub-02)` with a real assertion that every registered module's route constants resolve on the app router; each sprint adds its module to the covered set.

---

## FC-7 ✅ Login rate-limit middleware (429, 5 fails / 5-min lockout)

Spec says middleware, not service.

- `apps/api/package.json`: add `express-rate-limit`.
- Add `common/middlewares/rate-limit.middleware.ts`:
  - `loginRateLimiter` — `windowMs = 5 * 60_000`, `limit = 5`, keyed by IP + submitted username, `standardHeaders: true`, and a handler that forwards an `AppError(429, …)` (or sends the `ApiResponse` error envelope) so the shape matches the rest of the API.
- Apply it **only** on `AUTH_ROUTES.LOGIN`, before `validateRequest`.
- The Auth 429 integration test (see `plan-auth.md` §6) depends on this.

> `429` has no `ErrorCode` member today. Either add `RATE_LIMITED = 'RATE_LIMITED'` to the contract `ErrorCode` enum (preferred, small additive contract change) or reuse `INTERNAL_SERVER_ERROR`-style mapping. **Recommend** adding `RATE_LIMITED` — flag as a one-line contract addition.

---

## FC-8 ✅ `Admin.isEnabled` duplication — single source of truth

`Admin.isEnabled` duplicates `User.isEnabled`. Drive all status logic off **`User.isEnabled`**.

- Read status only from `User.isEnabled` in the Admin mapper and `getAll`/`getById`.
- In `create`/`toggle`, keep `Admin.isEnabled` written in sync **within the same transaction** to avoid a stale column (set on create, flip on toggle).
- Follow-up (not required this sub-stage): a migration to drop `Admin.isEnabled` once nothing reads it. Flag for a later schema cleanup.

---

## Sequencing summary

| FC | Blocks | When |
|----|--------|------|
| FC-1 Argon2id | Auth login, Admin/Activator create+reset | before any module |
| FC-2 SHA-256 refresh hash | Auth refresh/logout | before Auth |
| FC-3 Refresh TTL env | Auth login | before Auth |
| FC-4 Temp-password util | Admin/Activator create+reset | before Admin |
| FC-5 Pagination helper | Admin/Activator getAll | before Admin |
| FC-6 Router registry | all routed modules + conformance | first module sprint |
| FC-7 Login rate-limit | Auth 429 test | with/after Auth |
| FC-8 Admin.isEnabled | Admin only | with Admin |

Each FC ships with its own unit test and is committed on green before the dependent module work starts.
