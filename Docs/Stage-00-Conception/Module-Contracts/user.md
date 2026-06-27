# Module Specification: User

## 1. Context [CONTRACT]
- Prisma Entity: `User`
- Depends on: none (foundational). Consumed by: `common/auth.ts` (`UserRole`), and the Auth, Admin, and Activator modules.

## 2. API Interface [CONTRACT]
No `USER_ROUTES` — the User module exposes **no HTTP surface**. `User` records are created and mutated only through the **Admin** and **Activator** modules (which own the `User` + profile lifecycle in a transaction) and the **Auth** module (`lastLoginAt`). The module's contract output is the shared role enum and a shared identity DTO that other modules embed.

- Exports (contract): `UserRole` enum (`user.enums.ts`); `UserIdentityDTO` { id, username, role, isEnabled, lastLoginAt, createdAt } (`user.dtos.ts`) — `password` excluded by construction.

(No `command.ts`, `query.ts`, `routes.ts`, or `events.ts` for this module per the file-count rule.)

## 3. Events [CONTRACT]
(none)

## 4. Business Logic (Service) [BACKEND]
None — no service. The `User` entity is written by the Admin/Activator services (creation, profile/username/password/status changes) and the Auth service (`lastLoginAt`). A shared user mapper provides `toUserIdentityDTO` for reuse by those modules.

## 5. Data Mapping [BACKEND]
- **toDTO** (`toUserIdentityDTO`): pick id, username, role, `isEnabled`, `lastLoginAt`→ISO, `createdAt`→ISO; never include `password` or `deletedAt`.
- **toPersistence:** n/a (handled by the owning modules).

## 6. Technical Constraints [BACKEND]
- `password` is DB-only, hashed with **Argon2id**, never serialized into any response. `role` maps Prisma `UserRole` ↔ contract `UserRole` 1:1. Soft delete via `deletedAt`; the identity DTO excludes soft-deleted internals. Username is unique across all users (admins and activators share the namespace).

## 7. Test Scenarios [BACKEND]
- Conformance: `toUserIdentityDTO` output parses against `UserIdentityDTO` and never carries `password`/`deletedAt`.
- `UserRole` enum values match `schema.prisma` exactly (`ADMIN`, `ACTIVATOR`).
