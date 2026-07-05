# Plan — User Module

> Stage 02 · Sub-02 · Phase 01 — vertical-slice plan. **No code.**
> Spec: `Module-Contracts/user.md` · Rules: `module-implementation-rules.md`, `test-rules.md`.

---

## 1. Verdict — a 1-file "module"

The User module exposes **no HTTP surface**: no routes, no controller, no service, no interface, no listener. `User` rows are created/mutated only by **Admin**, **Activator** (own the `User` + profile lifecycle in a transaction) and **Auth** (`lastLoginAt`). The contract already ships the shared outputs — `UserRole` enum and `UserIdentityDTO` — from `@my-app/contract` (`modules/user/`). Stage 2 adds exactly **one** backend file: a shared mapper other modules reuse.

### Files to create
- [x] `user.mapper.ts` — `toUserIdentityDTO`
- [ ] ~~`user.interface.ts`~~ — none (no service)
- [ ] ~~`user.service.ts`~~ — none
- [ ] ~~`user.listener.ts`~~ — none (spec §3 Events: none)
- [ ] ~~`user.controller.ts`~~ — none (no HTTP surface)
- [ ] ~~`user.routes.ts`~~ — none (nothing to mount; not added to the app router)

Location: `apps/api/src/modules/user/user.mapper.ts`.

---

## 2. Contract & Schema Analysis

| Contract `UserIdentityDTO` (`user.dtos.ts`) | Prisma `User` | Mapping |
|---|---|---|
| `id: uuid` | `id` | pass-through |
| `username: string` | `username` | pass-through |
| `role: UserRole` | `role: UserRole` | `entity.role as UserRole` (Prisma↔contract 1:1, both `ADMIN`/`ACTIVATOR`) |
| `isEnabled: boolean` | `isEnabled` | pass-through |
| `lastLoginAt: iso \| null` | `lastLoginAt: DateTime?` | `?.toISOString() ?? null` |
| `createdAt: iso` | `createdAt: DateTime` | `.toISOString()` |
| — (excluded) | `password` | **never returned** |
| — (excluded) | `deletedAt`, `updatedAt` | **never returned** |

- **Exclude-by-listing**: build the DTO object field-by-field; never spread the entity (rules §4).
- Close with `UserIdentityResponseSchema.parse(dto)` as the dev/test conformance guard.
- `toPersistence`: **n/a** — Admin/Activator own writes.

---

## 3. Mapper shape (no code)

`UserMapper.toUserIdentityDTO(user: User): UserIdentityDTO` — pure, static, picks the 6 safe fields, converts the two dates, parses against `UserIdentityResponseSchema`, returns. Consumed by Admin/Activator mappers (which compose it with profile fields) and by the Auth `/me` composer.

---

## 4. Test Strategy (`test/`)

- **Factories** (`test/data/user.factory.ts`): a `userEntity(overrides)` factory returning a Prisma-shaped `User` (incl. `password`, `deletedAt`) for mapper unit tests. (The existing `createUserPayload` stays as the login-command factory.)
- **Unit — mapper** (`test/unit/modules/user/user.mapper.spec.ts`):
  - output `parses` against `UserIdentityResponseSchema`.
  - output has **no** `password` and **no** `deletedAt` key (spec §7).
  - `lastLoginAt: null` survives as `null`; a `Date` becomes an ISO string.
  - `role` round-trips `ADMIN`/`ACTIVATOR` and matches `schema.prisma` exactly.
- No integration / conformance route tests (no routes).

---

## 5. Notes for downstream modules

- `password` is **DB-only**, hashed; never serialized. (Hashing moves to **Argon2id** per `plan-00-foundation.md` FC-1; the User mapper is unaffected — it never touches the hash.)
- Username is unique across **all** users (admins + activators share the namespace) — enforced by the owning services, not here.
- Soft delete via `deletedAt`; the identity DTO carries none of these internals.
