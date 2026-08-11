# SetVision v2 — Set 0 Recon & Decision Record

**Session:** Set 0 (recon only — no production code, no schema change, no test change)
**Date:** 2026-08-09 · **Branch:** `version-02-01`
**Inputs read:** `.claude/CLAUDE.md`, `Docs/Stage-01-Contract/contract-rules.md`, `Docs/Stage-02-Backend/back-end-rules.md`, `Docs/Stage-03-Frontend/front-end-rules.md`, `Docs/Stage-04-fix/new-features-fixes/version-2-description.md`.

---

## 1. Modules — routes and guards

**Contract modules (16):** `activation`, `activator`, `admin`, `auth`, `card`, `delivery-company`, `distributor`, `geography`, `log`, `lot`, `order`, `payment`, `set`, `statistics`, `subscription-plan`, `user`.
**Backend modules (15 routed + 1 mapper-only):** same list; `Apps/api/src/modules/user/` contains **only** `user.mapper.ts` — no routes, no service. All routers are mounted in `Apps/api/src/modules/index.ts` under their contract `BASE` constant.

`user` and `statistics`/`log` show the "create a file only if the module needs it" rule in action: `user` has no `*.routes.ts` at all, `log`/`statistics` have no `*.command.ts`.

| Contract module | Route constants | Backend guard(s) |
|---|---|---|
| `auth` (`auth.routes.ts`) | `BASE /auth`, `LOGIN`, `REFRESH`, `LOGOUT`, `ME` | `LOGIN` **public** + `loginRateLimiter`; `REFRESH` **public**; `LOGOUT`, `ME` → `requireAuth()` **any role** |
| `admin` | `BASE /admins`, `GET_ALL`, `CREATE`, `GET_BY_ID`, `UPDATE`, `TOGGLE`, `RESET_PASSWORD`, `DELETE` | all `ADMIN` |
| `activator` | `BASE /activators`, `GET_ALL`, `CREATE`, `GET_BY_ID`, `UPDATE`, `TOGGLE`, `RESET_PASSWORD`, `DELETE`, `PERFORMANCE`, `MY_STATS` | `MY_STATS` → **ACTIVATOR**; all others → `ADMIN` |
| `activation` — `KEY_ROUTES` | `BASE /keys`, `VERIFY`, `SUBMIT`, `UPDATE`, `ADDITIONAL`, `STATUS` | **PUBLIC — no auth at all** ([activation.routes.ts:38-73](Apps/api/src/modules/activation/activation.routes.ts#L38-L73)) |
| `activation` — `ACTIVATION_ROUTES` | `GET_PENDING`, `GET_RECENT` | `ACTIVATOR` **+** `ADMIN` (widened in Stage-04-fix; both are **global, unscoped** feeds) |
| | `GET_ACTIVE`, `GET_MY_HISTORY`, `TAKE`, `FLAG_WRONG`, `REQUEST_ADDITIONAL`, `ACTIVATE`, `CANCEL`, `RELEASE`, `FREEZE` | `ACTIVATOR` |
| | `GET_ALL`, `GET_BY_ID`, `ACTIVATE_BY_ADMIN`, `CANCEL_BY_ADMIN`, `SET_PRICE` | `ADMIN` |
| `card` | `BASE /cards`, `GET_ALL`, `GET_AVAILABLE_FOR_LOT`, `GET_BY_ID`, `DELETE`, `DISABLE`, `ENABLE`, `REVOKE` | all `ADMIN` |
| `delivery-company` | `BASE`, `GET_ALL`, `CREATE`, `UPDATE`, `TOGGLE` | all `ADMIN` |
| `distributor` | `BASE /distributors`, `GET_ALL`, `CREATE`, `GET_BY_ID`, `UPDATE`, `TOGGLE`, `DELETE` | all `ADMIN` |
| `geography` | `BASE`, `GET_WILAYAS`, `GET_COMMUNES` | all `ADMIN` |
| `log` | `BASE /logs`, `GET_ALL` | `ADMIN` |
| `lot` | `BASE /lots`, `GET_ALL`, `GET_AVAILABLE_FOR_ORDER`, `CREATE`, `DELETE` | all `ADMIN` |
| `order` | `BASE /orders`, `GET_ALL`, `GET_BY_ID`, `CREATE`, `TRANSITION`, `DELETE` | all `ADMIN` |
| `payment` | `BASE /payments`, `GET_ALL`, `CREATE`, `DELETE` | all `ADMIN` |
| `set` | `BASE /sets`, `GET_ALL`, `CREATE`, `TRANSITION`, `DELETE` | all `ADMIN` |
| `statistics` | `BASE`, `DASHBOARD`, `ACTIVATORS_SUMMARY`, `DISTRIBUTORS_SUMMARY`, `INVENTORY_SUMMARY`, `ORDERS_SUMMARY`, `ACTIVATIONS_SUMMARY`, `OVERVIEW`, `WILAYA_HEATMAP`, `WILAYA_DRILLDOWN` | all `ADMIN` |
| `subscription-plan` | `BASE`, `GET_ALL`, `CREATE`, `TOGGLE`, `GET_COMMISSION_DURATIONS`, `GET_COMMISSIONS`, `UPDATE_COMMISSION` | all `ADMIN` |
| `user` | *(none — enums + DTOs only)* | — |

**Pattern:** every routes file declares `const adminOnly = requireAuth({ roles: [UserRole.ADMIN] })` at the top and applies it per route. No route relies on a bare `requireAuth()` default except `AUTH_ROUTES.LOGOUT` / `ME`.

---

## 2. Auth — every `UserRole` guard site (Set 1 checklist)

### 2.1 Backend

| # | Site | What it guards |
|---|---|---|
| 1 | [auth.middleware.ts:9-38](Apps/api/src/common/middlewares/auth.middleware.ts#L9-L38) | The one `requireAuth({ roles, checkDB })` guard. `checkDB` re-reads `User.role` + `isEnabled`. |
| 2 | [activation.routes.ts:29-34](Apps/api/src/modules/activation/activation.routes.ts#L29-L34) | `activatorOnly`, `adminOnly`, **`activatorOrAdmin`** ← the only multi-role array today |
| 3 | [activator.routes.ts:20-21](Apps/api/src/modules/activator/activator.routes.ts#L20-L21) | `adminOnly`, `activatorOnly` |
| 4–14 | `admin`, `card`, `delivery-company`, `distributor`, `geography`, `log`, `lot`, `order`, `payment`, `set`, `statistics`, `subscription-plan` routes files, each line ~18-19 | `adminOnly` only |
| 15 | [server.ts:15-16](Apps/api/src/server.ts#L15-L16) | Socket namespace auth: `/activators` → `[ACTIVATOR]`, `/admin` → `[ADMIN]`. `/client` has **no** middleware. |
| 16 | [socket-auth.ts:10-23](Apps/api/src/common/realtime/socket-auth.ts#L10-L23) | `authNamespace(roles)` — rejects with `FORBIDDEN` |
| 17 | **[auth.service.ts:83-96](Apps/api/src/modules/auth/auth.service.ts#L83-L96)** | `me()` — `if (role === ADMIN) load Admin else load Activator`. **Blocking for D2.** A `DISTRIBUTOR` session falls into the `else` and throws `AuthError('Activator profile not found')`. |
| 18 | [auth.service.ts:40,69](Apps/api/src/modules/auth/auth.service.ts#L40) | `role` echoed into `AuthTokensDTO` at login/refresh (drives the frontend redirect) |
| 19 | [activator.service.ts:117](Apps/api/src/modules/activator/activator.service.ts#L117) | Stamps `role: UserRole.ACTIVATOR` on `User` at account creation — **the flow Set 1 mirrors** |
| 20 | [admin.service.ts:67,204](Apps/api/src/modules/admin/admin.service.ts#L67) | Stamps `role: ADMIN`; `:204` counts enabled admins (last-admin guard) |
| 21 | [user.mapper.ts:9](Apps/api/src/modules/user/user.mapper.ts#L9), [auth.mapper.ts:14,26](Apps/api/src/modules/auth/auth.mapper.ts#L14) | Casts `entity.role as UserRole` |
| 22 | [common/auth.ts](Apps/contract/src/common/auth.ts) + [user.enums.ts](Apps/contract/src/modules/user/user.enums.ts) | `JWTPayloadSchema.role = z.enum(UserRole)`; contract enum must stay byte-identical to the prisma enum |

### 2.2 Frontend

| # | Site | What it does |
|---|---|---|
| 1 | **[App.tsx:118-142](Apps/web/src/App.tsx#L118-L142)** | `<ProtectedRoute>` wraps `/dashboard`, `/requests`, `/history` — **authentication only, NO role check.** Any logged-in user of any role reaches the activator portal. **Biggest Set 1 risk.** |
| 2 | [ProtectedRoute.tsx:22-27](Apps/web/src/components/layout/ProtectedRoute.tsx#L22-L27) | `ProtectedRoute` — `isAuthenticated` only |
| 3 | [ProtectedRoute.tsx:33-41](Apps/web/src/components/layout/ProtectedRoute.tsx#L33-L41) | `PublicOnlyRoute` — **post-login redirect**: `session.role === ADMIN ? "/admin" : "/dashboard"` |
| 4 | [AdminGuard.tsx:27](Apps/web/src/components/layout/AdminGuard.tsx#L27) | `role !== ADMIN → <Navigate to="/dashboard">` |
| 5 | [App.tsx:48-71](Apps/web/src/App.tsx#L48-L71) | `CatchAllRoute` (404) renders **`ActivatorLayout`** for *any* authenticated user |
| 6 | [realtime.ts:175-190](Apps/web/src/lib/realtime.ts#L175-L190) | `connectRoleSocket(role)` — `role === ADMIN ? /admin : /activators`. A `DISTRIBUTOR` would hit `/activators` and be rejected `FORBIDDEN`. |
| 7 | [nav-links.ts](Apps/web/src/config/nav-links.ts) | `ACTIVATOR_NAV_LINKS` / `ADMIN_NAV_LINKS`. **Not role-switched by code** — chosen by which layout renders ([ActivatorSidebar.tsx:5](Apps/web/src/components/layout/ActivatorSidebar.tsx#L5), [AdminSidebar.tsx:6](Apps/web/src/components/layout/AdminSidebar.tsx#L6)). |
| 8 | [AuthProvider.tsx:33-42](Apps/web/src/components/providers/AuthProvider.tsx#L33-L42) | Reads `session.role` to drive the socket lifecycle; `AuthCtx` **does not expose `role`** — guards call `useSession()` directly |
| 9 | [useLogin.ts](Apps/web/src/hooks/useLogin.ts) | Does **not** navigate. `LoginPage` has no imperative redirect; `PublicOnlyRoute` (#3) performs it declaratively once `me()` resolves. |

**Set 1 conclusion:** the backend is safe-by-default (every route names its roles explicitly, and a new enum value opens nothing). The frontend is **not** — `ProtectedRoute`, `CatchAllRoute` and `connectRoleSocket` all assume "authenticated and not admin ⇒ activator".

---

## 3. Distributor today

**Model** ([schema.prisma](Apps/api/prisma/schema.prisma), `model Distributor`): `id`, `fullName`, `storeName`, `phone String?`, `wilayaId`, `communeId`, `isEnabled`, `nbOfActiveCards`, `nbOfActivation`, `createdAt`, `updatedAt`, `deletedAt`. Relations: `wilaya`, `commune`, `cards[]`, `orders[]`.

**Confirmed: there is no `userId`, no `User` relation, no login concept anywhere.** `User.admin` and `User.activator` exist; there is no `User.distributor`.

**Lifecycle** — admin-only, entirely through [distributor.service.ts](Apps/api/src/modules/distributor/distributor.service.ts):
- `create` (`:65`) — validates commune∈wilaya, creates the row, writes `ADD_DISTRIBUTOR` log, all in one `$transaction`.
- `update` (`:112`) — writes `CHANGE_DISTRIBUTOR_INFORMATION`.
- `toggle` (`:154`) — flips `isEnabled`, writes `CHANGE_DISTRIBUTOR_STAT`.
- `delete` (`:187`) — **soft delete** (`deletedAt`), and notably writes **no log** (`_actorId` is unused).
- Counters are mutated from other modules: `order.service.ts:194` (`nbOfActiveCards` += delivered cards), `activation.service.ts:746,1206` (`nbOfActivation` +1 / `nbOfActiveCards` −1), `card.service.ts:207` (revoke → `nbOfActiveCards` +1).

**Frontend:** `Apps/web/src/pages/admin/distributors/` — list, detail, orders, create/edit modals. No credential UI of any kind.

Set 1's mirror source is [activator.service.ts:99-141](Apps/api/src/modules/activator/activator.service.ts#L99-L141): create `User` (hashed password, role stamped) + profile row + log, in one `$transaction`, returning the plaintext password once via `ActivatorWithCredentialsDTO`.

---

## 4. Activator portal — confirmed feature-complete

Three pages, all under `<ProtectedRoute>` → `<ActivatorLayout>`:

| Page | File | Contents |
|---|---|---|
| Dashboard | [DashboardPage.tsx](Apps/web/src/pages/activator/DashboardPage.tsx) (182 L) | 4 stat cards (total earnings + trend, credits owed, total activations, avg time), weekly bar chart, active-slots card, new-activator empty state, skeletons + error state |
| Requests | [RequestsPage.tsx](Apps/web/src/pages/activator/RequestsPage.tsx) (290 L) | Pending pool `DataTable` with `LiveTimer` (wait mode) + take action + slot cap (3) + notification sound + row-glow/exit animations; active-request cards |
| — card | [ActiveRequestCard.tsx](Apps/web/src/components/sections/activator/ActiveRequestCard.tsx) (467 L) | Full detail: key, plan, distributor block, client block, account fields, dedicated OTP row, freeze reason, and all 6 actions (flag-wrong, request-additional, activate, cancel, release, freeze) with co-located Zod schemas |
| History | [HistoryPage.tsx](Apps/web/src/pages/activator/HistoryPage.tsx) (438 L) | Paginated table, status filter, 5 sort modes, date range, search, clear-filters, mobile card list, `activationEmail` column |

Realtime is wired ([realtime.ts:104-137](Apps/web/src/lib/realtime.ts#L104-L137)): `activation:created/taken/client-updated/resolved` → query invalidations, plus reconnect re-fetch and a connection-lost toast.

**Genuinely missing vs the v2 requirements — exactly two, and both are already scheduled:**

1. **Duration format (Set 2).** Durations render as `mm:ss` only, via [`formatTime`](Apps/web/src/lib/utils.ts#L18-L23) at `HistoryPage.tsx:200,373` and `DashboardPage.tsx:93`, and a **second, independent** `mm:ss` implementation inside [LiveTimer.tsx:19-24](Apps/web/src/components/shared/LiveTimer.tsx#L19-L24). Anything ≥ 1 h renders as e.g. `185:12`. No `hh:mm:ss`, no `dd:hh:mm:ss`.
2. **Activation-email picker (Set 10).** [ActiveRequestCard.tsx:330](Apps/web/src/components/sections/activator/ActiveRequestCard.tsx#L330) is a **free-text email input** validated by [activate-request.schema.ts:9](Apps/web/src/components/sections/activator/activate-request.schema.ts#L9). There is no pool, no list, no picker.

Everything else the v2 doc asks of the activator portal already exists. **D1's "out of scope except the duration sweep" holds** — with the footnote that Set 10 also touches this portal (the doc's own Set 10 scope says "one component, two call sites", so this is expected, not a contradiction).

---

## 5. Activation — the full read path

### 5.1 DTOs ([activation.dtos.ts](Apps/contract/src/modules/activation/activation.dtos.ts))

| DTO | Audience | Route |
|---|---|---|
| `KeyVerificationDTO` | **Public client** (gated by the card key) | `KEY_ROUTES.VERIFY` |
| `ClientActivationStatusDTO` | Public client | `SUBMIT`, `UPDATE`, `ADDITIONAL`, `STATUS` |
| `PendingActivationDTO` | Activator + Admin | `GET_PENDING`, and the `activation:created` socket payload |
| `ActiveRequestDTO` | **Assigned activator** | `GET_ACTIVE`, `TAKE`, `FLAG_WRONG`, `REQUEST_ADDITIONAL`, `ACTIVATE`, `FREEZE` |
| `ActivatorHistoryItemDTO` | Activator (own) | `GET_MY_HISTORY` |
| `RecentActivationDTO` | Activator + Admin | `GET_RECENT` |
| `AdminActivationDTO` | Admin | `GET_ALL`, `ACTIVATE_BY_ADMIN`, `CANCEL_BY_ADMIN`, `SET_PRICE` |
| `ActivationDetailDTO` | Admin | `GET_BY_ID` |

Sub-shapes: `ClientBlock`, `DistributorBlock`, `AccountFieldValue` (`{fieldLabel, value}`), `SubmittedField` (`{field: enum, value}`), `TimelineEntry`, `CardHistoryEntry`.

### 5.2 Where `ActivationInformation` / `WrongInformation` / `AdditionalInformation` values are exposed

All three tables are merged by `resolveLatestWinsInfo()` ([activation.service.ts:117-133](Apps/api/src/modules/activation/activation.service.ts#L117-L133)) — base info, then every step's wrong/additional values applied newest-last.

| Audience | Path | Password / OTP |
|---|---|---|
| **Public client** | `verify()` → `toKeyVerificationDTO` → `dto.submittedFields` ([mapper:132-138](Apps/api/src/modules/activation/activation.mapper.ts#L132-L138)) | **RAW, unmasked** (deliberate — Stage-04-fix #4A Step-2 prefill; gated by the client's own card key) |
| **Assigned activator** | `buildActiveRequestDTO` → `toActiveRequestDTO.accountFields` + dedicated `otpValue` ([mapper:218-222](Apps/api/src/modules/activation/activation.mapper.ts#L218)) | **RAW, unmasked** (sanctioned §0.1.2 exception) |
| **Admin** | `getById()` → `toActivationDetailDTO.submittedInformation` / `timeline[].wrongFields` / `timeline[].additionalFields` | **MASKED to `"****"`** by `maskValue()` + `SENSITIVE_FIELDS` ([mapper:38-41, 85-88, 332-349](Apps/api/src/modules/activation/activation.mapper.ts#L38-L41)) |
| Admin list / history / recent | `AdminActivationDTO`, `ActivatorHistoryItemDTO`, `RecentActivationDTO` | Not present at all |

**Note the inversion:** today the **admin sees less than the client and less than the activator**. `schema.prisma` labels all three value columns `// SENSITIVE: … activator-only exposure`. D3 removes the mask — see §D3 below.

---

## 6. Activation completion — exhaustive inventory

Grep basis: every `ACTIVATED` / `ACTIVATED_BY_ADMIN` occurrence across `Apps/api/src` (excluding tests, `CardStat.ACTIVATED`, and read-only filters).

| # | Path | Sets `activationStat` | Writes `activationEmail` | Notes |
|---|---|---|---|---|
| **1** | `ActivationService.activate()` — [activation.service.ts:718-754](Apps/api/src/modules/activation/activation.service.ts#L718-L754) | `ACTIVATED` | **Yes** — `activationEmail: cmd.activationEmail`, inside `$transaction` (line 724) | Activator flow. Also: `completedAt=now`, `activationPrice` from `computeCommission`, `Card.cardStat=ACTIVATED`, activator counters + `totalEarning`/`credits`, distributor counters, `ActivationStep` row. Emits `activation:status-changed`. |
| **2** | `ActivationService.activateByAdmin()` — [activation.service.ts:1179-1214](Apps/api/src/modules/activation/activation.service.ts#L1179-L1214) | `ACTIVATED_BY_ADMIN` | **Yes** — `activationEmail: cmd.activationEmail`, inside `$transaction` (line 1185) | Admin resolution of a `FREEZE` only (`:1170` throws otherwise). Same side effects, activator updates guarded by `if (activation.activator)`. Emits `activation:resolved` + `activation:status-changed`. |
| **3** | `scripts/load-mock-data.ts:330-352` | Both | **No** — seeds `activationPrice` only | Not a runtime path, but Sets 9/10 must update it (it will produce `activationCost = 0` / `activationEmail = null` rows). |

**There are exactly two runtime completion paths.** Both take the email from the same contract command:

```ts
// Apps/contract/src/modules/activation/activation.command.ts:39-42
export const ActivateActivationSchema = z.object({ activationEmail: z.email() });
```

**UI capture sites — exactly two, matching D13's prediction:**
- Activator: [ActiveRequestCard.tsx:330](Apps/web/src/components/sections/activator/ActiveRequestCard.tsx#L330)
- Admin: [ResolveFreezeDialog.tsx:93](Apps/web/src/pages/admin/components/ResolveFreezeDialog.tsx#L93)

Read sites for `activationEmail`: `RecentActivationDTO` ([mapper:276](Apps/api/src/modules/activation/activation.mapper.ts#L276)) → admin dashboard `RecentActivationsTable.tsx:46` and activator `HistoryPage.tsx:135`. It is **not** on `AdminActivationDTO` or `ActivationDetailDTO`.

**Gotcha for Set 9:** `activationPrice` is only written `...(price && { activationPrice: price })`. If `computeCommission` finds no matching tier it returns `null` and **nothing is written** — the activation completes with `activationPrice = null`. `activationCost` must not copy that conditional pattern (D10 says default `0`).

---

## 7. Realtime + events

### 7.1 Namespaces and rooms ([rooms.ts](Apps/api/src/common/realtime/rooms.ts))

```ts
NS = { CLIENT: '/client', ACTIVATORS: '/activators', ADMIN: '/admin' }
rooms = {
  activation: (activationId) => `activation:${activationId}`,  // client ns, self-subscribed
  activator:  (activatorId)  => `activator:${activatorId}`,    // Activator.id, NOT User.id
  ADMIN_BELL: 'admin',                                          // joined on connect
}
```

Join logic ([realtime-gateway.ts:22-54](Apps/api/src/common/realtime/realtime-gateway.ts#L22-L54)): `/activators` resolves `User.id → Activator.id` via Prisma on connect; `/admin` auto-joins `ADMIN_BELL`; `/client` joins/leaves per `subscribe`/`unsubscribe` with a `z.uuid()` guard.

### 7.2 Every event on the bus

Type source: [`ActivationEvents`](Apps/contract/src/modules/activation/activation.events.ts) — the **only** event map today (`event-bus.ts:5`: `type AppEvents = ActivationEvents`).

| Event | Payload | Published at | Gateway → |
|---|---|---|---|
| `activation:created` | `PendingActivationDTO` | `submit():362`, `cancel():828`, `release():897` | `/activators` **broadcast** |
| `activation:taken` | `{activationId, activatorId, timestamp}` | `take():579` | `/activators` broadcast (id + ts only) |
| `activation:client-updated` | `{activationId, activatorId, timestamp}` | `update():420`, `additional():482` | `/activators` → `rooms.activator(activatorId)` |
| `activation:frozen` | `{activationId, timestamp}` | `freeze():934` | `/admin` → `rooms.ADMIN_BELL` |
| `activation:resolved` | `{activationId, activatorId, outcome, timestamp}` | `activateByAdmin():1218`, `cancelByAdmin():1280` | `/activators` → `rooms.activator(activatorId)` |
| `activation:status-changed` | `{activationId, status, timestamp}` | `submit():363`, `update():425`, `additional():487`, `flagWrong():624`, `requestAdditional():673`, `activate():756`, `cancel():823`, `release():892`, `freeze():938`, `activateByAdmin():1224`, `cancelByAdmin():1286` | `/client` → `rooms.activation(activationId)` |

### 7.3 Can the bus take a second independent consumer? **Yes.**

[event-bus.ts](Apps/api/src/common/events/event-bus.ts) is a thin typed wrapper over Node's `EventEmitter` with `emit` / `on` / `off`. `EventEmitter` supports N listeners per event natively, and `initRealtimeGateway` registers each handler with `.on(...)` — a `notification.subscribers.ts` calling `.on(...)` for the same events is a straightforward second subscriber with no changes to the bus.

**Three caveats for Set 6:**

1. **No error isolation.** `EventEmitter.emit` invokes listeners **synchronously**; a throwing listener propagates back into the caller. Domain services call `eventBus.emit(...)` *outside* any try/catch (e.g. `activation.service.ts:756`), so a throwing notification subscriber **would fail the activation request** — exactly what D6 exists to prevent. The gateway already defends with its own `safe()` wrapper ([realtime-gateway.ts:11-18](Apps/api/src/common/realtime/realtime-gateway.ts#L11-L18)); the notification subscriber must do the same (and, better, defer with `queueMicrotask`/`setImmediate`).
2. **`AppEvents` must be widened.** `type AppEvents = ActivationEvents` — every new event map (order-request, revocation, notification) has to be intersected in.
3. **Location constraint.** `common/` must never import from `modules/` (back-end-rules §13.1, CLAUDE.md). The gateway lives in `common/realtime/` and honours this. `notification.subscribers.ts` + `NotificationService` + providers must therefore live under `common/` too (e.g. `common/notifications/`), **or** the subscriber must be wired from `server.ts` outside `common/`. See Risk R4.

---

## 8. Order lifecycle — every `OrderStat` change path (D11)

State machine ([order.service.ts:18-21](Apps/api/src/modules/order/order.service.ts#L18-L21)):
```
PENDING_DELIVERY → IN_DELIVERY → { DELIVERED | RETURNED }
```
`DELIVERED` and `RETURNED` are terminal — no path leaves them.

| # | Path | Effect | Transaction? |
|---|---|---|---|
| 1 | `OrderService.create()` — [:139](Apps/api/src/modules/order/order.service.ts#L139) | Sets `orderStat: PENDING_DELIVERY` on insert; lots → `IN_DELIVERY` | Yes |
| 2 | `transition()` → `IN_DELIVERY` — [:177-181](Apps/api/src/modules/order/order.service.ts#L177-L181) | Order only | **No** — bare `order.update` |
| 3 | `transition()` → `DELIVERED` — [:183-198](Apps/api/src/modules/order/order.service.ts#L183-L198) | `completedAt=now`, `cardsDeliveredCount`; lots → `DELIVERED` + `deliveryDate`; cards → `AT_DISTRIBUTOR` + `isActive` + `distributorId`; distributor `nbOfActiveCards` += | Yes |
| 4 | `transition()` → `RETURNED` — [:200-210](Apps/api/src/modules/order/order.service.ts#L200-L210) | `completedAt=now`; lots → `RETURNED` + `isReturned` | Yes |
| 5 | `delete()` — [:222-245](Apps/api/src/modules/order/order.service.ts#L222-L245) | **Hard delete**, allowed only from `PENDING_DELIVERY`; reverts lots | Yes |

All five are reached **only** through `ORDER_ROUTES.CREATE` / `TRANSITION` / `DELETE`, all `adminOnly`. There is no other writer of `Order.orderStat` anywhere in `Apps/api/src` (statistics and distributor only *read* it).

**For D11 this means five insertion points, not four** — path 5 (delete) must also unlink the request and revert it to `APPROVED`, and path 2 currently has no transaction to join, so one must be introduced.

`Order.completedAt` is set on **both** `DELIVERED` and `RETURNED` — see A3.

---

## 9. Audit log

`Log` = `{ actionType: LogActionType, actionDescription: String, userId, createdAt }`. Actor is always `req.user!.id` passed down from the controller.

### 9.1 Every write site

| Service | Line | `LogActionType` | In the same `$transaction`? |
|---|---|---|---|
| `admin.service` | 74, 122 | `CHANGE_USER_INFORMATION` (create, update) | Yes |
| `admin.service` | 154 | `CHANGE_USER_STAT` (toggle) | Yes |
| `admin.service` | 182 | `CHANGE_USER_PASSWORD` (reset) | Yes |
| `activator.service` | 129 | `CHANGE_USER_INFORMATION` (create) | Yes |
| `activator.service` | 221-225 | `CHANGE_USER_PASSWORD` **or** `CHANGE_USER_INFORMATION` (update) | Yes |
| `activator.service` | 253 | `CHANGE_USER_STAT` (toggle) | Yes |
| `activator.service` | 278 | `CHANGE_USER_PASSWORD` (reset) | Yes |
| `distributor.service` | 83 | `ADD_DISTRIBUTOR` | Yes |
| `distributor.service` | 138 | `CHANGE_DISTRIBUTOR_INFORMATION` | Yes |
| `distributor.service` | 169 | `CHANGE_DISTRIBUTOR_STAT` | Yes |
| `payment.service` | 73 | `SET_PAYMENT` | Yes |
| `payment.service` | 103 | `DELETE_PAYMENT` | Yes |
| `subscription-plan.service` | 91 | `CHANGE_ACTIVATION_COMMISSION` | Yes |
| `activation.service` | 1337 | `CHANGE_ACTIVATION_COMMISSION` (`setPrice`) | **No — after the transaction** |
| `card.service` | 103 | `REMOVE_CARD` | **No** |
| `card.service` | 216 | `REVOKE_CARD` | **No** |
| `lot.service` | 142 | `REMOVE_LOT` | **No** |
| `set.service` | 152 | `REMOVE_SET` | **No** |

There is **no shared log helper** — every site inlines `prisma.log.create({ data: {...} })` with a hand-written English description string.

### 9.2 What is NOT logged today

| Action | Logged? | Note |
|---|---|---|
| Activation information changes | **No** | No admin edit endpoint exists at all (Set 3) |
| Order requests (create / approve / reject / status) | **No** | Feature doesn't exist (Set 4) |
| Revocation requests | **No** | Feature doesn't exist (Set 5). Note: `REVOKE_CARD` *is* logged for the direct admin revoke. |
| Activation status changes (take, freeze, activate, cancel, release) | **No** | Only `ActivationStep` rows record them — no `Log` row |
| Role assignment / account link-unlink | **No** | Account *creation* logs as `CHANGE_USER_INFORMATION`; no dedicated action type. Set 1 adds link/unlink. |
| Cost changes (plan cost, activation cost) | **No** | Fields don't exist (Set 9) |
| Activation email management | **No** | Table doesn't exist (Set 10) |
| Order create / transition / delete | **No** | Gap today, and D11 requires it |
| Distributor **delete** | **No** | `delete(id, _actorId)` ignores its actor — an existing gap |
| Set / lot / card **create** | **No** | Only removals are logged |

`LogActionType` today (13 values): `CHANGE_USER_PASSWORD`, `CHANGE_USER_STAT`, `CHANGE_USER_INFORMATION`, `SET_PAYMENT`, `DELETE_PAYMENT`, `ADD_DISTRIBUTOR`, `CHANGE_DISTRIBUTOR_INFORMATION`, `CHANGE_DISTRIBUTOR_STAT`, `CHANGE_ACTIVATION_COMMISSION`, `REMOVE_LOT`, `REMOVE_SET`, `REMOVE_CARD`, `REVOKE_CARD`.

---

## 10. Money

| Field | Type | Meaning | Written by |
|---|---|---|---|
| **`Activation.activationPrice`** | `Decimal? (12,2)` | **The activator's commission for this activation.** | `activate():725`, `activateByAdmin():1186` (from `computeCommission`), `setPrice():1326` (admin override) |
| `Activation.activationCost` | — | **Does not exist yet** (Set 9 / D10) | — |
| `Activator.totalEarning` | `Decimal (12,2)` | Lifetime commission earned | Incremented by the *same* value as `activationPrice` at `:741`, `:1201`, `:1332` |
| `Activator.credits` | `Decimal (12,2)` | Unpaid balance owed to the activator | Incremented with `activationPrice`; decremented by `Payment` |
| `Payment.totalAmount` | `Decimal (12,2)` | A payout to an activator | `payment.service.create` |
| `Payment.previousCredits` | `Decimal (12,2)` | Credits snapshot before the payout | `payment.service.create` |
| `SubscriptionPlanCommission.commission` | `Decimal (12,2)` | Commission rate for (plan × duration tier) — the **source** of `activationPrice` | Admin settings → commission matrix |
| `Order.orderPrice` | `Decimal (12,2)` | What the distributor pays for the cards in the order | `order.service.create` from `CreateOrderCommand` |
| `Order.deliverPrice` | `Decimal (12,2)` | Delivery fee — **excluded from revenue by D9** | `order.service.create` |

### `Activation.activationPrice` **IS** the activator's commission — verified

Three independent confirmations in the code that writes it:

1. **Source.** [`computeCommission()`](Apps/api/src/modules/activation/activation.service.ts#L145-L163) picks a `SubscriptionPlanCommission` row by `(completedAt − takenAt)` in minutes against `CommissionDuration.nbMinuteMin/Max` and returns `tier.commission` → assigned straight to `activationPrice`.
2. **Effect.** In the *same transaction*, the identical value increments `Activator.totalEarning` **and** `Activator.credits` ([:739-743](Apps/api/src/modules/activation/activation.service.ts#L739-L743), [:1201](Apps/api/src/modules/activation/activation.service.ts#L1201)). It is money owed to the activator.
3. **Naming across layers.** `toActivatorHistoryItemDTO` maps it to a field literally called **`earning`** ([mapper:251](Apps/api/src/modules/activation/activation.mapper.ts#L251)); the admin override route is `SET_PRICE` → `SetActivatorPriceCommand` → UI component `SetActivatorPriceModal.tsx`; `setPrice()` applies the **delta** to `totalEarning`/`credits` ([:1320-1334](Apps/api/src/modules/activation/activation.service.ts#L1320-L1334)) and logs it as `CHANGE_ACTIVATION_COMMISSION`.

**Plainly: it is the activator's commission — a cost to the business, not a sale price.** D9's cash-out term is correct.

**But the statistics module calls it revenue.** `statistics.service.ts:56,68` and `:181,197` compute `totalRevenue: _sum.activationPrice`, and `:257` sums it into `revenueOverTime`. Under D9 that is cash **out**. See Risk R6.

**Serialization:** DTO money is a **JS number**, not a Decimal string — `decimalToNumber()` ([mapper:90-93](Apps/api/src/modules/activation/activation.mapper.ts#L90-L93)) does `Number(Number(d).toFixed(2))`, and every money field in the contract is `z.number()`. This is the "one consistent answer" Set 9 asks for, and it is in tension with CLAUDE.md's "Money is Prisma Decimal. Never a JS float." See Risk R7.

---

## 11. Contact info

**Single source:** [`Apps/web/src/config/social-links.ts`](Apps/web/src/config/social-links.ts)

```ts
export const SOCIAL_LINKS = {
  instagram:  "https://instagram.com/setvision.19",
  whatsapp:   "https://wa.me/213556715428",
  callcenter: "tel:+213554813850",
  facebook:   "https://facebook.com/profile.php?id=61550274938326",
} as const;
export const LEGAL_LINKS = { terms: "#", privacy: "#" } as const;
```

Consumed by [PublicHeader.tsx:11,34,44](Apps/web/src/components/layout/PublicHeader.tsx#L11) (desktop nav + mobile `Sheet`) and [PublicFooter.tsx:4,17,26,35,44](Apps/web/src/components/layout/PublicFooter.tsx#L4). Labels come from `translations.json` under `common.social.*`. No env var, no backend involvement.

**Two notes for Set 12 (D8):**
- The file's own header comment states these are **deliberate placeholders** awaiting the real numbers.
- It stores **full URLs** (`tel:…`, `wa.me/…`). The D8 banner needs the **bare number** as a translation variable — so Set 12 will need either a `SUPPORT_PHONE` raw-number constant in the same file, or a parse. Recommend adding the raw number alongside and deriving the URLs from it, so there is still one source.

---

## 12. Duration / date rendering — inventory and recommendation

### 12.1 The formatters that exist ([lib/utils.ts](Apps/web/src/lib/utils.ts))

| Function | Output | Line |
|---|---|---|
| `formatTime(seconds)` | `mm:ss`, zero-padded, `Math.round` then modulo — **breaks past 60 min** | `:18-23` |
| `formatDateTime(iso, language)` | `Intl.DateTimeFormat` `{dateStyle:'medium', timeStyle:'short'}` | `:29-34` |
| `formatRelativeTime(iso, language)` | `Intl.RelativeTimeFormat`, static | `:75-84` |
| `formatDZD(amount, language)` | `Intl.NumberFormat` + `" DZD"` | `:26-28` |
| `LOCALE_TAG` | `{en:'en-US', fr:'fr-FR', ar:'ar-DZ'}` | `:25` |

### 12.2 Every render site

**Elapsed duration (the Set 2 target)**

| File | What | Method |
|---|---|---|
| [LiveTimer.tsx:19-24](Apps/web/src/components/shared/LiveTimer.tsx#L19-L24) | Live ticking timer (pending pool wait + activator elapsed) | **Own inline `mm:ss`** — second implementation |
| [HistoryPage.tsx:200,373](Apps/web/src/pages/activator/HistoryPage.tsx#L200) | Activator history duration (table + mobile card) | `formatTime` |
| [DashboardPage.tsx:93](Apps/web/src/pages/activator/DashboardPage.tsx#L93) | Activator avg activation time | `formatTime` |
| [ActivationsTable.tsx:74](Apps/web/src/pages/admin/activations/components/ActivationsTable.tsx#L74) | Admin activation duration column | `formatTime` |
| [ActivationsPage.tsx:123](Apps/web/src/pages/admin/activations/ActivationsPage.tsx#L123) | Admin avg duration stat | `formatTime` |
| [ActivatorsTable.tsx:81](Apps/web/src/pages/admin/activators/components/ActivatorsTable.tsx#L81) | Admin activator avg time | `formatTime` |
| [StatsRevenueGrid.tsx:29](Apps/web/src/pages/admin/activators/components/StatsRevenueGrid.tsx#L29) | Activator detail avg time | `formatTime` |
| [AvgTimeTrendChart.tsx:73,75](Apps/web/src/pages/admin/statistics/components/AvgTimeTrendChart.tsx#L73) | Chart axis + tooltip | `formatTime` |
| [duration-tone.ts](Apps/web/src/lib/duration-tone.ts) | Green/amber/red thresholds (not text) | `toneClass` / `durationToneClass` |

**Date / time**

`formatDateTime` at: `PaymentsHistoryTable.tsx:56,130` · `AdminAccountsTab.tsx:81` · `CardDetailModal.tsx:104` · `CardsTable.tsx:105` · `CardHistoryTimeline.tsx:25` · `LotsTable.tsx:71,76` · `SetsTable.tsx:73,78` · `ActivationsTable.tsx:88` · `ActivationTimeline.tsx:28` · `RecentActivationsTable.tsx:52,89` · `OrdersTable.tsx:90` · `OrderDetailDrawer.tsx:63` · `OrdersHistoryCompact.tsx:52,57` · `LogsTable.tsx:49,82` (as `title=` tooltip).
`formatRelativeTime` at: `LogsTable.tsx:50,83`.
Direct `Intl.DateTimeFormat` (chart axes, bypassing `utils.ts`): `PerformanceChart.tsx:26` · `ActivationsOverTimeChart.tsx:26` · `AvgTimeTrendChart.tsx:27` · `RevenueOverTimeChart.tsx:27`.
`date-fns` (`format`/`parseISO`, already a dependency): `DashboardPage.tsx:2` · `HistoryPage.tsx:3`.
`new Date().getFullYear()`: `PublicFooter.tsx:60`.
Filter inputs → `new Date(v).toISOString()`: `HistoryPage.tsx:47` · `ActivationsPage.tsx:30` · `OrdersPage.tsx:31` · `LogsPage.tsx:15` · `StatisticsPage.tsx:21`.

**Backend duration producers** (all integer seconds — no formatting server-side today):
`activation.mapper.ts:95-98 durationSeconds()` · `activator.service.ts computeAvgSeconds` · `statistics.service.ts` `avgDurationSeconds` / `avgTimeTrend`.

### 12.3 RECOMMENDATION — where the shared duration formatter lives

> **`Apps/web/src/lib/duration.ts`** — a new, dedicated module in the frontend `lib/` layer.

**Why there:**
- Contract is excluded by D4 and by contract-rules §6.1 (zero logic).
- The backend already returns **integer seconds everywhere** and formats nothing. Formatting is purely a render-edge concern, which front-end-rules §1 places in `src/lib/`.
- `lib/utils.ts` is already a mixed grab-bag (money, dates, blobs, `cn`, `countOf`); front-end-rules §9 on the backend side and the existing `lib/duration-tone.ts` both establish "split by domain, don't build a god-utils". A duration-specific module has a precedent sitting next to it.
- Both consumers (admin pages and activator pages) live in the same Vite app, so one module genuinely covers both — no package plumbing, no new dependency.

**What Set 2 should move into it:**
1. `formatDuration(seconds: number | null): string` — the new `mm:ss` / `hh:mm:ss` / `dd:hh:mm:ss` spec, with explicit `null` and negative handling.
2. `formatTime` — relocated from `lib/utils.ts` (or re-exported from it during the transition) so there is one entry point.
3. **`LiveTimer` must consume it** rather than keeping its own inline `mm:ss` — that duplicate is the reason the spec would otherwise drift on day one.
4. Leave `duration-tone.ts` alone; it formats colour, not text.

**Deferred second implementation (Set 6 only).** Telegram templates are rendered server-side and D6 says bodies may contain a duration. If that survives the Set 6 plan, mirror the function as **`Apps/api/src/common/utils/duration.utils.ts`** — back-end-rules §9 explicitly sanctions pure, domain-split utils under `common/utils/`. Two files, **one spec**: the Set 2 plan's input→output table is the contract both must satisfy. Do **not** create a shared workspace package for this — CLAUDE.md's "don't add a library without asking" and the cost of a new build target outweigh one duplicated ~15-line pure function.

---

## 13. Settings

**Yes — an admin settings page with tabs already exists.**

[`Apps/web/src/pages/admin/settings/SettingsPage.tsx`](Apps/web/src/pages/admin/settings/SettingsPage.tsx), routed at `/admin/settings` ([App.tsx:191-195](Apps/web/src/App.tsx#L191-L195)) behind `<AdminGuard>`, nav entry `admin.shell.nav.settings` ([nav-links.ts](Apps/web/src/config/nav-links.ts)).

Radix `Tabs` with **4** tabs, each a self-contained component owning its own hooks (Radix unmounts inactive `TabsContent`, so queries fire on first activation — no upfront fan-out):

| Tab | Component | Backing module |
|---|---|---|
| Admin accounts | `AdminAccountsTab.tsx` | `admin` |
| Commission matrix | `CommissionMatrixTab.tsx` (+ `CommissionCell.tsx`) | `subscription-plan` |
| Subscription plans | `SubscriptionPlansTab.tsx` | `subscription-plan` |
| Delivery companies | `DeliveryCompaniesTab.tsx` | `delivery-company` |

**`CommissionMatrixTab` is the pattern Set 9's plan-cost tab should mirror** — same shape (plan × value grid with an inline edit cell + a co-located Zod schema, `commission-cell.schema.ts`). Sets 9 and 10 add two tabs → 6. The file's own comment says "Exactly 4 tabs" by an earlier decision; that comment will need updating, not defending.

---

## 14. Test surface (FROZEN — listed only, not opened)

**Config / infra:** `Apps/api/vitest.config.ts` · `Apps/api/docker-compose.test.yml` · `Apps/web/vitest.config.ts`

**`Apps/contract/src/__tests__/`** — 1 file: `conformance.test.ts`

**`Apps/api/test/`** — 63 files
- `contract/` (1): `routes.conformance.spec.ts`
- `integration/` (18): `health`, `auth`, `admin`, `activator`, `activation`, `card`, `delivery-company`, `distributor`, `geography`, `log`, `lot`, `order`, `payment`, `set`, `statistics`, `subscription-plan` + `integration/realtime/gateway.spec.ts`
- `unit/` (44): `env.spec.ts`; `unit/common/` (errors, events/event-bus, http/pagination, http/response, utils/password-generator, utils/password.utils, utils/token.utils); `unit/middleware/` (auth, error, validate-request); `unit/modules/` (activation ×3, activator ×2, admin ×2, auth ×2, card ×2, delivery-company, distributor ×2, geography, log, lot ×2, order ×2, payment ×2, set ×2, statistics ×4, subscription-plan ×2, user); `unit/test-helpers/db.fixture.spec.ts`

**`Apps/web/tests/`** — 54 files
- `integration/hooks/` (16) · `integration/services/` (16)
- `unit/components/layout/` (4): `AdminGuard`, `AdminHeader`, `NotificationBell`, `ProtectedRoute`
- `unit/lib/` (6): `api-path`, `axios`, `query-client`, `realtime`, `token-store`, `utils`
- `unit/pages/` (12 dirs): `activation-detail`, `activations`, `activator/{dashboard,history,login,requests}`, `activator-detail`, `activators`, `cards`, `client-portal` (×4), `dashboard`, `distributor-detail`, `distributors`, `logs`, `orders`, `sets-lots`, `settings`, `statistics`

**Also frozen but out of the working tree:** everything under `template/` (a separate extracted starter with its own mirror suite).

**Total: ~118 frozen files in `Apps/` + 3 configs.** The two conformance suites (`Apps/contract/src/__tests__/conformance.test.ts`, `Apps/api/test/contract/routes.conformance.spec.ts`) will break on the **first** contract change in Set 1 and stay broken until Set 14. `npm run validate` runs the conformance test and is therefore banned for the whole programme.

---

# Confirmed decisions — verdicts

| # | Verdict |
|---|---|
| D1 | ✅ CONFIRMED (with a scheduled footnote) |
| D2 | ✅ CONFIRMED — one blocking code site |
| D3 | ⚠️ **CONFLICTS WITH CODE** — deliberate override, three artefacts to update |
| D4 | ✅ CONFIRMED (delegation; recommendation in §12.3) |
| D5 | ✅ CONFIRMED — five link points, not four |
| D6 | ⚠️ **PARTIALLY CONFLICTS** — bus supports it; the `common/` import rule does not |
| D7 | ✅ CONFIRMED |
| D8 | ✅ CONFIRMED — location correct, values are placeholders |
| D9 | ⚠️ **CONFLICTS WITH CODE** — existing `totalRevenue` fields mean something else |
| D10 | ✅ CONFIRMED |
| D11 | ✅ CONFIRMED — inventory in §8 |
| D12 | ✅ CONFIRMED |
| D13 | ✅ CONFIRMED |

---

### D1 — Order/revocation requests are distributor-only; activator portal out of scope ✅ CONFIRMED

No order-request or revocation-request concept exists anywhere in schema, contract, api, or web. The activator portal is three complete pages (§4). **Footnote, not a conflict:** Set 10's own scope ("one picker component, two call sites") necessarily touches `ActiveRequestCard.tsx`, so the activator portal is in scope for Set 2 *and* Set 10, not Set 2 alone.

### D2 — `Distributor.userId String? @unique`; `UserRole += DISTRIBUTOR` ✅ CONFIRMED

`Distributor` has no `userId` and no `User` relation (§3). `UserRole` is defined identically in [schema.prisma](Apps/api/prisma/schema.prisma) and [user.enums.ts](Apps/contract/src/modules/user/user.enums.ts) as `{ADMIN, ACTIVATOR}`. Adding a third value opens **no backend route by accident** — every route names its roles explicitly (§1, §2.1).

**One blocking site:** [auth.service.ts:83-96](Apps/api/src/modules/auth/auth.service.ts#L83-L96) — `me()` is `if ADMIN … else Activator`. A `DISTRIBUTOR` session throws `AuthError('Activator profile not found')` on **every** `/auth/me` call, which means the session never resolves and the whole frontend session gate hangs on it. Set 1 must convert this to a three-way switch. Related: `SessionUserDTO.fullName` must resolve from `Distributor.fullName`.

Account-less distributors: `userId` nullable means every current read path (`getAll`, `getById`, order creation, card assignment, statistics) is untouched — none of them join `User`.

### D3 — Password/OTP in the admin activation detail DTO ⚠️ CONFLICTS WITH CODE

The conflict is real, documented in three places, and **the decision deliberately overrides all three**:

1. **[activation.mapper.ts:38-41](Apps/api/src/modules/activation/activation.mapper.ts#L38-L41)** — `SENSITIVE_FIELDS = {PASSWORD, OTP}`, applied by `maskValue()` (`:85-88`) at `:334`, `:341`, `:345` — the admin detail path masks all three information tables to `"****"`.
2. **[schema.prisma](Apps/api/prisma/schema.prisma)** — `ActivationInformation.value`, `WrongInformation.value`, `AdditionalInformation.value` each carry `// SENSITIVE: … activator-only exposure`.
3. **contract-rules §3.5 / §6.5** — "Passwords, tokens, and internal flags never appear in any DTO."

**Evidence D3 is the right call anyway:** the same values already flow **unmasked** to the public client (`toKeyVerificationDTO.submittedFields`, `mapper:132-138`) and to the activator (`toActiveRequestDTO.accountFields` + `otpValue`, `mapper:218-222`). The admin is currently the *least*-privileged reader of data the client itself typed. D3 removes an inconsistency rather than creating an exposure.

**Set 2 must therefore:** remove masking on the admin detail path **only** (`toActivationDetailDTO`); leave `maskKey()` alone (that's the card key, a different concern); update the three `schema.prisma` comments so a future reader doesn't "fix" it back; add the explanatory note in the DTO file that the Set 2 prompt already asks for. `User.password`, `RefreshToken.tokenHash`, and JWTs stay fully covered by §5 — no DTO touches them today and none should.

### D4 — Duration formatter location is Claude's call ✅ CONFIRMED

See §12.3. Recommendation: `Apps/web/src/lib/duration.ts`, with a spec-bound mirror at `Apps/api/src/common/utils/duration.utils.ts` **only if** Set 6's templates need it.

### D5 — `CardOrderRequest.orderId String? @unique`; `Order` unmodified ✅ CONFIRMED

`Order` has no field that would need to change, and nothing reads `Order` expecting a request. The add-order form is [CreateOrderModal.tsx](Apps/web/src/pages/admin/distributors/components/CreateOrderModal.tsx) — a 5-step wizard (`StepSelectDistributor` → `StepSelectLots` → `StepReceiverInfo` → `StepDeliveryConfig` → `StepConfirmSummary`) over `create-order.schema.ts`; the selector slots in as a field, most naturally on `StepSelectDistributor` (the request is distributor-scoped).

**Amendment to note:** §8 lists **five** `OrderStat` paths, and D5's "set and cleared from the add-order form" plus D11's propagation must also cover **`OrderService.delete()`** — a hard delete that would otherwise orphan a linked request in `PENDING_DELIVERY` forever.

### D6 — Telegram only; `NotificationService` + DI off the bus ⚠️ PARTIALLY CONFLICTS

**Bus support: CONFIRMED** (§7.3) — `EventEmitter` takes N listeners; the notifier can subscribe alongside the gateway with no bus change.

**Two collisions:**

1. **`common/` may not import from `modules/`** (back-end-rules §13.1, CLAUDE.md non-negotiables). The v2 doc names `notification.subscribers.ts` without a home. If it lives in `common/notifications/`, then `NotificationService` and its providers must too — meaning the "6-file module pattern" does **not** apply to it, which is fine (the realtime gateway is precedent: it lives in `common/realtime/` and imports nothing from `modules/`). If instead a `modules/notification/` is wanted, the subscriber wiring must be invoked from `server.ts`, not from `common/`. **Recommend: `common/notifications/`, mirroring `common/realtime/`.** The Set 6 plan must state which and justify it.
2. **No error isolation on the bus.** `eventBus.emit()` is called synchronously and un-caught inside domain services. A throwing subscriber fails the originating request — the exact failure D6 forbids. The subscriber must wrap every handler like the gateway's `safe()` **and** defer the actual send off the synchronous path.

**Also:** there is **no DI convention in this codebase** to follow. Services take `prisma` via constructor and are instantiated as module-level singletons in each `*.routes.ts` (`const service = new XService(prisma)`). Provider selection should follow that shape — a factory picking a provider from `env` — not a DI container.

### D7 — Telegram deep link + one-time token on `Admin` / `Activator` / `Distributor` ✅ CONFIRMED

All three profile models exist and all three are 1:1 with `User` (once Set 1 lands `Distributor.userId`). Putting the fields on the profile rows rather than `User` is consistent with how `fullName`/`phone` are already stored. No collision with any existing column name.

### D8 — Support phone + WhatsApp from the existing header/footer config ✅ CONFIRMED

Location confirmed: [`config/social-links.ts`](Apps/web/src/config/social-links.ts), consumed only by `PublicHeader` and `PublicFooter`. Two caveats in §11: the values are **documented placeholders**, and the config stores full URLs while the banner copy needs a bare number for interpolation.

### D9 — Cash in = `Order.orderPrice` (completed); cash out = `activationCost` + `activationPrice` ⚠️ CONFLICTS WITH CODE

The **definition** is confirmed against the code (§10): `activationPrice` is unambiguously the activator's commission.

**The conflict is in the existing statistics module**, which uses the word "revenue" for two different things and for the wrong side of the ledger:

| Site | Current meaning | Under D9 |
|---|---|---|
| `statistics.service.ts:56,68` (`dashboard`) | `totalRevenue = SUM(activationPrice)`, today only | **Cash OUT** |
| `statistics.service.ts:181,197` (`activationsSummary`) | `totalRevenue = SUM(activationPrice)`, all time | **Cash OUT** |
| `statistics.service.ts:257,293` (`overview`) | `revenueOverTime[].revenue = SUM(activationPrice)` per bucket | **Cash OUT** |
| `statistics.service.ts:148,156` (`ordersSummary`) | `totalRevenue = SUM(orderPrice)` over **all** orders — no `orderStat` filter, no date anchor | Close to cash in, but **unfiltered** |

Set 11 must not reuse these fields. Either rename them (contract-breaking, four DTO fields) or add explicitly-named new ones (`cashIn`, `cashOut`, `net`) and leave the legacy fields as-is with a note. **Recommend the latter** — renaming would ripple into `StatsRow.tsx`, `RevenueOverTimeChart.tsx`, and the frozen statistics tests for no functional gain.

### D10 — `Activation.activationCost` stamped from `SubscriptionPlanCost` ✅ CONFIRMED

Completion-path inventory is §6: **two runtime paths** + one seed script. `SubscriptionPlanCost` does not collide with the existing `SubscriptionPlanCommission` structurally, though the names are close enough to be worth a comment in the schema. `Activation` currently has no `activationCost` — clean addition. The "completed only" edit rule has precedent: `setPrice()` already enforces it server-side ([:1312-1318](Apps/api/src/modules/activation/activation.service.ts#L1312-L1318)) and its edit UI (`SetActivatorPriceModal`) is the pattern to mirror.

### D11 — `OrderRequestStat` mirrors `OrderStat` ✅ CONFIRMED

Path inventory in §8. Two amendments the Set 4 plan must absorb:
- **Five paths, not four.** `delete()` is the fifth and must clear the link.
- **`transition() → IN_DELIVERY` has no transaction today** ([:177-181](Apps/api/src/modules/order/order.service.ts#L177-L181), a bare `order.update`). "Propagate in the same transaction" requires wrapping it — a small but real change to an existing path.

### D12 — `TELEGRAM_MODE=polling|webhook` ✅ CONFIRMED

[`env.ts`](Apps/api/src/env.ts) is a flat Zod object with `process.exit(1)` on failure — adding five vars is mechanical. [`server.ts`](Apps/api/src/server.ts) already has a `shutdown(signal)` handling `SIGTERM`/`SIGINT` that closes `io` then the HTTP server then Prisma — a poller has a clean lifecycle hook there (start after `httpServer.listen`, stop in `shutdown`). **There is no long-running background process today**, so the poller is the first; it will be the only thing keeping the event loop alive independently of the server. The webhook route must mount **before** `globalErrorHandler` and outside `requireAuth` — `app.ts` mounts everything under `env.API_PREFIX` via `moduleRouter`, so a secret-path/header check is the only guard available.

### D13 — `ActivationEmail` pool table ✅ CONFIRMED

`Activation.activationEmail` is `String?`, plain, no FK — unchanged by this design (§6). It is written in exactly the two completion paths from `cmd.activationEmail`, and `ActivateActivationSchema` requires a **valid, non-optional** email (`z.email()`), which the picker must preserve. The two UI call sites are exactly the two D13 predicts. `SubscriptionPlan` is a stable FK target (`id`, `@@unique([subscriptionType, subscriptionDuration])`). Soft-delete precedent exists on `Payment` (`isDeleted` + `deletedDate`) and `Card`/`Distributor`/`User` (`deletedAt`) — pick one convention and say which.

---

# Open assumptions — recommendations

### A1 — Telegram copy is French → **ACCEPT**

There is **no i18n infrastructure on the backend at all**. `translations.json`, `lib/i18n.ts`, `useTranslation`, and the non-reactive `translate(key, lang)` all live in `Apps/web/src`. Per-user language would need a `language` column on three profile rows *and* a new backend copy store, for one channel with a homogeneous internal audience.
**Recommend:** a plain French constant map (e.g. `common/notifications/notification.templates.ts`) keyed by template name, with an allowlisted interpolation record. Keep it a `Record<TemplateKey, (vars) => string>` so a language dimension can be added later without touching call sites.

### A2 — One-time token, cleared on link, regenerable, no expiry → **ACCEPT**

Sound. Two additions:
- **Unlink must also clear `telegramLinkToken`**, not just `telegramChatId` — otherwise a stale token stays live after an intentional unlink.
- Log generate / regenerate / unlink. The v2 doc gives Set 1 "account link/unlink" `LogActionType` values; Telegram link/unlink should reuse or extend that batch rather than adding a third pattern in Set 6.
- `@unique` on a **nullable** column is correct in Postgres (multiple NULLs allowed), so unlinked rows don't collide.

### A3 — Cash in anchored on `Order.completedAt` (DELIVERED); cash out on `Activation.completedAt` → **ACCEPT WITH A CORRECTION**

Both anchors are correct, but **neither `completedAt` is sufficient on its own**:

- **`Order.completedAt` is set on `RETURNED` too** ([order.service.ts:188 and :207](Apps/api/src/modules/order/order.service.ts#L188)). Filtering on `completedAt != null` alone would count returned orders as revenue. The filter must be `orderStat = DELIVERED AND completedAt != null`.
- **`Activation.completedAt` is set on every terminal outcome** — `CANCELLED_BY_ACTIVATOR` (`:788`), `REMOVED_FROM_ACTIVATOR` (`:857`), `CANCELLED_BY_ADMIN` (`:1258`) — not just successes. Cash out must additionally filter `activationStat IN (ACTIVATED, ACTIVATED_BY_ADMIN)`. The existing `COMPLETED_STATS` constant ([statistics.service.ts:24](Apps/api/src/modules/statistics/statistics.service.ts#L24)) already does exactly this — reuse it.
- **Nullability:** `activationPrice` is `Decimal?` and is left `null` when no commission tier matches (§6 gotcha). Aggregations must `COALESCE`, not assume 0.
- Existing `ordersSummary.totalRevenue` has **no** state filter and **no** anchor at all — do not copy it.

### A4 — Never-used addresses (`lastUsedAt` null) sort first, then oldest→newest → **ACCEPT**

Matches "oldest used first" in spirit and gets new addresses into rotation. **Implementation note:** Postgres defaults `ORDER BY … ASC` to `NULLS LAST`, so the Prisma clause must be explicit:
```ts
orderBy: [{ lastUsedAt: { sort: 'asc', nulls: 'first' } }, { createdAt: 'asc' }]
```
Add `createdAt asc` as a tiebreaker so the picker order is deterministic among never-used rows. Index to support it: `@@index([subscriptionPlanId, isDeleted, lastUsedAt])`.

### A5 — Free-typed address matches active pool rows only → **ACCEPT**

Correct and internally consistent with A6. A soft-deleted row is hidden from settings and from the picker; silently incrementing it would make a "deleted" counter move with no visible cause. **One clarification to write into the Set 10 plan:** a no-match free address writes `Activation.activationEmail` normally and creates **nothing** — it is not auto-added to the pool. (D13 implies this; state it explicitly so it isn't "helpfully" added.)

### A6 — Re-adding a soft-deleted `[plan, email]` pair restores the row with its counter → **ACCEPT**

The `@@unique([subscriptionPlanId, email])` index makes a plain insert throw `P2002`, so *some* resolution is mandatory and restore-in-place is the least surprising. Specify in the plan:
- Restore sets `isDeleted = false`, `deletedAt = null`; leaves `nbOfActivation` and `lastUsedAt` **untouched**.
- The `ADD_ACTIVATION_EMAIL` log description should distinguish create from restore (the historical count reappearing is otherwise unexplained in the audit trail).
- Do it as an `upsert` on the compound unique, not a find-then-branch, so two concurrent adds can't race.

---

# Risk register

| # | Risk | Collides with | Severity | Mitigation |
|---|---|---|---|---|
| **R1** | **`ProtectedRoute` has no role check.** `/dashboard`, `/requests`, `/history` are gated on *authentication only* ([App.tsx:118-142](Apps/web/src/App.tsx#L118-L142)). A `DISTRIBUTOR` login lands in the activator portal; the admin already can. `CatchAllRoute` (`:48-71`) renders `ActivatorLayout` for any session, and `connectRoleSocket` (`realtime.ts:177`) routes any non-admin to `/activators` (→ `FORBIDDEN`, silent disconnect). | Set 1 | **High** | Set 1 must convert `ProtectedRoute` to a role-aware guard (or add an `ActivatorGuard` mirroring `AdminGuard`), make `CatchAllRoute` layout selection role-driven, and make `connectRoleSocket` a three-way switch. The backend is already safe — this is the frontend half of the D2 audit. |
| **R2** | **`auth.service.me()` `else` = activator.** A `DISTRIBUTOR` session throws on every `/auth/me`, so the session never resolves and *every* guard hangs or bounces. | D2 / Set 1 | **High** | Explicit three-way switch on `user.role`; each branch loads its own profile and throws its own error. Verified before any distributor account is created. |
| **R3** | **D3 contradicts contract-rules §3.5/§6.5 and three `schema.prisma` comments** that say these values are activator-only. A later reader (or a later Claude session) will "fix" the unmasking back. | D3 / Set 2 | Medium | Remove masking on `toActivationDetailDTO` **only**; update the three schema comments; add the explanatory note in the DTO file that the Set 2 prompt already mandates. Record here that this was an explicit, informed override. |
| **R4** | **`notification.subscribers.ts` has no legal home under the current import rule.** `common/` must never import `modules/`; the v2 architecture puts a subscriber (in `common/`?) in front of a `NotificationService`. | D6 / Set 6 · back-end-rules §13.1 | Medium | Put the whole subsystem in `common/notifications/`, mirroring `common/realtime/`, so the 6-file module pattern doesn't apply and no rule is broken. Decide and justify in the Set 6 plan, not during execution. |
| **R5** | **Bus has no error isolation.** `eventBus.emit()` is synchronous and un-caught in domain services. A throwing notification subscriber fails the originating activation — precisely what D6 exists to prevent. | D6 / Set 6 | Medium | Wrap every subscriber handler (the gateway's `safe()` is the pattern) **and** defer the send off the synchronous path. Verify by throwing deliberately in a handler during manual test 2. |
| **R6** | **`totalRevenue` already means `SUM(activationPrice)`** in three statistics endpoints — i.e. cash **out** under D9 — and `ordersSummary.totalRevenue` sums **all** orders with no state filter or date anchor. | D9 / Set 11 | Medium | Add explicitly-named `cashIn`/`cashOut`/`net` fields rather than redefining four existing ones. Do not silently change what an existing DTO field means. |
| **R7** | **DTO money is a JS number, not a Decimal.** `decimalToNumber()` returns `Number(Number(d).toFixed(2))` and every contract money field is `z.number()` — in tension with CLAUDE.md's "Money is Prisma Decimal. Never a JS float." | Set 9 ("one consistent answer") · Set 11 | Medium | Set 9 must state the rule explicitly. Recommend **keeping** `z.number()` at the wire (changing it would touch every money DTO, mapper, and frozen test) while requiring all *arithmetic and aggregation* to stay in Prisma `Decimal` / the database. |
| **R8** | **Log writes are outside the transaction in 5 of 18 sites** (`activation.setPrice`, `card.delete`, `card.revoke`, `lot.delete`, `set.delete`). Sets 3/4/5/9/10 all require "data write + log write in one transaction". | Sets 3–10 | Low-Med | New code follows the *majority* pattern (in-transaction). Do **not** refactor the five legacy sites mid-set — record them for the Set 13 audit-log matrix. |
| **R9** | **There is no shared log helper.** 18 inlined `prisma.log.create` calls with hand-written English descriptions. v2 adds ~10 more action types across six sets. | Sets 1,3,4,5,6,9,10 | Low-Med | Introduce a `writeLog(tx, {actionType, description, userId})` helper in Set 1 and use it for everything new; leave existing call sites alone. Prevents drift in description format. |
| **R10** | **`activationPrice` is left `null` when no commission tier matches** (`...(price && {...})`, [:725](Apps/api/src/modules/activation/activation.service.ts#L725), [:1186](Apps/api/src/modules/activation/activation.service.ts#L1186)). Revenue aggregation over it must `COALESCE`. | D9/D10 / Sets 9,11 | Low-Med | `activationCost` must **not** copy that conditional-spread pattern — D10 says default `0`. Aggregations coalesce nulls. |
| **R11** | **Frozen conformance suites break on the first contract change** (Set 1) and stay broken for the whole programme. `npm run validate` is unusable from Set 1 onward. | CLAUDE.md test freeze | Low (expected) | Run `tsc --noEmit`, `eslint`, and `madge --circular src` separately, per CLAUDE.md. Don't let drift run past ~5 sets before Set 14. |
| **R12** | **`exactOptionalPropertyTypes: true`** in `Apps/contract` and `Apps/api` tsconfigs. Every optional DTO field must be built with the `...(x && { y })` spread idiom, not `y: undefined`. New optional fields (`orderId?`, `telegramChatId?`, `activationCost?`) will trip this. | Every schema-touching set | Low | Follow the existing spread idiom, which is already used everywhere for this reason. |
| **R13** | **`madge --circular` on the contract.** New cross-module contract imports (e.g. `card-order-request` importing `OrderStat` from `modules/order`) risk a runtime-throwing Zod cycle that `tsc` will not catch. | contract-rules §6.8 / Sets 4,5 | Low | Keep new enums in the new module's own `*.enums.ts` rather than importing across modules. Run `madge` after every contract change. |
| **R14** | **`social-links.ts` values are placeholders** (`wa.me/213556715428`, `tel:+213554813850`), documented as fake. The D8 banner would ship a wrong support number. | D8 / Set 12 | Low | Get the real numbers before Set 12. Store the **bare** number and derive `tel:`/`wa.me` from it, so header, footer, and banner stay one source. |
| **R15** | **Seed scripts write completed activations directly.** `scripts/load-mock-data.ts:330-352` inserts `ACTIVATED`/`ACTIVATED_BY_ADMIN` rows with `activationPrice` but no `activationEmail` — bypassing both completion paths. | Sets 9, 10 | Low | Update the seed alongside Sets 9/10 (it will otherwise produce `activationCost = 0` rows silently). CLAUDE.md already asks for seed-script gaps to be reported. |
| **R16** | **Only one migration exists** (`20260705191922_init`) — history has been squashed at least once. Seven v2 sets add migrations. | Sequencing | Low | Fine given "the DB holds throwaway test data", but each set must name its migration in the report so the sequence is reconstructable. |
| **R17** | **`LiveTimer` is a second `mm:ss` implementation.** If Set 2 only fixes `lib/utils.ts`, the pending pool and active-request timers keep the old format and the "one spec" goal fails on day one. | D4 / Set 2 | Low | Explicitly listed in §12.3 as item 3 of the Set 2 change list. |
| **R18** | **`GET_PENDING` and `GET_RECENT` are globally scoped** and already widened to `[ACTIVATOR, ADMIN]` ([activation.routes.ts:34](Apps/api/src/modules/activation/activation.routes.ts#L34)) — their service methods take no viewer id. Adding `DISTRIBUTOR` to that array would leak every activation to every distributor. | Set 1 route×roles table | Low (if the table is honoured) | These two rows must be explicitly marked "ADMIN + ACTIVATOR, **never** DISTRIBUTOR" in the Set 1 table. Set 7's distributor activation list needs its own scoped endpoint. |

---

## Ready-for-Set-1 summary

- **Backend guards are safe by construction** — 15 routes files, every route with an explicit roles array. Adding `DISTRIBUTOR` to the enum opens nothing.
- **The frontend is where Set 1's real work is**: `ProtectedRoute` (R1), `CatchAllRoute`, `connectRoleSocket`, plus `auth.service.me()` on the backend (R2).
- **Mirror source for distributor accounts:** [activator.service.ts:99-141](Apps/api/src/modules/activator/activator.service.ts#L99-L141) + `Apps/web/src/pages/admin/activators/components/{CreateActivatorModal,GeneratedPasswordPanel}.tsx`.
- **Two completion paths, five order-status paths, six bus events, three socket namespaces** — the three inventories the later sets depend on are in §6, §8, and §7.

**Open questions for you (none blocking Set 1):**
1. R6 — for Set 11, add `cashIn`/`cashOut`/`net` alongside the legacy `totalRevenue` fields (recommended), or rename them?
2. R7 — confirm money stays `z.number()` on the wire with Decimal-only arithmetic server-side?
3. R14 — are the real support phone / WhatsApp numbers available before Set 12?
4. R9 — introduce the shared `writeLog` helper in Set 1, or leave logging inline as today?
