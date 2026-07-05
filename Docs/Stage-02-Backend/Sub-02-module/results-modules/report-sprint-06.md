# Sprint 6 Report — Admin: Logic (service)

**Status:** ✅ Done  
**Date:** 2026-06-30

## What was done

- `src/modules/admin/admin.mapper.ts` — added explicit return type annotation to `toPersistence` so the service can safely destructure `{ username, ...adminFields }`.
- `src/modules/admin/admin.service.ts` — `AdminService implements IAdminService`:
  - **getAll**: `AND` filter (`user.deletedAt null`) + optional search OR over `fullName`/`phone`/`user.username`; parallel `findMany`+`count`; `buildPaginationMeta`; maps via `AdminMapper.toDTO`.
  - **create**: username uniqueness across all `User` → `ConflictError`; `generateTempPassword`; argon2 hash; `$transaction` [create `User(ADMIN, isEnabled true)` → create `Admin` → write `Log CHANGE_USER_INFORMATION`]; returns `AdminWithCredentialsDTO` with one-time plaintext pw.
  - **getById**: `admin.findFirst` where `user.deletedAt null` → `NotFoundError` if absent.
  - **update**: load → `NotFoundError`; username conflict re-check → `ConflictError`; `$transaction` [optional `user.update(username)` + optional `admin.update(fullName/phone)` + `Log CHANGE_USER_INFORMATION`]; returns updated `AdminDTO`.
  - **toggle**: load → `NotFoundError`; flip `User.isEnabled`; `$transaction` [update `User.isEnabled` + sync `Admin.isEnabled` (FC-8) + `Log CHANGE_USER_STAT`].
  - **resetPassword**: load → `NotFoundError`; new temp pw → hash → `$transaction` [update `User.password` + `Log CHANGE_USER_PASSWORD`]; returns `AdminGeneratedPasswordDTO`.
  - **delete**: load → `NotFoundError`; self-delete guard → `ForbiddenError`; last-enabled-admin guard (count ≤ 1) → `ConflictError`; `$transaction` [soft-delete `User.deletedAt=now, isEnabled=false` + `admin.isEnabled=false`]; no log (no DELETE_USER action type).
- `test/unit/modules/admin/admin.service.spec.ts` — 19 tests (mock Prisma + `$transaction`): getAll paginated + search; create 409 dup/success/log; getById 404/success; update 404/409 collision/log; toggle 404/flip+log/Admin.isEnabled sync; resetPassword 404/new-pw+log; delete 404/403 self/409 last-admin/soft-delete verified.

## Validation

- `tsc --noEmit`: clean
- `npm run test:unit`: **135/135 passed** (+19 tests)
- `isEnabled` always toggled on both `User` and `Admin` in the same transaction (FC-8); `delete` has no log (correct — no `DELETE_USER` LogActionType); one-time password never logged or stored in plaintext.
