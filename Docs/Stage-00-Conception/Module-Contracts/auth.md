# Module Specification: Auth

## 1. Context [CONTRACT]
- Prisma Entity: `User` (read for credential check; write `lastLoginAt`), `RefreshToken` (issue / rotate / revoke)
- Depends on: User module (`UserRole`, `UserIdentityDTO`); `common/auth.ts` (`JWTPayload`); Admin & Activator modules (profile `fullName` for the session DTO); `common` (`ApiResponse`, `ErrorCode`)

## 2. API Interface [CONTRACT]
Route constants under `AUTH_ROUTES` (`BASE: '/auth'`).

- Route Constant: `AUTH_ROUTES.LOGIN` (POST `/auth/login`)
  - Access: Public
  - Input (body): `LoginCommand` { username, password }
  - Input (query/params): none
  - Output: `AuthTokensDTO` { accessToken, refreshToken, role }

- Route Constant: `AUTH_ROUTES.REFRESH` (POST `/auth/refresh`)
  - Access: Public (requires a valid refresh token in body/cookie)
  - Input (body): `RefreshTokenCommand` { refreshToken }
  - Input (query/params): none
  - Output: `AuthTokensDTO`

- Route Constant: `AUTH_ROUTES.LOGOUT` (POST `/auth/logout`)
  - Access: Authenticated
  - Input (body): `RefreshTokenCommand` { refreshToken } — the token to revoke
  - Input (query/params): none
  - Output: none

- Route Constant: `AUTH_ROUTES.ME` (GET `/auth/me`)
  - Access: Authenticated
  - Input (body): none
  - Input (query/params): none
  - Output: `SessionUserDTO` { id, username, role, fullName }

## 3. Events [CONTRACT]
(none)

## 4. Business Logic (Service) [BACKEND]
- **login:** parse `LoginCommand` → find `User` by `username` where `deletedAt` is null → if missing **or** `isEnabled` is false → `AUTH_INVALID_CREDENTIALS` (generic; never reveal which) → verify password with Argon2id → on mismatch `AUTH_INVALID_CREDENTIALS` → mint access JWT from `JWTPayload` { id, role } (15 min) and an opaque refresh token → store the **hash** of the refresh token in `RefreshToken` with `expiredAt` → set `User.lastLoginAt = now` → return tokens + role. (Brute-force lockout is middleware, not service.)
- **refresh:** parse `RefreshTokenCommand` → hash and look up the `RefreshToken` row → if not found or `expiredAt` is past → `AUTH_UNAUTHORIZED` → rotate: delete the old row, mint a new access + refresh pair, store the new hash → return tokens + role (role read from the owning user).
- **logout:** hash the provided refresh token → delete the matching `RefreshToken` row (idempotent — succeeds even if already gone).
- **me:** read the principal from `requireAuth` (`JWTPayload`) → load the `User` and its role profile (`Admin` or `Activator`) → compose `SessionUserDTO` { id, username, role, fullName }.

## 5. Data Mapping [BACKEND]
- **toDTO:** never expose `password` or `tokenHash`. `AuthTokensDTO` carries only the freshly minted tokens (refresh token is returned raw to the client but persisted only as a hash). `SessionUserDTO` composes `username` (User) + `fullName` (Admin/Activator profile) + `role`.
- **toPersistence:** persist only the **hash** of the refresh token, never the raw value; `expiredAt` stored as `DateTime`.

## 6. Technical Constraints [BACKEND]
- Passwords verified with **Argon2id**. Refresh tokens stored **hashed** (never plaintext); access JWT TTL **15 min**; refresh **rotated on every use**. Login rate-limited (5 failures → 5-minute lockout) at middleware. Tokens delivered via httpOnly + Secure cookies preferred (frontend concern). All dates ISO 8601 on the wire.

## 7. Test Scenarios [BACKEND]
- 200 — valid login returns tokens + role; `lastLoginAt` updated.
- 401 `AUTH_INVALID_CREDENTIALS` — unknown username, wrong password, or disabled/soft-deleted user (identical generic message in all three).
- 429 — after 5 failed attempts within the window.
- 200 — refresh rotates the token; the old refresh token is rejected on reuse (→ 401).
- 401 `AUTH_UNAUTHORIZED` — refresh with an expired, unknown, or already-rotated token.
- 200 — logout revokes the token; repeating logout is idempotent (still 200).
- 401 — `/me` with a missing/invalid JWT; 200 — returns the composed `SessionUserDTO`.
