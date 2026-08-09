# Set 1 — Execution Report

**Session:** Set 1 execution (implements `Docs/Stage-04-fix/plan/set-1-plan.md`) · **Date:** 2026-08-09 · **Branch:** `version-02-01`

Implemented exactly per the plan, in order: prisma → contract → backend → frontend. All open questions (Q1–Q7) were resolved using the plan's own recommendations, since none were overridden before execution.

---

## Files created/modified, grouped by package

### `Apps/api` (prisma + backend)

**Modified:**
- `prisma/schema.prisma` — `UserRole` += `DISTRIBUTOR`; `LogActionType` += `LINK_USER_ACCOUNT`, `UNLINK_USER_ACCOUNT`; `Distributor.userId String? @unique` + `user User?` relation (`onDelete: SetNull`); `User.distributor Distributor?`
- `src/modules/auth/auth.service.ts` — `me()` converted from `if ADMIN … else Activator` to an explicit three-way switch (+ `default` case for TS exhaustiveness); `DISTRIBUTOR` branch uses `findFirst({ userId, deletedAt: null })`
- `src/modules/distributor/distributor.interface.ts` — += `createAccount`, `unlinkAccount`
- `src/modules/distributor/distributor.mapper.ts` — `GEO_INCLUDE`-derived `user` now feeds `hasAccount`/`username`; `toDetailDTO` now composes `toDTO`; += `toWithCredentialsDTO`
- `src/modules/distributor/distributor.service.ts` — `GEO_INCLUDE` += `user: { select: { username } }`; `getAll` search += username clause (Q4); `toggle` cascades `User.isEnabled` when linked (Q2); `delete` now unlinks a linked login in the same transaction before soft-deleting (Q5); += `createAccount`, `unlinkAccount`
- `src/modules/distributor/distributor.controller.ts` — += `createAccount`, `unlinkAccount` handlers
- `src/modules/distributor/distributor.routes.ts` — += `POST /:id/account` (adminOnly), `DELETE /:id/account` (adminOnly)
- `src/common/realtime/rooms.ts` — `NS.DISTRIBUTORS = '/distributors'`; `rooms.distributor(id)`
- `src/common/realtime/realtime-gateway.ts` — `distributorNs` connection handler, mirrors the activator join (`deletedAt: null` difference)
- `src/server.ts` — `io.of(NS.DISTRIBUTORS).use(authNamespace([UserRole.DISTRIBUTOR]))`

**Created:**
- `prisma/migrations/20260809153309_add_distributor_role_and_account/migration.sql`

### `Apps/contract`

**Modified:**
- `src/modules/user/user.enums.ts` — `UserRole` += `DISTRIBUTOR`
- `src/modules/log/log.enums.ts` — `LogActionType` += `LINK_USER_ACCOUNT`, `UNLINK_USER_ACCOUNT`
- `src/modules/distributor/distributor.routes.ts` — += `CREATE_ACCOUNT`, `UNLINK_ACCOUNT` (both `/:id/account`)
- `src/modules/distributor/distributor.command.ts` — += `CreateDistributorAccountSchema`
- `src/modules/distributor/distributor.dtos.ts` — `DistributorResponseSchema` += `hasAccount`, `username`; += `DistributorWithCredentialsResponseSchema` (sanctioned §0.1.1 one-time-create exception)

### `Apps/web`

**Modified:**
- `src/App.tsx` — `RoleGuard` nested inside `ProtectedRoute` for both `/dashboard,/requests,/history` (ACTIVATOR) and `/portal` (DISTRIBUTOR); `CatchAllRoute` now role-switches its layout
- `src/components/layout/AdminGuard.tsx` — reimplemented as `<RoleGuard allow={[ADMIN]}/>`
- `src/components/layout/AdminLayout.tsx` — accepts an optional `children` override (needed so `CatchAllRoute` can render 404 content inside the admin shell — same pattern `ActivatorLayout` already used)
- `src/components/layout/ProtectedRoute.tsx` — `PublicOnlyRoute` redirect generalized to `ROLE_HOME[session.role]`
- `src/components/shared/StatusBadge.tsx` — `LOG_ACTION_TONE` += the two new `LogActionType` values
- `src/config/nav-links.ts` — += `DISTRIBUTOR_NAV_LINKS`
- `src/config/translations.json` — += `distributor.*` (nav/portal/shell), `admin.distributors.account.*`, two `enums.logActionType.*` keys
- `src/hooks/useDistributors.ts` — += `useCreateDistributorAccount`, `useUnlinkDistributorAccount`
- `src/lib/realtime.ts` — `NS.DISTRIBUTORS`; `ROLE_NAMESPACE` map; `connectRoleSocket` now an exhaustive switch; += `attachDistributorNamespaceListeners` (no-op — no events yet)
- `src/services/distributors.service.ts` — += `createAccount`, `unlinkAccount`
- `src/pages/admin/distributors/DistributorsPage.tsx` — wires the create-account modal + mutations, unlink mutation
- `src/pages/admin/distributors/components/DistributorActionsMenu.tsx` — += Create login / Unlink login menu item (role-conditional on `hasAccount`)
- `src/pages/admin/distributors/components/DistributorsTable.tsx` — owns the unlink confirm `AlertDialog`; bubbles create-account requests to the page
- `src/pages/admin/distributors/components/DistributorProfileCard.tsx` — += read-only "Login account" field

