# Module Specification: Activator

## 1. Context [CONTRACT]
- Prisma Entity: `Activator` (and the underlying `User` of role `ACTIVATOR`)
- Depends on: User (`UserRole`, `UserIdentityDTO`); `common` (`ApiResponse`, `ErrorCode`, `paginated`); Activation (backend only — derived counts: active slots, avg time, success rate); Payment (backend only — `totalPaid` on detail); Log (backend only — inline audit)
- Scope note: the active-request **work queue**, history, and the take/flag/activate/cancel/freeze actions live in the **Activation** module, not here. This module owns the activator entity, its admin management, and the activator's own dashboard stats.

## 2. API Interface [CONTRACT]
`ACTIVATOR_ROUTES` (`BASE: '/activators'`).

**Admin-facing**

- Route Constant: `ACTIVATOR_ROUTES.GET_ALL` (GET `/activators`)
  - Access: Admin
  - Input (query/params): `GetActivatorsQuery` { page?, limit?, search? }
  - Output: `ActivatorDTO[]` (paginated)

- Route Constant: `ACTIVATOR_ROUTES.CREATE` (POST `/activators`)
  - Access: Admin
  - Input (body): `CreateActivatorCommand` { fullName, username, phone, initialCredits? }
  - Output: `ActivatorWithCredentialsDTO` { activator: `ActivatorDTO`, generatedPassword } — **one-time** (see exception note)

- Route Constant: `ACTIVATOR_ROUTES.GET_BY_ID` (GET `/activators/:id`)
  - Access: Admin
  - Input (query/params): `ActivatorIdParams` { id }
  - Output: `ActivatorDetailDTO`

- Route Constant: `ACTIVATOR_ROUTES.UPDATE` (PATCH `/activators/:id`)
  - Access: Admin
  - Input (body): `UpdateActivatorCommand` { fullName?, phone?, username? }
  - Input (query/params): `ActivatorIdParams`
  - Output: `ActivatorDTO`

- Route Constant: `ACTIVATOR_ROUTES.TOGGLE` (POST `/activators/:id/toggle`)
  - Access: Admin
  - Input (query/params): `ActivatorIdParams`
  - Output: `ActivatorDTO`

- Route Constant: `ACTIVATOR_ROUTES.RESET_PASSWORD` (POST `/activators/:id/reset-password`)
  - Access: Admin
  - Input (query/params): `ActivatorIdParams`
  - Output: `GeneratedPasswordDTO` { generatedPassword } — **one-time** (see exception note)

- Route Constant: `ACTIVATOR_ROUTES.DELETE` (DELETE `/activators/:id`)
  - Access: Admin
  - Input (query/params): `ActivatorIdParams`
  - Output: none

- Route Constant: `ACTIVATOR_ROUTES.PERFORMANCE` (GET `/activators/:id/performance`)
  - Access: Admin
  - Input (query/params): `ActivatorIdParams` + `ActivatorPerformanceQuery` { days? (default 30) }
  - Output: `ActivatorPerformanceDTO` { series: { date, count, earned }[] }

**Activator-facing (self)**

- Route Constant: `ACTIVATOR_ROUTES.MY_STATS` (GET `/activators/me/stats`)
  - Access: Authenticated (activator principal)
  - Output: `ActivatorDashboardDTO` { totalEarnings, earningsTrendPercent, creditsBalance, totalActivations, activationsToday, avgActivationTimeSeconds, activeSlotsUsed, weekly: { date, count }[] }

DTOs:
- `ActivatorDTO` = { id, userId, fullName, username, phone, isEnabled, totalEarning, credits, nbOfActivation, nbOfSuccessfulActivation, avgActivationTimeSeconds (derived), lastLoginAt, createdAt }.
- `ActivatorDetailDTO` = `ActivatorDTO` + { totalPaid, creditsOwed (= credits), successRate }.

> **Exception note (flagged for confirmation):** `ActivatorWithCredentialsDTO` and `GeneratedPasswordDTO` return a plaintext one-time `generatedPassword` (same sanctioned exception as the Admin module). Additionally, the activator's **login password is never exposed** in `ActivatorDTO` — so the admin activators-table "reveal password" column from the page spec can only display the one-time creation/reset password, not the stored credential. Confirm both points before Stage 1.

## 3. Events [CONTRACT]
(none here — real-time activation events belong to the Activation module; audit logging is inline.)

## 4. Business Logic (Service) [BACKEND]
- **getAll:** require admin → query `Activator` join `User` → optional `search` (fullName/username/phone) → paginate → derive `avgActivationTimeSeconds` per activator from completed activations → map. Header sums (total successful, total credits owed) come from the same aggregate.
- **create:** unique `username` check across all users → generate temp pw → Argon2id hash → transaction { create `User`(role ACTIVATOR) → create `Activator`(profile, `initialCredits`→`credits`, counters 0) } → write `Log` `CHANGE_USER_INFORMATION` → return `ActivatorDTO` + one-time pw.
- **getById:** load `Activator`+`User` → derive `avgActivationTimeSeconds`, `successRate` (`nbOfSuccessfulActivation / nbOfActivation`), `totalPaid` (sum of non-deleted `Payment`) → `ActivatorDetailDTO` or `RESOURCE_NOT_FOUND`.
- **update:** load → username uniqueness if changing → update → `Log` `CHANGE_USER_INFORMATION`.
- **toggle:** flip `User.isEnabled` → `Log` `CHANGE_USER_STAT`.
- **resetPassword:** generate+hash → update `User.password` → `Log` `CHANGE_USER_PASSWORD` → return one-time pw.
- **delete:** soft-delete `User` (+ `Activator`). Edge: optionally block (`RESOURCE_CONFLICT`) if the activator has in-progress activations.
- **performance:** aggregate the activator's `ACTIVATED` activations per day over N days → `{ date, count, earned }[]`.
- **myStats:** principal must be an activator → read own `Activator` → derive totals, `activationsToday`, `avgActivationTimeSeconds`, weekly series, `earningsTrendPercent` (vs previous period), and `activeSlotsUsed` = count of own activations in `PROCESSING` / `WRONG_INFORMATION` / `ADDITIONAL_INFORMATION` / `FREEZE`.

## 5. Data Mapping [BACKEND]
- **toDTO:** `ActivatorDTO` composes `Activator` (counters, earning, credits) + `User` (username, isEnabled, lastLoginAt→ISO, createdAt→ISO); `Decimal`→number (DZD, 2dp); **never** include `User.password`. Derived fields (`avgActivationTimeSeconds`, `successRate`, `totalPaid`) are computed, not stored.
- **toPersistence:** `initialCredits`→`credits`; trim username/phone; hash password.

## 6. Technical Constraints [BACKEND]
- Login password **Argon2id**-hashed, never in any DTO. `Decimal` money serialized as a 2-dp number. `avgActivationTimeSeconds` basis = `takenAt → completedAt` (consistent with the commission tiers). Username unique across all users. All dates ISO 8601.

## 7. Test Scenarios [BACKEND]
- 200 — list (admin) with derived avg time + header sums; 403 for a non-admin principal.
- create — returns one-time password; 409 `RESOURCE_CONFLICT` on duplicate username.
- 200 — detail with `successRate` / `totalPaid` / `creditsOwed`; 404 unknown id.
- 200 — update / toggle / reset-password each write the matching log type.
- 200 — `myStats` for an activator principal (`activeSlotsUsed` reflects in-progress activations); 403 — admin (or any non-activator) hitting the self endpoint.
- delete — soft-deletes; optional 409 if in-progress activations exist.
