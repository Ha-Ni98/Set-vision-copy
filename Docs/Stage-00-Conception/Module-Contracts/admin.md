# Module Specification: Admin

## 1. Context [CONTRACT]
- Prisma Entity: `Admin` (and the underlying `User` of role `ADMIN`)
- Depends on: User (`UserRole`, `UserIdentityDTO`); `common` (`ApiResponse`, `ErrorCode`, `paginated`); Log (backend only — audit entries written inline)

## 2. API Interface [CONTRACT]
`ADMIN_ROUTES` (`BASE: '/admins'`). All routes Admin-only.

- Route Constant: `ADMIN_ROUTES.GET_ALL` (GET `/admins`)
  - Access: Admin
  - Input (body): none
  - Input (query/params): `GetAdminsQuery` { page?, limit?, search? }
  - Output: `AdminDTO[]` (paginated)

- Route Constant: `ADMIN_ROUTES.CREATE` (POST `/admins`)
  - Access: Admin
  - Input (body): `CreateAdminCommand` { fullName, username, phone }
  - Input (query/params): none
  - Output: `AdminWithCredentialsDTO` { admin: `AdminDTO`, generatedPassword } — **one-time creation response** (see exception note)

- Route Constant: `ADMIN_ROUTES.GET_BY_ID` (GET `/admins/:id`)
  - Access: Admin
  - Input (body): none
  - Input (query/params): `AdminIdParams` { id }
  - Output: `AdminDTO`

- Route Constant: `ADMIN_ROUTES.UPDATE` (PATCH `/admins/:id`)
  - Access: Admin
  - Input (body): `UpdateAdminCommand` { fullName?, phone?, username? }
  - Input (query/params): `AdminIdParams`
  - Output: `AdminDTO`

- Route Constant: `ADMIN_ROUTES.TOGGLE` (POST `/admins/:id/toggle`)
  - Access: Admin
  - Input (body): none
  - Input (query/params): `AdminIdParams`
  - Output: `AdminDTO`

- Route Constant: `ADMIN_ROUTES.RESET_PASSWORD` (POST `/admins/:id/reset-password`)
  - Access: Admin
  - Input (body): none
  - Input (query/params): `AdminIdParams`
  - Output: `GeneratedPasswordDTO` { generatedPassword } — **one-time** (see exception note)

- Route Constant: `ADMIN_ROUTES.DELETE` (DELETE `/admins/:id`)
  - Access: Admin
  - Input (body): none
  - Input (query/params): `AdminIdParams`
  - Output: none

`AdminDTO` = { id, userId, fullName, username, phone, isEnabled, lastLoginAt, createdAt }.

> **Exception note (flagged for confirmation):** `AdminWithCredentialsDTO` and `GeneratedPasswordDTO` return a plaintext one-time `generatedPassword`. This is the only sanctioned place a credential appears in a DTO; it is generated, shown once, and stored only as an Argon2 hash. Per `contract-rules.md` §0 this is a WHICH-level deviation from "no sensitive data in any DTO" — confirm before Stage 1, or I can split it into a separate non-contract channel.

## 3. Events [CONTRACT]
(none — audit logging is performed inline by the service; see [BACKEND])

## 4. Business Logic (Service) [BACKEND]
- **getAll:** require admin → query `Admin` join `User` → optional `search` over fullName/username/phone → paginate → map.
- **create:** check `username` uniqueness across all users (→ `RESOURCE_CONFLICT`) → generate a temp password → Argon2id hash → transaction { create `User`(role ADMIN, isEnabled true, hashed pw) → create `Admin`(profile) } → write `Log` `CHANGE_USER_INFORMATION` (actor = caller) → return `AdminDTO` + plaintext temp password (once).
- **getById:** load `Admin`+`User` or `RESOURCE_NOT_FOUND`.
- **update:** load → if `username` changing, re-check uniqueness (`RESOURCE_CONFLICT`) → update `Admin`/`User` fields → write `Log` `CHANGE_USER_INFORMATION` → return.
- **toggle:** flip `User.isEnabled` → write `Log` `CHANGE_USER_STAT` → return.
- **resetPassword:** generate temp pw → hash → update `User.password` → write `Log` `CHANGE_USER_PASSWORD` → return plaintext once.
- **delete:** guard — caller cannot delete self (compare ids → `AUTH_FORBIDDEN`); cannot delete the last enabled admin (`RESOURCE_CONFLICT`) → soft-delete `User` (`deletedAt`) and `Admin`. (No `DELETE_USER` log type exists, so deletion is not logged.)

## 5. Data Mapping [BACKEND]
- **toDTO:** `AdminDTO` composes `Admin` (fullName, phone, isEnabled) + `User` (username, `lastLoginAt`→ISO, `createdAt`→ISO); exclude `User.password` and `deletedAt`. `generatedPassword` appears only in the explicit create/reset responses, never in `AdminDTO`.
- **toPersistence:** trim username/phone; hash password before persisting.

## 6. Technical Constraints [BACKEND]
- Temp passwords **Argon2id**-hashed; plaintext returned once and never stored or logged in plaintext. "Not self / not last admin" guards enforced server-side. Username unique across all users. All dates ISO 8601.

## 7. Test Scenarios [BACKEND]
- 200 — list (admin); 403 `AUTH_FORBIDDEN` for a non-admin principal.
- 201/200 — create returns `AdminDTO` + one-time password; 409 `RESOURCE_CONFLICT` on duplicate username.
- 200 — update; 409 on username collision.
- 200 — toggle flips status (logs `CHANGE_USER_STAT`).
- 200 — reset-password returns a new one-time password (logs `CHANGE_USER_PASSWORD`).
- 403 — deleting self; 409 — deleting the last admin; 200 — otherwise (soft delete).
- 404 `RESOURCE_NOT_FOUND` — unknown id on get/update/toggle/reset/delete.
