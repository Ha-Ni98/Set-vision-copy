# Sprint 9 Report — Activator: Logic (service)

**Status:** ✅ Done  
**Date:** 2026-06-30

## What was done

- `src/modules/activator/activator.service.ts` — `ActivatorService implements IActivatorService`:
  - **`getAll`** — AND filter (`user.deletedAt null`) + optional OR search (fullName/phone/username); includes ACTIVATED activations per row for `computeAvgSeconds`; parallel count; `buildPaginationMeta`.
  - **`create`** — username uniqueness across all users (→ ConflictError); `generateTempPassword` + `hashPassword`; `$transaction` [User(ACTIVATOR) + Activator(credits=initialCredits ?? 0, counters 0) + Log(CHANGE_USER_INFORMATION)]; one-time `generatedPassword`.
  - **`getById`** — includes ACTIVATED activations + non-deleted Payments; derives `avgActivationTimeSeconds` (computeAvgSeconds), `successRate` (÷0 guard → 0), `totalPaid` (sum payment.totalAmount), `creditsOwed` = `credits`; 404 on miss.
  - **`update`** — load 404; optional username uniqueness (→ ConflictError); `$transaction` [selective User.username + Activator fields + Log(CHANGE_USER_INFORMATION)].
  - **`toggle`** — load 404; flip `User.isEnabled`; `$transaction` [User update + Log(CHANGE_USER_STAT)]; no Activator.isEnabled (Activator model has none).
  - **`resetPassword`** — load 404; `$transaction` [User.password + Log(CHANGE_USER_PASSWORD)]; one-time pw.
  - **`delete`** — load 404; count in-progress activations (PROCESSING/WRONG_INFORMATION/ADDITIONAL_INFORMATION/FREEZE) → 409 if any; `$transaction` [soft-delete User (deletedAt + isEnabled:false)].
  - **`performance`** — load 404; fetch ACTIVATED activations since `now - N days`; group by day in TypeScript; accumulate `Prisma.Decimal` earned per day; return series via mapper.
  - **`myStats`** — load by `userId = principalUserId` → ForbiddenError if null; `Promise.all` [activeSlotsUsed count (4 in-progress states), activationsToday count, 7-day weekly findMany, all-time completedAt findMany, current+prev 30-day earnings aggregates]; derive `earningsTrendPercent` (÷0 → 0); build 7-slot weekly map; `computeAvgSeconds` over all-time completed.

- `test/unit/modules/activator/activator.service.spec.ts` — 30 unit tests:
  - getAll: paginated; avgActivationTimeSeconds null when no activations; correct value when present.
  - create: 409 dup username; initialCredits→credits; default credits=0; CHANGE_USER_INFORMATION log.
  - getById: 404; successRate math (5/10=0.5); ÷0 guard; totalPaid sum; creditsOwed=credits mirror.
  - update: 404; 409 collision; CHANGE_USER_INFORMATION log.
  - toggle: 404; flip + CHANGE_USER_STAT log.
  - resetPassword: 404; generatedPassword + CHANGE_USER_PASSWORD log.
  - delete: 404; 409 in-progress; soft-deletes user.
  - myStats: 403 non-activator; activeSlotsUsed value; 4-state filter verified on call args; earningsTrendPercent=0 when prev=0; weekly always 7 entries.
  - performance: 404; empty series; day-grouping + earned accumulation.

## Validation

- `tsc --noEmit`: clean
- `npm run test:unit`: **195/195 passed** (+30 service tests)
- `computeAvgSeconds` uses `takenAt→completedAt` basis; `ACTIVATED` stat for performance and avg.
- `Activation`/`Payment` accessed read-only; no mutations to either model.
- Correct `Log` action types: CHANGE_USER_INFORMATION (create/update), CHANGE_USER_STAT (toggle), CHANGE_USER_PASSWORD (resetPassword).