**Created:**
- `src/config/role-home.ts` — `ROLE_HOME: Record<UserRole, string>`
- `src/components/layout/RoleGuard.tsx`
- `src/components/layout/DistributorLayout.tsx`, `DistributorHeader.tsx`, `DistributorSidebar.tsx`
- `src/pages/distributor/PortalPage.tsx`
- `src/pages/admin/distributors/components/CreateDistributorAccountModal.tsx`
- `src/pages/admin/distributors/components/create-distributor-account.schema.ts`

**Not modified:** no test file, MSW handler, or vitest config anywhere. Confirmed with `git status --porcelain` before and after.

---

## Migration

**Name:** `20260809153309_add_distributor_role_and_account`

Generated via `prisma migrate diff` against a throwaway shadow database (`prisma migrate dev` refused to run non-interactively in this environment) and applied with `prisma migrate deploy`. Contents matched the plan's prediction exactly: two `ALTER TYPE … ADD VALUE`, one `ALTER TABLE … ADD COLUMN "userId"`, one unique index, one FK (`ON DELETE SET NULL`). Applied cleanly on Postgres 16 — no transaction-wrapping issue with the enum additions.

DB was reseeded (not reset — the migration didn't require a destructive reset): `load_wilaya` → `load_commission_durations` → `load_mock_data`. `create_admin_account` was skipped (interactive script; an admin already existed in the dev DB). **No seed script needed updating** — confirmed: all 8 seeded distributors have `userId IS NULL`.

---

## Deviations from the plan

None in scope or approach. Two small necessary additions the plan flagged as likely but didn't spell out line-by-line:

1. **`auth.service.me()` needed a `default` case** in the new switch for TypeScript's definite-assignment analysis to accept `profile` as always-assigned (the Prisma-generated `UserRole` and the contract's `UserRole` are structurally, not nominally, identical, so TS can't prove switch exhaustiveness across the two without one). Throws `AuthError('Unknown role')`, matching the pattern of every other branch.
2. **`AdminLayout` didn't accept a `children` override** the way `ActivatorLayout` already did — required so `CatchAllRoute`'s new role-switch can actually render 404 content inside the admin shell for an authenticated admin, instead of silently rendering a blank `<Outlet/>` (no matched child route). Added the same `children?: ReactNode` escape hatch `ActivatorLayout`/`DistributorLayout` use.

One translation-copy fix caught during implementation, not deviation from the plan's intent: the plan's draft reused `activator.shell.signOut*` keys for `DistributorHeader`'s sign-out dialog, but `activator.shell.signOutBody`'s actual copy says "access the activator portal" — wrong for a distributor. Added distributor-specific `distributor.shell.signOut/signOutTitle/signOutBody` keys instead (not in the plan's translation table, but required by "no inline strings" + correct copy).

---

## Verification

| Check | Contract | API | Web |
|---|---|---|---|
| `tsc --noEmit` | ✅ clean | ✅ clean | ✅ clean (both `tsconfig.json` and `tsconfig.test.json`) |
| `eslint` | ✅ clean | **no eslint tooling installed** (pre-existing — see below) | ✅ clean on every file this set touched; 111 pre-existing errors/6 warnings remain in untouched files (confirmed by name — none overlap this set's changes) |
| `madge --circular src` | ✅ clean (86 files) | — (rule only applies to contract) | — (rule only applies to contract) |
| Test files touched | 0 | 0 | 0 |

**Pre-existing gap, not introduced by this set:** `Apps/api` has no `eslint` devDependency, no config file, and no `lint` npm script — `npx eslint src` fails with "eslint not found". CLAUDE.md's definition of done asks for "eslint clean in all three," but there is nothing to run for `api`. Flagged rather than silently worked around; installing a new devDependency to fix this would itself violate "do not install a new library without asking first."

**Live end-to-end smoke test** (dev server + local Postgres, not a test command): logged in as `mockadmin`, created a login for a seeded account-less distributor (`POST /distributors/:id/account`, blank password → generated), logged in as that distributor, confirmed `GET /auth/me` resolves with `role: DISTRIBUTOR` and the correct `fullName`, confirmed `403` on `/activations/pending`, `/distributors`, `/statistics/dashboard`, unlinked the account (`DELETE /distributors/:id/account`), confirmed the old credentials now get `401` on login, and confirmed one `LINK_USER_ACCOUNT` and one `UNLINK_USER_ACCOUNT` row in `/logs` with correct `actionDescription`s. Server stopped after.

**Not done — frontend UI not exercised in a browser.** No dev server for `Apps/web` was started this session; the routing/guard/shell/modal work is verified by `tsc`+`eslint` only. This is flagged explicitly, per the instruction to say so rather than claim a UI verification that didn't happen. The manual test checklist below covers exactly this gap.

---

## Open questions — resolved using the plan's own recommendations (none overridden before execution)

| # | Resolution taken |
|---|---|
| Q1 | Role-neutral `LINK_USER_ACCOUNT` / `UNLINK_USER_ACCOUNT` |
| Q2 | Yes — `distributor.toggle()` now cascades to the linked `User.isEnabled` |
| Q3 | Soft-delete on unlink (matches `activator.service.delete()`) |
| Q4 | Yes — distributor list search also matches `username` |
| Q5 | Fixed the login half in Set 1 (`distributor.delete()` now unlinks in the same transaction and logs `UNLINK_USER_ACCOUNT`); the pre-existing missing-log-on-delete gap (no `DELETE_DISTRIBUTOR`-style log for the distributor row itself) is left for the Set 13 audit-log matrix, as recommended |
| Q6 | No reset-password route added |
| Q7 | No "Account" column added to `DistributorsTable`; menu label + profile card cover it |

**New, unplanned observation surfaced during execution, not acted on (out of scope, flagging only):** `Docs/Stage-04-fix/new-features-fixes/version-2-description.md` shows as modified in `git status` (one line under the Set 13 plan prompt, changing "en, fr, or ar" → "en or fr"). This predates this session — I never opened or edited that file — and is unrelated to Set 1. Left untouched.

---

## Manual test checklist

Prereqs: migration applied and DB reseeded (done this session), both dev servers running (`Apps/api` was stopped after the smoke test above — restart it; `Apps/web` was never started this session), admin login `mockadmin` / `Password123!`.

**Regression — nothing that worked stops working**

1. Log in as **admin** → lands on `/admin`. Walk every sidebar entry. Every page loads; no 403; no blank shell.
2. Log in as an existing **activator** (`activator1`…`activator9`, password `test123`) → lands on `/dashboard`. Pending pool loads, Requests badge shows a count, taking a request still works.
3. As that activator, open `/admin` directly in the URL bar → redirected to `/dashboard`.
4. Log out from both accounts → back to `/login`; re-entering `/admin` bounces to `/login`.

**Creating a distributor login**

5. Admin → Distributors → pick a distributor with no account (all 8 seeded ones qualify). Row menu shows **Create login**; detail page shows *Login account: No account*.
6. Create a login with a **blank password** → panel reveals a generated password once. Copy it. Close/reopen the modal → password is gone.
7. Create a login on a second distributor with an **explicit password** (≥ 8 chars) → accepted. Try 5 characters → blocked client-side.
8. Distributor that already has a login → menu offers **Unlink**, not Create.
9. Try a username already used by an admin or activator (e.g. `mockadmin`) → 409 toast, no partial row.

**The distributor session**

10. Sign in as the distributor from step 6 → lands on **`/portal`**, distributor shell (logo, one-item sidebar, theme/language toggles, full name in menu), empty-state copy. No activator sidebar, no bell, no console 403s.
11. Same session: `/admin` → redirected to `/portal`; `/dashboard` → redirected to `/portal`; `/nonsense` → 404 rendered **inside the distributor shell**.
12. DevTools → Network → WS: one socket to **`/distributors`**, connected, no `FORBIDDEN`.
13. `curl` with the distributor's token against `/activations/pending`, `/activations/recent`, `/distributors/`, `/orders/`, `/statistics/dashboard` → **403** on every one (already confirmed server-side this session for the first three).
14. `curl /auth/me` with the same token → **200**, `role: "DISTRIBUTOR"` (already confirmed this session).
15. Reload `/portal` → session restores without flashing to `/login`.

**Unlink**

16. As admin, unlink that distributor's login and confirm the dialog (server-side behavior already confirmed this session).
17. The distributor's still-open tab: next refresh-token call fails, lands on `/login`. Re-login with the same credentials → rejected (already confirmed this session).
18. Row/detail back to *No account*; **Create login** reappears.

**Account-less distributors keep working (D2)**

19. Pick a distributor that never had a login → detail page profile/stats/orders/cards all render.
20. Create an order for it, transition `IN_DELIVERY → DELIVERED` → cards land at the distributor, `nbOfActiveCards` increases.
21. Revoke one of its cards → counter moves.
22. Admin → Statistics: distributor totals, top-distributors, wilaya heatmap still populate.
23. Distributors list: search (including by username now), wilaya/commune filters, pagination all still work.

**Audit trail**

24. Admin → Logs, filter **Linked Login Account** → rows from steps 6/7 (already confirmed server-side).
25. Filter **Unlinked Login Account** → row from step 16 (already confirmed server-side).
26. Both badges render with a label and color, not a raw enum string.

**Q2 (toggle cascade)**

27. Disable a distributor that has a login → that login can no longer sign in. Re-enable → it can again.
