# Set 6 — Telegram notifications

**Depends on:** 3, 4, 5 · **Touches:** prisma, contract, api, web
**Status:** PLAN ONLY — no code written in this session.
**Date:** 2026-08-10 · **Branch:** `version-02-01`

**Inputs read:** `.claude/CLAUDE.md`, `Docs/Stage-04-fix/plan/v2-decisions.md`, `set-3-plan.md`,
`set-4-plan.md`, `set-5-plan.md`, `Docs/Stage-01-Contract/contract-rules.md`,
`Docs/Stage-02-Backend/back-end-rules.md`, `Docs/Stage-03-Frontend/front-end-rules.md`,
`Docs/Stage-04-fix/new-features-fixes/version-2-description.md`.

**Decisions taken by the user in this planning session** (they override my recommendations where
they differ, and they are already folded into every section below):

| # | Decision |
|---|---|
| **U1** | The five missing Set 4 emits are added **inside Set 6** (§0.2, §5.1). |
| **U2** | `activation:client-updated` gains a **`kind: 'CORRECTION' \| 'ADDITIONAL'`** discriminator in the contract (§0.3, §5.3). |
| **U3** | Matrix row 2 means **every `activation:status-changed` transition**, not just admin resolution (§5.4). Consequence: `activation:resolved` is **not** subscribed (§5.4.1) and `PROCESSING` is a documented no-message row (§5.4.2) — veto per row if you disagree. |
| **U4** | **Two bots, two tokens** — a dev bot for local polling, a prod bot for the deployed webhook (§7.5, §10). |

---

## 0. Audit

Everything in this section is observed in the tree at `434e224`, not carried over from Set 0.

### 0.1 Every event on the bus today

Type source: [`event-bus.ts:9`](Apps/api/src/common/events/event-bus.ts#L9) —
`type AppEvents = ActivationEvents & CardOrderRequestEvents & CardRevocationRequestEvents`.

| Event | Payload type | Emitted at (file:line) | Gateway routing |
|---|---|---|---|
| `activation:created` | `PendingActivationDTO` = `{id, subscriptionLabel, keyMasked, requestedAt}` | `activation.service.ts` [:365](Apps/api/src/modules/activation/activation.service.ts#L365) (`submit`) | `/activators` broadcast |
| `activation:taken` | `{activationId, activatorId, timestamp}` | [:612](Apps/api/src/modules/activation/activation.service.ts#L612) (`take`) | `/activators` broadcast, `activatorId` stripped |
| `activation:client-updated` | `{activationId, activatorId, timestamp}` | [:450](Apps/api/src/modules/activation/activation.service.ts#L450) (`update`, **correction only** — guarded by `if (isCorrection)`), [:515](Apps/api/src/modules/activation/activation.service.ts#L515) (`additional`) | `/activators` → `rooms.activator(activatorId)` |
| `activation:frozen` | `{activationId, timestamp}` | [:977](Apps/api/src/modules/activation/activation.service.ts#L977) (`freeze`) | `/admin` → `rooms.ADMIN_BELL` |
| `activation:resolved` | `{activationId, activatorId, outcome, timestamp}` | [:1268](Apps/api/src/modules/activation/activation.service.ts#L1268) (`activateByAdmin`), [:1330](Apps/api/src/modules/activation/activation.service.ts#L1330) (`cancelByAdmin`) | `/activators` → `rooms.activator(activatorId)` |
| `activation:status-changed` | `{activationId, status: ClientActivationStatus, timestamp}` | **11 sites:** [:366](Apps/api/src/modules/activation/activation.service.ts#L366) submit · [:455](Apps/api/src/modules/activation/activation.service.ts#L455) update · [:520](Apps/api/src/modules/activation/activation.service.ts#L520) additional · [:667](Apps/api/src/modules/activation/activation.service.ts#L667) flagWrong · [:716](Apps/api/src/modules/activation/activation.service.ts#L716) requestAdditional · [:799](Apps/api/src/modules/activation/activation.service.ts#L799) activate · [:866](Apps/api/src/modules/activation/activation.service.ts#L866) cancel · [:935](Apps/api/src/modules/activation/activation.service.ts#L935) release · [:981](Apps/api/src/modules/activation/activation.service.ts#L981) freeze · [:1274](Apps/api/src/modules/activation/activation.service.ts#L1274) activateByAdmin · [:1336](Apps/api/src/modules/activation/activation.service.ts#L1336) cancelByAdmin | `/client` → `rooms.activation(activationId)` |
| `order-request:created` | `{requestId, distributorId, distributorName, subscriptionLabel, nbOfCards, timestamp}` | **NOWHERE** ⚠️ §0.2 | `/admin` → `ADMIN_BELL` (registered, never fires) |
| `order-request:status-changed` | `{requestId, distributorId, stat, previousStat, orderId, timestamp}` | `order.service.ts` [:216](Apps/api/src/modules/order/order.service.ts#L216) (create+link), [:298](Apps/api/src/modules/order/order.service.ts#L298) (transition ×3 targets), [:353](Apps/api/src/modules/order/order.service.ts#L353) (delete/unlink) — **propagation paths only** | `/admin` + `/distributors` → `rooms.distributor(p.distributorId)` |
| `revocation-request:created` | `{requestId, distributorId, distributorName, cardId, cardKey, subscriptionLabel, reason, timestamp}` | `card-revocation-request.service.ts` [:180](Apps/api/src/modules/card-revocation-request/card-revocation-request.service.ts#L180) | `/admin` → `ADMIN_BELL` |
| `revocation-request:status-changed` | `{requestId, distributorId, cardId, cardKey, stat, previousStat, adminNote, timestamp}` | [:230](Apps/api/src/modules/card-revocation-request/card-revocation-request.service.ts#L230), [:265](Apps/api/src/modules/card-revocation-request/card-revocation-request.service.ts#L265), [:294](Apps/api/src/modules/card-revocation-request/card-revocation-request.service.ts#L294) via the private `emitStatusChanged` helper [:298](Apps/api/src/modules/card-revocation-request/card-revocation-request.service.ts#L298) | `/admin` + `/distributors` |

**Every emit is after its `$transaction` commits.** Verified at all sites above; the row is durable
when a subscriber runs.

### 0.2 ⚠️ `CardOrderRequestService` emits nothing — five missing emits

`grep -rn "eventBus" Apps/api/src/modules/card-order-request/` returns **one comment and zero
calls**. The service's own five state-changing methods emit nothing:

| Method | Line | Event that should fire (Set 4 plan §5.2, §9) |
|---|---|---|
| `create` | [:185](Apps/api/src/modules/card-order-request/card-order-request.service.ts#L185) | `order-request:created` |
| `approve` | [:206](Apps/api/src/modules/card-order-request/card-order-request.service.ts#L206) | `order-request:status-changed` (`PENDING → APPROVED`) |
| `reject` | [:235](Apps/api/src/modules/card-order-request/card-order-request.service.ts#L235) | `order-request:status-changed` (`PENDING → REJECTED`) |
| `cancel` | [:264](Apps/api/src/modules/card-order-request/card-order-request.service.ts#L264) | `order-request:status-changed` (`… → CANCELLED`) |
| `unlink` | [:288](Apps/api/src/modules/card-order-request/card-order-request.service.ts#L288) | `order-request:status-changed` (`PENDING_DELIVERY → APPROVED`) |

`order-request:created` is therefore **emitted nowhere in the codebase**, even though
`realtime-gateway.ts` [:109](Apps/api/src/common/realtime/realtime-gateway.ts#L109) and
`socket.types.ts` [:22](Apps/api/src/common/realtime/socket.types.ts#L22) both register it.
`CardRevocationRequestService` is **complete** by contrast — it has all four emits.

Consequence: notification matrix row *"Order request submitted → ✓ Admin"* has no event to
subscribe to, and Set 4's own manual tests 1/2 pass only because the admin table is *also*
invalidated by an unrelated refetch. **Per U1, Set 6 adds all five** (§5.1). This also fixes a
live Set 4 defect: a distributor cancelling a request never reaches the admin queue in realtime.

### 0.3 ⚠️ `activation:client-updated` cannot distinguish correction from OTP

Both emit sites produce a byte-identical `{activationId, activatorId, timestamp}`:

- [`update():450`](Apps/api/src/modules/activation/activation.service.ts#L450) — client corrected
  flagged fields. `WRONG_INFORMATION → PROCESSING`.
- [`additional():515`](Apps/api/src/modules/activation/activation.service.ts#L515) — client
  answered an OTP request. `ADDITIONAL_INFORMATION → PROCESSING`.

**Both land on `PROCESSING`**, so a post-hoc DB read cannot tell them apart either. Per U2 the
contract payload gains a `kind` discriminator (§5.3).

### 0.4 The bus takes a second independent consumer — confirmed, with one correction

[`event-bus.ts`](Apps/api/src/common/events/event-bus.ts) is a thin typed wrapper over Node's
`EventEmitter` exposing `emit`/`on`/`off`. `EventEmitter` supports N listeners per event
natively, and [`initRealtimeGateway`](Apps/api/src/common/realtime/realtime-gateway.ts#L18)
registers with `.on(...)`. A `notification.subscribers.ts` calling `.on(...)` for the same events
is a straightforward **second, independent** consumer. **No change to the bus is required.**

Three caveats, all confirmed against the code:

1. **No error isolation.** `EventEmitter.emit` invokes listeners synchronously. Domain services
   call `eventBus.emit(...)` un-caught (e.g. [`activate():799`](Apps/api/src/modules/activation/activation.service.ts#L799)),
   so a throwing subscriber propagates into the originating request. R5. §9.3 is the fix.
2. **The gateway's `safe()` is sync-only.**
   [`realtime-gateway.ts:10-16`](Apps/api/src/common/realtime/realtime-gateway.ts#L10-L16) is
   `try { fn() } catch`. It **would not catch a rejected promise** from an `async` handler.
   The notification subscriber needs its own async-aware wrapper — it cannot import or reuse
   `safe`. This is the single most important correctness detail in the set.
3. **Registration order is irrelevant to correctness** but the gateway is registered at
   [`server.ts:19`](Apps/api/src/server.ts#L19) *before* `listen`. The notification subscriber
   registers at the same place, and is skipped entirely when `NOTIFICATIONS_ENABLED=false`.

### 0.5 Dependency injection in this codebase

**There is no DI container and no DI framework.** The convention is uniform:

- Services take `PrismaClient` as their only constructor argument.
- Each `*.routes.ts` is the composition root: `const service = new XService(prisma); const
  controller = new XController(service);` at module scope — see
  [`card-order-request.routes.ts:17-18`](Apps/api/src/modules/card-order-request/card-order-request.routes.ts#L17-L18).
- Cross-module reuse is a **module-level exported function taking the caller's `tx`**, not an
  injected collaborator: `propagateOrderStatToRequest` ([:42](Apps/api/src/modules/card-order-request/card-order-request.service.ts#L42)),
  `revokeCardWithin`, `composeSubscriptionLabel`.
- `common/realtime/` is initialised by a plain exported init function taking its dependencies:
  `initRealtimeGateway(io, prisma)`.

**Provider DI therefore = a frozen `Record<NotificationChannel, NotificationProvider>` built once
at module scope and passed to the `NotificationService` constructor.** No container, no
decorators, no `reflect-metadata`. §2.

### 0.6 `env.ts` and `.env.example`

[`env.ts`](Apps/api/src/env.ts) is a flat `z.object` of 10 keys, `safeParse`, `console.error` +
`process.exit(1)` on failure, exporting `env = parsed.data`. Zod **4** (`^4.0.0` in both
`Apps/api` and `Apps/contract`), so `z.stringbool()` is available.
[`.env.example`](Apps/api/.env.example) mirrors it in commented groups (`# Application`,
`# Database`, `# CORS`, `# Auth`, `# Logging`, `# Realtime (WebSocket)`, plus a commented
`# REDIS_URL` scaling note). `TEST_DATABASE_URL` appears in `.env.example` but **not** in the
schema — a pre-existing asymmetry; Set 6 does not touch it.

Node is **v18.18.0**: global `fetch` and `AbortSignal.timeout()` are both available (fetch emits
an `ExperimentalWarning` on 18 — cosmetic, already the case for nothing else in this app).

### 0.7 Long-running background processes in `server.ts` — none today

[`server.ts`](Apps/api/src/server.ts) is 37 lines: create http server → create Socket.IO →
3 namespace auth middlewares → `initRealtimeGateway` → `main()` = `prisma.$connect()` +
`httpServer.listen` → `shutdown(signal)` on `SIGTERM`/`SIGINT` closing `io`, then the http
server, then `prisma.$disconnect()` → `process.exit(0)`.

**The poller will be the first long-running process.** Two consequences:

- It must start **inside** the `listen` callback (after the port is bound), not at import time.
- `shutdown()` currently exits via `httpServer.close`'s callback. A poller sitting in a 30-second
  long-poll `fetch` would keep the event loop alive past that; it must be aborted, not merely
  flagged. §7.1.

### 0.8 Route mounting, for the webhook

[`app.ts`](Apps/api/src/app.ts): `pino-http` → `helmet` → `cors` → `express.json()` →
`GET /health` → `app.use(env.API_PREFIX, moduleRouter)` → `globalErrorHandler` **last**.
[`modules/index.ts`](Apps/api/src/modules/index.ts) mounts 18 routers, each under its contract
`BASE` constant. Every route in the API is behind `requireAuth` except
`AUTH_ROUTES.LOGIN`/`REFRESH` and the whole public `KEY_ROUTES` group.

So a webhook route is one more `moduleRouter.use(TELEGRAM_ROUTES.BASE, telegramRouter)` line. It
lands at `${API_PREFIX}/telegram/webhook`, inside `express.json()` (so `req.body` is parsed) and
before `globalErrorHandler` (so thrown `AppError`s are enveloped correctly). §4.

`express-rate-limit` is **already a dependency**
([`rate-limit.middleware.ts`](Apps/api/src/common/middlewares/rate-limit.middleware.ts)), so
rate-limiting the webhook costs no new package.

### 0.9 Other facts this set depends on

| Fact | Evidence |
|---|---|
| `Admin`/`Activator` have **no** `createdAt`/`updatedAt`/`deletedAt`; `Distributor` has all three | `schema.prisma` |
| `Activator` has **no** `isEnabled` — enablement lives on `User.isEnabled` | `schema.prisma` |
| `Admin` has **both** `Admin.isEnabled` and `User.isEnabled` | `schema.prisma` |
| `Distributor.userId` is **nullable** — inventory-only distributors have no `User` row at all | Set 1 |
| `LogActionType` has 17 values incl. `LINK_USER_ACCOUNT`/`UNLINK_USER_ACCOUNT` (Set 1) | `schema.prisma:115`, `log.enums.ts` |
| `generateOpaqueToken()` = `crypto.randomBytes(32).toString('hex')` (64 hex chars) exists | [`token.utils.ts`](Apps/api/src/common/utils/token.utils.ts) |
| Set 2's duration formatter exists **only** in the web app | [`Apps/web/src/lib/duration.ts`](Apps/web/src/lib/duration.ts) |
| `Apps/api/src/common/utils/` holds 3 pure util files, no duration util | `ls` |
| Pino `redact: ['req.headers.authorization', 'req.body.password']` | [`logger.ts`](Apps/api/src/common/config/logger.ts) |
| Admin settings page = Radix `Tabs`, exactly 4 tabs | [`SettingsPage.tsx`](Apps/web/src/pages/admin/settings/SettingsPage.tsx) |
| `FIELD_LABEL` for `AccountInformation` exists but is **English** and lives in a module mapper | [`activation.mapper.ts:29-36`](Apps/api/src/modules/activation/activation.mapper.ts#L29-L36) |
| **No eslint config in `Apps/api`** | `ls eslint.config.* .eslintrc*` → none. Pre-existing gap, first flagged in Set 1's report. |

---

## 1. Prisma diff

### 1.1 Telegram fields on the three profile models

```prisma
model Admin {
  id        String  @id @default(uuid())
  userId    String  @unique
  fullName  String
  phone     String
  isEnabled Boolean @default(true)

  // Telegram delivery (Set 6 / D7). All three nullable; @unique on a nullable column is
  // correct in Postgres — unlimited NULLs never collide, so unlinked rows don't conflict.
  telegramChatId    String?   // Telegram chat id, stored as text: ids exceed 2^31 and are opaque
  telegramLinkToken String?   @unique // one-time deep-link payload; cleared the moment it is used
  telegramLinkedAt  DateTime?

  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  payments Payment[]
}
```

The same three lines are added, verbatim, to `model Activator` and `model Distributor`.

**No index is added on `telegramChatId`.** Justification: the three profile tables are tens of
rows; `where { telegramChatId: { not: null } }` seq-scans faster than an index read at that size,
and `telegramLinkToken @unique` already provides the only lookup that must be fast (the intake
handler's token match, on the hot path of every `/start`). Add one later if the activator roster
ever reaches thousands.

**Why the fields go on the profile rows, not on `User` — four independent reasons:**

1. **A `Distributor` may have no `User` at all.** `Distributor.userId` is `String?` (Set 1, D2) —
   inventory-only distributors are a supported, existing state. On `User`, an account-less
   distributor could **never** be reachable by Telegram. On `Distributor`, they can: an admin
   generates the token, the distributor taps it, and they receive "your order was created"
   messages without ever having a login. That is a capability the `User` design cannot express,
   and it matters — most distributors in this system are inventory-only.
2. **The bus payloads already carry profile ids, not user ids.** `activation:client-updated`
   carries `Activator.id`, `order-request:*` and `revocation-request:*` carry `Distributor.id`
   (Set 4/5 chose those deliberately, mirroring `rooms.activator`/`rooms.distributor`). Routing a
   message becomes a **single `findUnique` by primary key** with the chat id already in the row —
   no `User` join anywhere in the subscriber. On `User` every send would need a profile→user hop.
3. **Consistency with how contact data is already stored.** `fullName` and `phone` live on
   `Admin`/`Activator`/`Distributor`, not on `User`. `User` holds identity and access only
   (`username`, `password`, `role`, `isEnabled`, `lastLoginAt`). A chat id is a contact channel,
   so it belongs where `phone` already is.
4. **Per-role semantics stay separable.** A single physical person could in principle hold two
   profiles; per-profile chat ids keep "notify the activator" and "notify the distributor"
   independently linkable and independently unlinkable.

### 1.2 New enums

```prisma
// The delivery channel. Only TELEGRAM has a real provider; the other two exist so the
// provider interface has more than one implementation and the stubs are type-checked.
enum NotificationChannel {
  TELEGRAM
  EMAIL
  WHATSAPP
}

enum NotificationStat {
  PENDING
  SENT
  FAILED
}

// One value per template. This is what makes "no magic strings" hold for templates: the
// Record<NotificationType, …> template map is exhaustive, so tsc fails on an unmapped value.
enum NotificationType {
  TELEGRAM_LINKED
  ACTIVATION_CREATED
  ACTIVATION_INFORMATION_UPDATED
  ACTIVATION_OTP_RECEIVED
  ACTIVATION_STATUS_CHANGED
  ACTIVATION_FROZEN
  ORDER_REQUEST_CREATED
  REVOCATION_REQUEST_CREATED
  ORDER_CREATED
  REVOCATION_APPROVED
}
```

### 1.3 The `Notification` model

```prisma
// Outbox + audit trail for every notification the system attempted. One row per
// (recipient × event) — a fan-out to 5 activators writes 5 rows.
//
// Deliberately NOT related to User: the recipient is a PROFILE (an account-less
// Distributor is a legal recipient, §1.1). recipientRole + recipientProfileId is a
// polymorphic pointer; Prisma cannot express "exactly one of three FKs is set", and three
// nullable FKs would need a CHECK constraint this schema has no precedent for. The row is
// an immutable record for the admin log page, not a graph to traverse.
model Notification {
  id       String              @id @default(uuid())
  channel  NotificationChannel
  type     NotificationType
  stat     NotificationStat    @default(PENDING)

  recipientRole      UserRole
  recipientProfileId String   // Admin.id | Activator.id | Distributor.id — never User.id
  recipientName      String   // snapshot of fullName/storeName at send time, for the log table
  recipientAddress   String   // snapshot of the chat id used. Resend re-resolves; see §9.4

  // The rendered message, exactly as sent. MAY contain the client's Snapchat password and OTP
  // (D3 / Set 6 scope note). MUST NEVER contain User.password, a refresh-token hash, a JWT,
  // or a telegramLinkToken — see the §6.4 allowlist.
  body     String
  error    String?             // provider failure, truncated to 500 chars by the service
  attempts Int                 @default(0)
  sentAt   DateTime?
  createdAt DateTime           @default(now())

  @@index([stat])                                // FAILED filter + the resend queue view
  @@index([createdAt])                           // orderBy createdAt desc + dateFrom/dateTo
  @@index([recipientRole, recipientProfileId])    // "everything sent to this activator"
  @@index([type])                                 // the type filter chip on the log page
}
```

`error` and `body` are `String` (Postgres `text`), not `@db.VarChar` — matching every other
free-text column in this schema (`Log.actionDescription`, `CardOrderRequest.note`).

### 1.4 `LogActionType` additions

```prisma
enum LogActionType {
  … existing 17 values …
  GENERATE_TELEGRAM_TOKEN
  UNLINK_TELEGRAM
}
```

Mirrored byte-identically in [`log.enums.ts`](Apps/contract/src/modules/log/log.enums.ts).

**Only two values, not three.** There is deliberately no `LINK_TELEGRAM`: the link is performed
by the *bot*, on behalf of a person who may have **no `User` row at all** (an account-less
distributor), and `Log.userId` is `NOT NULL`. There is no honest actor to attribute it to —
inventing one (the admin who generated the token) would be a lie, and skipping the row only for
account-less distributors would make the audit trail inconsistent. `telegramLinkedAt` on the
profile row is the record of the link, and the two admin-driven actions that *do* have a real
actor are both logged. **Q4.**

`LINK_USER_ACCOUNT`/`UNLINK_USER_ACCOUNT` are **not** reused: they mean *login* link/unlink
(written by `distributor.service.ts` [:268](Apps/api/src/modules/distributor/distributor.service.ts#L268),
[:308](Apps/api/src/modules/distributor/distributor.service.ts#L308)) and conflating the two
would make `/admin/logs` unreadable.

### 1.5 Migration

**Name:** `add_telegram_notifications` → `npx prisma migrate dev --name add_telegram_notifications`

Contents:
- `CREATE TYPE "NotificationChannel"`, `"NotificationStat"`, `"NotificationType"`
- `ALTER TYPE "LogActionType" ADD VALUE 'GENERATE_TELEGRAM_TOKEN'` + `'UNLINK_TELEGRAM'`
- `ALTER TABLE "Admin" | "Activator" | "Distributor" ADD COLUMN` ×3 each (9 columns), all nullable
- `CREATE UNIQUE INDEX` on `"telegramLinkToken"` ×3
- `CREATE TABLE "Notification"` + 4 indexes

⚠️ **Postgres caveat, same as Sets 4/5:** `ALTER TYPE … ADD VALUE` cannot run in the same
transaction as a statement *using* the new value. Prisma wraps each migration in one
transaction, and nothing here inserts a `Log` row, so this is safe. Do **not** hand-add a
backfill using `GENERATE_TELEGRAM_TOKEN` to the migration file.

**Seed impact: none.** Every new column is nullable with no default requirement, and no existing
model gains a required field. `load_wilaya`, `load_commission_durations`, `create_admin_account`
and `load_mock_data` all run unchanged; `prisma migrate reset` + reseed is safe. Optional, and
**recommended against**: seeding a `telegramChatId` on the mock admin — it would fire real
Telegram traffic during unrelated manual testing.

---

## 2. `NotificationService`, the provider interface, registration and the stubs

### 2.1 Where the subsystem lives — and why (resolves R4)

```text
Apps/api/src/common/notifications/
├── notification.types.ts        # NotificationRecipient, SendOutcome, provider interface
├── notification.service.ts      # NotificationService — owns the Notification row lifecycle
├── notification.templates.ts    # French copy, Record<NotificationType, renderer> (§6)
├── notification.recipients.ts   # the 4 recipient-resolution queries (§5)
├── notification.subscribers.ts  # the ONLY caller of NotificationService
├── providers/
│   ├── telegram.provider.ts     # implemented, plain fetch
│   ├── email.provider.ts        # stub
│   ├── whatsapp.provider.ts     # stub
│   └── registry.ts              # the frozen Record — "provider DI"
├── telegram.link.ts             # consumeLinkToken() — the ONE place a token is matched (§3, §8)
├── telegram.intake.ts           # handleTelegramUpdate() — the ONE intake handler (§3)
├── telegram.api.ts              # thin fetch wrappers: sendMessage, getUpdates, deleteWebhook
├── telegram.poller.ts           # the polling transport + lifecycle (§7)
└── index.ts                     # composition root: the singletons + initNotifications()
```

**Why `common/` and not `modules/notification/`:** back-end-rules §13.1 and CLAUDE.md both
forbid `common/` importing from `modules/`. `notification.subscribers.ts` must subscribe to the
bus (`common/events`) and be initialised from `server.ts` alongside `initRealtimeGateway` — which
is precisely the shape `common/realtime/` already has. Putting it in `modules/` would either
break the import rule or require the bus wiring to be re-exported through a module barrel. The
gateway is the precedent and this mirrors it exactly, so the 5-file module pattern does not apply
here — correctly, because this subsystem has no routes.

**The HTTP edges do live in `modules/`** (§4, §11): `modules/telegram/` (webhook + link
management) and `modules/notification/` (the log + resend). `modules/*` importing `common/*` is
the normal, sanctioned direction. This is the clean resolution of R4: **subsystem in `common/`,
HTTP in `modules/`.**

**Consequence to respect during execution:** the subscriber **cannot** import
`resolveEffectiveInfo` from `activation.service.ts`, `composeSubscriptionLabel` from
`set.mapper.ts`, or `FIELD_LABEL` from `activation.mapper.ts`. It reads Prisma directly. After
Set 3 this is easy — `ActivationInformation.value` *is* the current value
([`activation.service.ts:116-121`](Apps/api/src/modules/activation/activation.service.ts#L116-L121)),
so a plain `findMany` gives the effective fields with no overlay logic, except OTP which is still
step-stored. §5.3 states the exact query. French field labels live in the template file (§6.2),
which is where they belong anyway — `FIELD_LABEL` is English and admin-facing.

### 2.2 Types and the provider interface

```ts
// common/notifications/notification.types.ts
import type { UserRole, NotificationChannel, NotificationType } from '@my-app/contract';

/** A resolved, notifiable party. `address` is non-null by construction: recipient
 *  resolution filters out unlinked profiles, so an unlinked user produces NO row at all. */
export type NotificationRecipient = {
  role: UserRole;
  profileId: string;   // Admin.id | Activator.id | Distributor.id
  name: string;        // Admin/Activator.fullName, Distributor.storeName
  address: string;     // Telegram chat id (would be an email / MSISDN on another channel)
};

/** One outbound message, fully rendered. The service adds nothing to `body`. */
export type NotificationRequest = {
  channel: NotificationChannel;
  type: NotificationType;
  recipient: NotificationRecipient;
  body: string;
};

/** A provider transports an already-rendered body to one address.
 *  It knows NOTHING about Prisma, Notification rows, templates, or events.
 *  Contract: resolve on success, THROW on failure. The service converts a throw into a
 *  FAILED row — providers never touch the database and never swallow an error. */
export interface NotificationProvider {
  readonly channel: NotificationChannel;
  send(address: string, body: string): Promise<void>;
}

/** The service. `dispatch` NEVER throws and NEVER rejects — that is its whole job (§9.3). */
export interface INotificationService {
  dispatch(request: NotificationRequest): Promise<void>;
  dispatchAll(requests: NotificationRequest[]): Promise<void>;
  resend(notificationId: string): Promise<NotificationDTO>;
}
```

`resend` is the **one** method that may throw (`NotFoundError` when the id is unknown,
`ConflictError` when the row is not `FAILED`, `BadRequestError` when the profile is no longer
linked) — it is called from a controller on an admin's own request, where an error is the
correct response. Everything reached from the bus goes through `dispatch`/`dispatchAll`.

### 2.3 `NotificationService`

```ts
// common/notifications/notification.service.ts
export class NotificationService implements INotificationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly providers: ProviderRegistry,   // §2.4 — this is the DI seam
  ) {}

  async dispatch(request: NotificationRequest): Promise<void> { /* §9.2 lifecycle */ }
  async dispatchAll(requests: NotificationRequest[]): Promise<void> { /* Promise.allSettled */ }
  async resend(notificationId: string): Promise<NotificationDTO> { /* §9.4 */ }
}
```

Constructor shape is exactly the existing convention (§0.5): `prisma` first, collaborators after,
instantiated once at a composition root. `dispatchAll` uses `Promise.allSettled` so one activator
with a blocked bot cannot stop the other four from receiving theirs.

### 2.4 Provider registration and selection

```ts
// common/notifications/providers/registry.ts
export type ProviderRegistry = Readonly<Record<NotificationChannel, NotificationProvider>>;

export const buildProviderRegistry = (botToken: string | null): ProviderRegistry =>
  Object.freeze({
    [NotificationChannel.TELEGRAM]: new TelegramProvider(botToken),
    [NotificationChannel.EMAIL]:    new EmailProvider(),
    [NotificationChannel.WHATSAPP]: new WhatsAppProvider(),
  });
```

- **Registration** is this one exhaustive `Record`. Because it is
  `Record<NotificationChannel, …>`, adding a fourth channel to the enum **fails `tsc`** until a
  provider exists for it. That is the registration guarantee.
- **Selection** is `this.providers[request.channel]` — an object index on an enum, so it cannot
  miss and needs no `default:` branch or runtime throw.
- **The stubs are not selectable by accident.** `channel` is never derived from env, from a
  request body, or from a DB column. Every `NotificationRequest` the subscriber builds sets
  `channel: NotificationChannel.TELEGRAM` as a compile-time constant, and `resend` reads the
  channel back off the stored row (which was written the same way). There is no code path in
  which a user, an env var, or a payload chooses a channel.
- `botToken` is `string | null`: `null` only when `NOTIFICATIONS_ENABLED=false`, in which case
  nothing is ever registered on the bus, so no send is attempted. `TelegramProvider.send` still
  guards (`if (!this.botToken) throw new Error('TELEGRAM_BOT_TOKEN is not configured')`) so a
  misconfiguration surfaces as a FAILED row with a clear message rather than a `TypeError`.

### 2.5 `TelegramProvider` — plain `fetch`, no dependency

```ts
// common/notifications/providers/telegram.provider.ts
export class TelegramProvider implements NotificationProvider {
  readonly channel = NotificationChannel.TELEGRAM;
  constructor(private readonly botToken: string | null) {}

  async send(chatId: string, body: string): Promise<void> {
    if (!this.botToken) throw new Error('TELEGRAM_BOT_TOKEN is not configured');
    const res = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // NO parse_mode — see below. disable_web_page_preview keeps the deep-link
      // confirmation message from rendering a t.me card.
      body: JSON.stringify({ chat_id: chatId, text: body, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Telegram sendMessage ${res.status}: ${detail.slice(0, 200)}`);
    }
  }
}
```

**`parse_mode` is deliberately omitted — plain text only.** This is a correctness requirement,
not a style choice: message bodies carry the client's Snapchat **password**, which can contain
`_ * [ ] ( ) ~ ` > # + - = | { } . !` — every one of which is a MarkdownV2 metacharacter.
With `parse_mode: 'MarkdownV2'` an unescaped `_` either returns HTTP 400 ("can't parse entities")
or silently swallows characters, i.e. **delivers a wrong password to the activator**. Plain text
makes the value byte-exact. Formatting is newlines and plain labels only. **Never add a
`parse_mode` to this provider.** A comment in the file must say so.

`AbortSignal.timeout(10_000)` bounds every send; without it a hung Telegram leaves a pending
promise and a `PENDING` row forever.

Also required: the bot token must be redacted from Pino. The URL contains it, and `res.text()`
error bodies can echo request context — so the provider must never log the URL, and
`logger.ts`'s `redact` list gains `'botToken'`, `'telegramLinkToken'`, `'token'` (§9.5).

### 2.6 The two stubs

```ts
// common/notifications/providers/email.provider.ts
/** Stub. Satisfies the interface so the registry is exhaustive and a future email channel is a
 *  one-file change. It does NOT throw — a throwing stub would manufacture FAILED rows if it
 *  were ever reached — and it is not selectable (§2.4). It records the fact at debug level so
 *  an accidental call is visible in a dev log without generating noise in production. */
export class EmailProvider implements NotificationProvider {
  readonly channel = NotificationChannel.EMAIL;
  async send(address: string, _body: string): Promise<void> {
    logger.debug({ channel: this.channel, address }, 'Email provider is a stub — no email sent');
  }
}
```

`WhatsAppProvider` is identical with `channel = NotificationChannel.WHATSAPP`. Note the stub logs
the **address**, never the body — bodies can hold the client's password, and a debug line is not
a place for it.

⚠️ One consequence to state plainly: a stub resolving means `dispatch` would mark the row
`SENT`. Since neither stub is reachable (§2.4) this is inert today, but if a future set makes
channels selectable it must make the stubs mark `FAILED` instead. Noted in the file's comment.

### 2.7 Composition root

```ts
// common/notifications/index.ts
const enabled = env.NOTIFICATIONS_ENABLED;
const registry = buildProviderRegistry(enabled ? env.TELEGRAM_BOT_TOKEN ?? null : null);
export const notificationService = new NotificationService(prisma, registry);

/** Called from server.ts. A no-op when NOTIFICATIONS_ENABLED=false: no bus listener is
 *  registered and no poller starts, so the subsystem is fully inert. */
export const initNotifications = (): void => {
  if (!enabled) { logger.info('Notifications disabled — subscribers and poller not started'); return; }
  initNotificationSubscribers(notificationService, prisma);
};
```

`notificationService` is exported as a singleton because `modules/notification/` needs it for
`resend` and `modules/telegram/` needs it for the link-confirmation message — the same shape as
`prisma` being a `common/db` singleton.

---

## 3. The transport abstraction — one intake handler, one token match

### 3.1 The shared handler

```ts
// common/notifications/telegram.intake.ts

// Telegram's Update shape is a THIRD-PARTY wire format, not our API contract, so its schema
// lives here and not in @my-app/contract (contract-rules §1: our routes/DTOs/events only).
// Only the fields we act on are described; Telegram may send anything else.
const TelegramUpdateSchema = z.object({
  update_id: z.number().int(),
  message: z.object({
    chat: z.object({ id: z.number().int() }),
    text: z.string().optional(),
    from: z.object({ id: z.number().int(), first_name: z.string().optional() }).optional(),
  }).optional(),
}).loose();                       // Zod 4: passthrough unknown keys instead of stripping
export type TelegramUpdate = z.infer<typeof TelegramUpdateSchema>;

const START_COMMAND = /^\/start(?:\s+(\S+))?$/;

/**
 * THE single intake handler. Both transports call exactly this.
 *
 * Contract: NEVER throws and NEVER rejects — every failure is logged through Pino and
 * swallowed. The webhook controller therefore always answers 200 (so Telegram does not
 * retry-loop) and the poller can never die on a malformed update.
 *
 * Returns the update_id so the poller can advance its offset even for updates it ignored.
 */
export async function handleTelegramUpdate(
  prisma: PrismaClient,
  raw: unknown,
): Promise<number | null>;
```

Body, in order:

1. `TelegramUpdateSchema.safeParse(raw)` → on failure `logger.warn` and return `null`.
2. No `message` / no `text` → return `update_id` (ignored, offset advances).
3. `START_COMMAND.exec(text.trim())` → no match → **silent**: return `update_id` without
   replying. (**Q10** — recommend silence; a chatty fallback turns the bot into a support
   surface nobody owns.)
4. No token captured (bare `/start`) → send the "no token" help line, return `update_id`.
5. `await consumeLinkToken(prisma, token, String(chat.id))` → §3.2.
6. On success → `notificationService.dispatch({ type: TELEGRAM_LINKED, … })`, which both
   confirms to the user and writes the first `Notification` row.
   On failure → send the "invalid or already-used link" line **directly through the provider**,
   not through `dispatch` (there is no recipient profile to attribute a row to).

### 3.2 The token logic exists exactly once

```ts
// common/notifications/telegram.link.ts

export type ConsumeOutcome =
  | { ok: true; recipient: NotificationRecipient }
  | { ok: false; reason: 'NOT_FOUND' };

/** THE ONLY function in the codebase that matches a telegramLinkToken and writes a
 *  telegramChatId. Called by telegram.intake.ts and by nothing else, ever.
 *  Neither transport contains any token logic of its own. */
export async function consumeLinkToken(
  prisma: PrismaClient,
  token: string,
  chatId: string,
): Promise<ConsumeOutcome>;
```

Implementation, all inside one `$transaction`:

1. Find the token across the three tables — three `findUnique({ where: { telegramLinkToken: token } })`
   calls (each hits a unique index). `ADMIN` → `ACTIVATOR` → `DISTRIBUTOR`; first hit wins. Zero
   hits → `{ ok: false, reason: 'NOT_FOUND' }`.
2. **Claim it predicate-guarded**, the Set 4 idiom: `updateMany({ where: { id, telegramLinkToken:
   token }, data: { telegramChatId: chatId, telegramLinkedAt: now, telegramLinkToken: null } })`
   and require `count === 1`. Two simultaneous `/start` taps of the same link → exactly one wins,
   the other gets `NOT_FOUND`. This is what makes single-use (A2) atomic rather than aspirational.
3. **One chat ↔ one profile per role.** Before the claim, clear `telegramChatId` (and
   `telegramLinkedAt`) from any *other* row **of the same model** already holding this `chatId`.
   Without this, re-linking a person to a new profile leaves their old profile still delivering to
   the same chat, and they receive two people's notifications. Cross-model is *not* cleared — one
   person legitimately being both an admin and a distributor should receive both streams. **Q9.**
4. Return the recipient (role, profileId, name, address) so the caller can send the confirmation
   without a second read.

### 3.3 How each transport feeds it

| | Polling (`TELEGRAM_MODE=polling`) | Webhook (`TELEGRAM_MODE=webhook`) |
|---|---|---|
| Entry | `telegram.poller.ts` loop | `POST ${API_PREFIX}/telegram/webhook` |
| Fetches updates | `getUpdates?offset=N&timeout=30&allowed_updates=["message"]` | Telegram pushes one update per request |
| Feeds the handler | `for (const u of updates) await handleTelegramUpdate(prisma, u)` | `await handleTelegramUpdate(prisma, req.body)` |
| Token logic | **none** — delegates | **none** — delegates |
| Response | advances `offset = max(update_id) + 1` | `sendSuccess(res, { received: true })`, always 200 |
| Started by | `initTelegramPoller()` inside `httpServer.listen`'s callback | route registration at boot |

Both call the same exported function with the same signature. `telegram.poller.ts` and
`telegram.controller.ts` contain **no regex, no token lookup, no chat-id write** — `grep -rn
"telegramLinkToken" Apps/api/src` must show exactly one write site (`telegram.link.ts`) plus the
admin-side generate/unlink in `modules/telegram/telegram.service.ts` (§8). That grep is in the
Definition of Done.

---

## 4. Webhook security

### 4.1 How the endpoint is protected

**Primary: Telegram's own `secret_token` header, constant-time compared.**

When registering the webhook you pass `secret_token`; Telegram then sends it back on **every**
update in the `X-Telegram-Bot-Api-Secret-Token` header:

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://api.setvision.dz/api/v1/telegram/webhook" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
```

```ts
// modules/telegram/telegram.middleware.ts   (a middleware, not inline in the controller —
// back-end-rules §7: guards are middleware and fail fast with next(err))
const HEADER = 'x-telegram-bot-api-secret-token';

export const requireWebhookSecret = (req, _res, next) => {
  const provided = req.header(HEADER) ?? '';
  const expected = env.TELEGRAM_WEBHOOK_SECRET ?? '';
  const a = Buffer.from(provided), b = Buffer.from(expected);
  // timingSafeEqual throws on length mismatch, so compare lengths first — and compare them
  // in a way that does not leak the secret's length through an early return.
  const ok = expected.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!ok) return next(new AuthError('Invalid webhook secret'));
  next();
};
```

**Why the secret is a header and not a path segment.** The obvious alternative —
`/telegram/webhook/:secret` — is unavailable *by construction*: routes come from contract
constants (CLAUDE.md non-negotiable), and `@my-app/contract` is bundled into the **frontend**.
Any secret expressed as a route constant ships to every browser. The header keeps the secret
server-side only, and it is the mechanism Telegram itself provides.

**Defence in depth, three more layers:**

| Layer | What |
|---|---|
| Rate limit | A dedicated `webhookRateLimiter` (`express-rate-limit`, already a dependency): `windowMs: 60_000, limit: 120`, keyed on IP. Telegram's real rate is far below this; it caps a brute-force loop against the secret. |
| Mode gate | The route is registered **only** when `NOTIFICATIONS_ENABLED && TELEGRAM_MODE === 'webhook'`. In polling mode the path 404s — it does not exist to be probed. |
| No information leak | On a bad secret: `AuthError` → the standard 401 `AUTH_UNAUTHORIZED` envelope. Identical response whether the secret is wrong, empty, or the wrong length. Nothing distinguishes "close" from "nowhere near". |

`env.TELEGRAM_WEBHOOK_SECRET` is `z.string().min(32)` and is **required** when
`NOTIFICATIONS_ENABLED=true && TELEGRAM_MODE=webhook` (§10) — so webhook mode cannot boot
without one.

### 4.2 Why it is exempt from `requireAuth`

`requireAuth` verifies a JWT we minted for a `User` in our database. The caller here is
**Telegram's infrastructure**: it has no account, no session, no `User` row, and no way to obtain
a token. Applying `requireAuth` would 401 every single update — the endpoint would be
non-functional by construction.

`requireWebhookSecret` is the substitute authentication, and it is a *closer* fit than JWT for
this caller: a fixed shared secret, over TLS, on a server-to-server channel, with no user
identity involved. The trust it grants is also narrow — see below.

**This is the only unauthenticated *write* endpoint in the API**, so its blast radius is stated
explicitly for the record:

| Property | Value |
|---|---|
| What a valid-secret caller can do | Submit a `/start <token>` and, **only** with a token that already exists in the DB, bind a chat id to that one profile row |
| What it cannot do | Read anything. Create/modify/delete any other row. Escalate a role. Obtain a JWT. Trigger any domain action (no activation, order, revocation, or card is reachable). |
| Worst case with the secret leaked but no link token | Nothing. Every `/start` with a bogus token returns `NOT_FOUND` and writes no row. |
| Worst case with the secret leaked **and** a live link token leaked | The attacker receives that one person's Telegram notifications. Mitigated by single-use (§3.2), by unlink (§8.4), and by the token being visible only to admins in the admin UI. |
| Compared to the existing public surface | Narrower than `KEY_ROUTES.SUBMIT`, which is fully public and writes activation rows with client PII. |

Anti-abuse notes for execution: the handler **must not** echo any input back into an error
message, and must not reply to non-`/start` text (§3.1 step 3) — a bot that answers arbitrary
input is a free oracle.

### 4.3 Files and mounting

| File | Role |
|---|---|
| `Apps/contract/src/modules/telegram/telegram.routes.ts` | `TELEGRAM_ROUTES` (§11.1) |
| `Apps/api/src/modules/telegram/telegram.middleware.ts` | `requireWebhookSecret` |
| `Apps/api/src/modules/telegram/telegram.controller.ts` | `webhook` (+ the §11 link handlers) |
| `Apps/api/src/modules/telegram/telegram.routes.ts` | composition root; conditional webhook registration |
| `Apps/api/src/modules/index.ts` | `+ moduleRouter.use(TELEGRAM_ROUTES.BASE, telegramRouter)` |

The webhook controller is 4 lines: `await handleTelegramUpdate(prisma, req.body)` then
`sendSuccess(res, { received: true })`. Because the handler never throws, the only error this
route can produce is the 401 from the middleware. Answering 200 to a malformed update is
deliberate — a non-2xx makes Telegram retry with backoff and eventually disable the webhook.

---

## 5. Event → recipients → template

### 5.1 First: the five emits Set 6 must add (U1)

Mirroring `card-revocation-request.service.ts`'s existing private `emitStatusChanged` helper
([:298](Apps/api/src/modules/card-revocation-request/card-revocation-request.service.ts#L298)),
add to `card-order-request.service.ts` — **after each `$transaction` commits**, never inside:

| Method | Emit | Payload notes |
|---|---|---|
| `create` [:185](Apps/api/src/modules/card-order-request/card-order-request.service.ts#L185) | `order-request:created` | `distributorName` = `distributor.storeName`; `subscriptionLabel` from the loaded plan. Both are already in scope — `create` loads the distributor and the plan. |
| `approve` [:206](Apps/api/src/modules/card-order-request/card-order-request.service.ts#L206) | `order-request:status-changed` | `previousStat: PENDING`, `stat: APPROVED`, `orderId: null` |
| `reject` [:235](Apps/api/src/modules/card-order-request/card-order-request.service.ts#L235) | same | `previousStat: PENDING`, `stat: REJECTED`, `orderId: null` |
| `cancel` [:264](Apps/api/src/modules/card-order-request/card-order-request.service.ts#L264) | same | `previousStat: request.stat` (**PENDING or APPROVED** — Set 4 Q3 allows both, so it must be read off the row, not hard-coded), `stat: CANCELLED`, `orderId: null` |
| `unlink` [:288](Apps/api/src/modules/card-order-request/card-order-request.service.ts#L288) | same | `previousStat: PENDING_DELIVERY`, `stat: APPROVED`, `orderId: null` (the link is being removed) |

`create` needs a private `emitCreated`; the other four share a private `emitStatusChanged(dto,
previousStat)` copied from the revocation service so both modules read identically. No contract
change — both payload schemas already exist and already satisfy this.

Bonus effect, worth verifying in the manual pass: the admin queue and the linkable selector now
refresh live on approve/reject/cancel/unlink, which Set 4's manual tests 2 and 14 assumed but the
code never delivered.

### 5.2 Recipient-resolution queries (`notification.recipients.ts`)

Four functions. Each returns `NotificationRecipient[]` with **unlinked profiles already filtered
out**, so "no chat id ⇒ no `Notification` row" is structural, not a caller's responsibility.

```ts
/** Every ACTIVE activator with a linked chat. Activator has no isEnabled of its own —
 *  enablement lives on User (§0.9), so the User join is mandatory, not decorative. */
export const allActivators = (prisma) => prisma.activator.findMany({
  where: { telegramChatId: { not: null }, user: { isEnabled: true, deletedAt: null } },
  select: { id: true, fullName: true, telegramChatId: true },
});

/** One activator by Activator.id — the id the bus payloads already carry. */
export const oneActivator = (prisma, activatorId: string) => prisma.activator.findFirst({
  where: { id: activatorId, telegramChatId: { not: null }, user: { isEnabled: true, deletedAt: null } },
  select: { id: true, fullName: true, telegramChatId: true },
});

/** Every ACTIVE admin with a linked chat. BOTH isEnabled flags: Admin.isEnabled is the
 *  business toggle, User.isEnabled the access toggle, and they can disagree (§0.9). */
export const allAdmins = (prisma) => prisma.admin.findMany({
  where: { telegramChatId: { not: null }, isEnabled: true, user: { isEnabled: true, deletedAt: null } },
  select: { id: true, fullName: true, telegramChatId: true },
});

/** One distributor by Distributor.id. NOTE: no User predicate — Distributor.userId is
 *  nullable and an account-less distributor is a legal recipient (§1.1). Gated on the
 *  distributor's OWN isEnabled + deletedAt instead. */
export const oneDistributor = (prisma, distributorId: string) => prisma.distributor.findFirst({
  where: { id: distributorId, telegramChatId: { not: null }, isEnabled: true, deletedAt: null },
  select: { id: true, storeName: true, telegramChatId: true },
});
```

### 5.3 The matrix table

`AI` = extra DB read the subscriber must perform beyond the payload.

| # | Event | Matrix row | Recipients | Exact resolving query | Extra read | Template key |
|---|---|---|---|---|---|---|
| 1 | `activation:created` | New activation created → **all** activators | all linked, enabled activators | `allActivators(prisma)` | **none** — payload is `PendingActivationDTO` = `{id, subscriptionLabel, keyMasked, requestedAt}`, everything the message needs | `ACTIVATION_CREATED` |
| 2 | `activation:client-updated` **`kind: 'CORRECTION'`** | Information updated → the activator in charge | 1 | `oneActivator(prisma, p.activatorId)` — `activatorId` **is** `Activator.id`, the row holding `telegramChatId`, so no `User` hop | **yes** — the payload carries no field values. `prisma.activationInformation.findMany({ where: { activationId }, select: { accountInform, value } })`. After Set 3 these **are** the current values, no overlay needed ([service:116-121](Apps/api/src/modules/activation/activation.service.ts#L116-L121)) + `activation.findUnique` for `card.key` and `clientFullName` | `ACTIVATION_INFORMATION_UPDATED` |
| 3 | `activation:client-updated` **`kind: 'ADDITIONAL'`** | (same row, OTP half) | 1 | `oneActivator(prisma, p.activatorId)` | **yes** — the OTP is **still step-stored**, not in `ActivationInformation`. `prisma.additionalInformation.findFirst({ where: { activationStep: { activationId }, accountInform: 'OTP' }, orderBy: { activationStep: { createdAt: 'desc' } } })`, matching `extractOtpValue`'s newest-first semantics ([service:139](Apps/api/src/modules/activation/activation.service.ts#L139)) | `ACTIVATION_OTP_RECEIVED` |
| 4 | `activation:status-changed` | Activation status changed → the activator in charge (**U3: every transition**) | 0 or 1 | `activation.findUnique({ where: { id: p.activationId }, select: { activationStat, activatorId, clientFullName, takenAt, completedAt, card: { select: { key: true } } } })` then `oneActivator(prisma, activatorId)`. **`activatorId` is null before pickup** → zero recipients, no row | **yes, mandatory** — the payload has **no `activatorId`** and its `status` is the collapsed client vocabulary (§5.4) | `ACTIVATION_STATUS_CHANGED` (see §5.4.2 for the per-stat table) |
| 5 | `activation:frozen` | Activation `FREEZE` → ✓ Admin | all linked, enabled admins | `allAdmins(prisma)` | **yes** — payload is only `{activationId, timestamp}`. `activation.findUnique` for `card.key`, `clientFullName`, `freezReason`, `takenAt`, `activator.fullName` | `ACTIVATION_FROZEN` |
| 6 | `order-request:created` | Order request submitted → ✓ Admin | all linked, enabled admins | `allAdmins(prisma)` | **none** — payload carries `distributorName`, `subscriptionLabel`, `nbOfCards` (Set 4 §9 designed it that way) | `ORDER_REQUEST_CREATED` |
| 7 | `revocation-request:created` | Revocation request submitted → ✓ Admin | all linked, enabled admins | `allAdmins(prisma)` | **none** — payload carries `distributorName`, `cardKey`, `subscriptionLabel`, `reason` | `REVOCATION_REQUEST_CREATED` |
| 8 | `order-request:status-changed` **filtered** to `previousStat === APPROVED && stat === PENDING_DELIVERY` | `Order` actually created → ✓ Distributor | 1 | `oneDistributor(prisma, p.distributorId)` | **yes, small** — the payload has `orderId` but not the human-readable `orderNumber`. `order.findUnique({ where: { id: p.orderId }, select: { orderNumber, nbOfCards } })`, skipped when `orderId` is null | `ORDER_CREATED` |
| 9 | `revocation-request:status-changed` **filtered** to `stat === APPROVED` | Revocation request approved → ✓ Distributor | 1 | `oneDistributor(prisma, p.distributorId)` | **none** — payload carries `cardKey` and `adminNote` (Set 5 §6 designed it that way) | `REVOCATION_APPROVED` |

**The filter in rows 8 and 9 is the whole point of `previousStat` being on those payloads**
(Set 4 §9, Set 5 §6). Row 8 fires on exactly one transition out of the six that emit
`order-request:status-changed` — an admin approving is *not* "the order was created", and a
delivery-status propagation is not either. Everything else on those two events sends nothing.

**Recipients I cannot resolve from the current schema — flagged, as asked:**

| Would-be recipient | Why it cannot be resolved | Verdict |
|---|---|---|
| **The client** | A client is not a `User` and has no profile row — only `Activation.clientFullName` / `clientPhone` / `clientEmail?`. There is nowhere to put a `telegramChatId`, and clients are strangers, not staff. | Not in the matrix. Correct as-is. The client's channel is the public status page (`/client` socket namespace). |
| **The activator on `activation:status-changed`** | Not on the payload; requires the extra read in row 4. | **Resolvable, at one query per event.** Not a blocker. |
| **The distributor of an activation** | `Activation → Card → distributorId` exists, so it is technically resolvable — but no matrix row asks for it. | Out of scope. Do not add. |
| **A disabled activator/admin** | Resolvable, deliberately excluded by §5.2's predicates. | Excluded by design. Flagged so nobody "fixes" it. |
| **An account-less distributor** | **Resolvable** — the entire reason the fields live on the profile row (§1.1). | Supported. Rows 8 and 9 work for a distributor with no login. |

### 5.4 U3's consequences, stated per row for veto

You chose *"every `activation:status-changed` transition"*. Three consequences follow
mechanically, and I have designed for them rather than silently narrowing the instruction.

#### 5.4.1 `activation:resolved` is NOT subscribed

`activateByAdmin` and `cancelByAdmin` emit **both** `activation:resolved`
([:1268](Apps/api/src/modules/activation/activation.service.ts#L1268),
[:1330](Apps/api/src/modules/activation/activation.service.ts#L1330)) **and**
`activation:status-changed` ([:1274](Apps/api/src/modules/activation/activation.service.ts#L1274),
[:1336](Apps/api/src/modules/activation/activation.service.ts#L1336)). Subscribing to both would
send the activator **two Telegram messages for one admin action**. Since `status-changed` covers
every transition including these two, `activation:resolved` is left to the realtime gateway
alone. Row 4's per-stat table below covers admin resolution under
`ACTIVATED_BY_ADMIN` / `CANCELLED_BY_ADMIN`.

#### 5.4.2 The status→template table — the true `ActivationStat`, not the client status

`activation:status-changed` carries `status: ClientActivationStatus`, which **collapses
distinctions the activator needs**: `ACTIVATED` and `ACTIVATED_BY_ADMIN` both become `ACTIVATED`;
`CANCELLED_BY_ACTIVATOR`, `CANCELLED_BY_ADMIN` and `REMOVED_FROM_ACTIVATOR` all become `FAILED`.
A message built from that vocabulary literally cannot say *"an admin cancelled the activation you
had frozen"*.

**So row 4's mandatory read fetches the real `Activation.activationStat`** and the template
selects on that. This costs nothing extra — the same read already supplies `activatorId`.

| True `ActivationStat` after the change | Emitted by | Message to the activator in charge? |
|---|---|---|
| `PENDING` | `submit()` [:366](Apps/api/src/modules/activation/activation.service.ts#L366), `cancel()` [:866](Apps/api/src/modules/activation/activation.service.ts#L866), `release()` [:935](Apps/api/src/modules/activation/activation.service.ts#L935) | **No.** `activatorId` is null (submit) or has just been cleared (cancel/release) → zero recipients by construction. A returned-to-pool activation reaches activators via `activation:created`, which cancel and release also emit. |
| `PROCESSING` | `update()` [:455](Apps/api/src/modules/activation/activation.service.ts#L455), `additional()` [:520](Apps/api/src/modules/activation/activation.service.ts#L520) | **No — deliberately suppressed.** Both sites also emit `activation:client-updated`, whose templates (rows 2/3) carry *the actual new values including the password and the OTP*. A bare "status is now PROCESSING" alongside them is pure duplicate noise, strictly less informative. **This is the one row I recommend you keep suppressed; say so if you want it.** |
| `WRONG_INFORMATION` | `flagWrong()` [:667](Apps/api/src/modules/activation/activation.service.ts#L667) | **No.** The activator performed this action themselves, seconds ago, in the UI. |
| `ADDITIONAL_INFORMATION` | `requestAdditional()` [:716](Apps/api/src/modules/activation/activation.service.ts#L716) | **No.** Same — their own action. |
| `ACTIVATED` | `activate()` [:799](Apps/api/src/modules/activation/activation.service.ts#L799) | **Yes** — a completion confirmation carrying the commission earned and the total duration. Their own action, but it is the receipt for money owed, so it is worth having in writing. |
| `FREEZE` | `freeze()` [:981](Apps/api/src/modules/activation/activation.service.ts#L981) | **No** to the activator (their own action). **Yes** to admins via row 5. |
| `ACTIVATED_BY_ADMIN` | `activateByAdmin()` [:1274](Apps/api/src/modules/activation/activation.service.ts#L1274) | **Yes** — an admin resolved their frozen activation in their favour; commission is credited. They cannot know otherwise. |
| `CANCELLED_BY_ADMIN` | `cancelByAdmin()` [:1336](Apps/api/src/modules/activation/activation.service.ts#L1336) | **Yes** — an admin cancelled their frozen activation; no commission. They cannot know otherwise. |
| `CANCELLED_BY_ACTIVATOR` | `cancel()` [:866](Apps/api/src/modules/activation/activation.service.ts#L866) | **No.** Own action, and `activatorId` is cleared anyway. |
| `REMOVED_FROM_ACTIVATOR` | `release()` [:935](Apps/api/src/modules/activation/activation.service.ts#L935) | **No.** `activatorId` cleared → no recipient. Worth revisiting if release ever becomes an admin action; today it is the activator's own. |

**Every one of the 11 emit sites is handled**: 3 send a message, 8 are explicitly documented as
"no recipient" or "own action / covered elsewhere". Nothing is silently dropped. Implementation
shape: `const STATUS_TEMPLATE: Partial<Record<ActivationStat, NotificationType>>` — a
`Partial` `Record` keyed by the enum, so the file *lists* all ten values and the absent ones are a
visible decision rather than a fall-through.

#### 5.4.3 The cost

Every one of the 11 sites now performs one `activation.findUnique` in the subscriber, even for
the 8 that send nothing. That is 1 extra indexed primary-key read per activation state change —
negligible against the 3–6 queries each of those service methods already runs, and it happens
**off the request path** (§9.3), so it adds nothing to client-visible latency. Recorded so it is
a known cost and not a surprise.

### 5.5 The contract change for U2

```ts
// Apps/contract/src/modules/activation/activation.events.ts

/** Which client-facing flow produced the update. The two flows are otherwise
 *  indistinguishable — both end at PROCESSING — and they need different notification
 *  templates (Set 6 §0.3). The realtime gateway ignores this field. */
export enum ClientUpdateKind {
  CORRECTION = 'CORRECTION',   // update()     — flagged fields corrected (may include PASSWORD)
  ADDITIONAL = 'ADDITIONAL',   // additional() — an OTP request was answered
}

export const ActivationClientUpdatedPayloadSchema = z.object({
  activationId: z.uuid(),
  activatorId: z.uuid(),
  kind: z.enum(ClientUpdateKind),   // ← added
  timestamp: z.iso.datetime(),
});
```

- `ClientUpdateKind` goes in `activation.enums.ts` (contract-rules §2: enums in `*.enums.ts`),
  re-exported through the existing module barrel. No new module, no cross-module import → no
  `madge` risk (R13).
- **Required, not optional.** With `exactOptionalPropertyTypes: true` (R12) an optional field
  invites `kind: undefined` bugs, and both emit sites are known — there is no legacy emitter to
  be lenient toward. `tsc` will point at exactly the two lines that must be updated.
- Emitters: `activation.service.ts:450` → `kind: ClientUpdateKind.CORRECTION`;
  `:515` → `kind: ClientUpdateKind.ADDITIONAL`.
- The gateway strips it, as it already strips `activatorId`
  ([realtime-gateway.ts:78-86](Apps/api/src/common/realtime/realtime-gateway.ts#L78-L86)) — so
  `socket.types.ts` and `Apps/web/src/lib/realtime.ts` need **no change**. The wire payload to
  the browser stays `{activationId, timestamp}`.

---

## 6. Template strategy

### 6.1 Where the copy lives

**`Apps/api/src/common/notifications/notification.templates.ts`** — a plain French constant map.

Confirming A1's reasoning against the tree: there is **no i18n infrastructure on the backend at
all**. `translations.json`, `lib/i18n.ts`, `useTranslation` and the non-reactive
`translate(key, lang)` all live in `Apps/web/src`. Per-user language would need a `language`
column on three profile rows *plus* a backend copy store — for one channel with a homogeneous
internal Algerian audience. **French, hard-coded, one file.**

The shape keeps a language dimension addable later without touching a single call site:

```ts
type Renderer<V> = (vars: V) => string;

/** Exhaustive by construction: Record<NotificationType, …> means adding an enum value
 *  fails tsc until its template exists. This is the "no magic strings" guarantee for copy. */
export const TEMPLATES: { [K in NotificationType]: Renderer<TemplateVars[K]> } = { … };

export const render = <K extends NotificationType>(type: K, vars: TemplateVars[K]): string =>
  TEMPLATES[type](vars);
```

A later `Record<Language, Record<NotificationType, Renderer>>` is a change to this file only.

### 6.2 French field labels

`FIELD_LABEL` in [`activation.mapper.ts:29-36`](Apps/api/src/modules/activation/activation.mapper.ts#L29-L36)
is **English** and lives in `modules/` — unimportable from `common/` (§2.1) and wrong language
anyway. A second, French map lives in the template file:

```ts
const FIELD_LABEL_FR: Record<AccountInformation, string> = {
  USERNAME: "Nom d'utilisateur", EMAIL: 'E-mail', PHONE_NUMBER: 'Téléphone',
  OTP: 'Code OTP', BIRTHDAY: 'Date de naissance', PASSWORD: 'Mot de passe',
};
```

Not duplication to eliminate: they serve different audiences in different languages. Both are
`Record<AccountInformation, string>`, so a new enum value breaks both at compile time.

### 6.3 The Set 2 duration formatter in bodies

v2-decisions §12.3 sanctioned a **conditional** backend mirror: *"Deferred second implementation
(Set 6 only) … if that survives the Set 6 plan, mirror the function as
`Apps/api/src/common/utils/duration.utils.ts`."*

**It survives — three templates need it**, so create the mirror:

| Template | Duration rendered | Source |
|---|---|---|
| `ACTIVATION_FROZEN` | how long the activator held it before freezing | `now − takenAt` |
| `ACTIVATION_STATUS_CHANGED` → `ACTIVATED` | total handling time (the commission tier's basis) | `completedAt − takenAt` |
| `ACTIVATION_STATUS_CHANGED` → `ACTIVATED_BY_ADMIN` | same | `completedAt − takenAt` |

`Apps/api/src/common/utils/duration.utils.ts` is a **byte-for-byte port** of
[`Apps/web/src/lib/duration.ts`](Apps/web/src/lib/duration.ts) — same `pad`, same
`mm:ss` / `hh:mm:ss` / `dd:hh:mm:ss` buckets, same non-finite→`—`, same negative clamp, same
`DURATION_EMPTY = "—"`, same order of operations. Sanctioned by back-end-rules §9 (pure,
domain-split utils under `common/utils/`). Two files, **one spec**: the Set 2 plan's input→output
table is the contract both satisfy. Do **not** create a shared workspace package (CLAUDE.md's
no-new-dependency rule, and a new build target for a 15-line pure function is a bad trade). The
header comment in both files must name the other as its twin.

Seconds are computed in the subscriber from `Date` deltas — `Math.round((a - b) / 1000)` —
matching `durationSeconds()` in
[`activation.mapper.ts:91-94`](Apps/api/src/modules/activation/activation.mapper.ts#L91-L94).

### 6.4 The interpolation ALLOWLIST

**A template may interpolate a field only if it appears below.** Enforced by `TemplateVars` —
each `NotificationType` maps to its own exact var type, so `tsc` rejects an unlisted field.
This is a compile-time allowlist, not a code-review convention.

#### Allowed — activation

| Field | Source | Note |
|---|---|---|
| `activationId` | `Activation.id` | |
| `cardKeyMasked` | `PendingActivationDTO.keyMasked` | row 1 only, where that is all the payload has |
| `cardKey` | `Card.key` | full key, activator/admin messages only — the same value already on their screens |
| `subscriptionLabel` | `PendingActivationDTO` / `composeSubscriptionLabel` semantics | |
| `clientFullName` | `Activation.clientFullName` | |
| `clientPhone` | `Activation.clientPhone` | |
| `clientEmail` | `Activation.clientEmail` | nullable |
| `activationEmail` | `Activation.activationEmail` | nullable |
| **`accountFields[]`** = `{label, value}` | `ActivationInformation.accountInform` + `.value` | **INCLUDES `PASSWORD`, IN THE CLEAR — see §6.5** |
| **`otpValue`** | `AdditionalInformation.value` where `accountInform = OTP` | **IN THE CLEAR — see §6.5** |
| `activationStat` | `Activation.activationStat` | rendered through a French label map |
| `freezeReason` | `Activation.freezReason` | |
| `durationText` | `formatDuration(seconds)` (§6.3) | |
| `commission` | `Activation.activationPrice` | via `decimalToNumber`, formatted `"1 200,00 DZD"` — **never a JS float in arithmetic** (CLAUDE.md); the value is read straight from Prisma and only formatted |
| `activatorName` | `Activator.fullName` | admin-facing messages |
| `requestedAt`, `takenAt`, `completedAt` | `Activation.*` | `fr-DZ` via `Intl.DateTimeFormat` |

#### Allowed — requests, orders, recipients

| Field | Source |
|---|---|
| `requestId`, `nbOfCards`, `reason`, `adminNote`, `orderNumber`, `stat`, `previousStat` | the Set 4/5 event payloads and the row-8 order read |
| `distributorName` | `Distributor.storeName` |
| `cardKey` | `CardRevocationRequest` payload |
| `recipientName` | `Admin`/`Activator.fullName`, `Distributor.storeName` |
| `roleLabel` | French label for `UserRole` |

#### FORBIDDEN — never, in any template, `Notification.body`, `Log.actionDescription`, or Pino line

| Field | Why |
|---|---|
| **`User.password`** | Our credential. Argon2/bcrypt hash. Contract-rules §5 applies in full. |
| **`RefreshToken.tokenHash`** | Session bearer material. |
| **Any JWT** (access or refresh, raw or decoded) | Session bearer material. |
| **`User.username`** | Half of a login pair. No template needs it — every message identifies people by `fullName`/`storeName`. |
| **`telegramLinkToken`** | A bearer token for notification delivery. Echoing it into a message body would persist it in `Notification.body` and possibly a log line **after** it was supposed to be single-use. Added explicitly because it is the one new secret this set creates and it is not covered by any existing rule. |
| **`env.TELEGRAM_BOT_TOKEN`, `JWT_SECRET`, `TELEGRAM_WEBHOOK_SECRET`, `DATABASE_URL`** | Infrastructure secrets. The provider must never log its request URL (§2.5). |

`Notification.body` is a **durable copy** of whatever a template emits, and the admin log page
renders it — so the forbidden list applies to templates and to the stored row identically. That
is precisely why the allowlist is typed rather than trusted.

### 6.5 Password and OTP go in the clear — deliberately, per D3 and the Set 6 scope note

The `ACTIVATION_INFORMATION_UPDATED` template sends the new values **including the PASSWORD in
the clear**, and `ACTIVATION_OTP_RECEIVED` sends **the OTP unhidden**. Do not mask, do not omit,
do not substitute a *"a field changed"* placeholder, do not truncate.

The reasoning, recorded so a future session does not "fix" it back (this is the fourth artefact
in the repo that will look like an exposure and is not — R3's sibling):

1. These are the **client's own Snapchat credentials**, not system secrets. The client changes
   the password after activation. D3.
2. Both values **already flow unmasked** to the same activator over REST:
   `toActiveRequestDTO.accountFields` + the dedicated `otpValue`
   ([`activation.mapper.ts:218-222`](Apps/api/src/modules/activation/activation.mapper.ts#L218-L222)),
   rendered in the clear on `ActiveRequestCard.tsx`. And unmasked to the client itself via
   `toKeyVerificationDTO.submittedFields`.
3. Both messages go to **one** activator's private chat — the same trust boundary as their
   active-request card. The Telegram message is a push copy of a screen they already have.
4. Withholding them would make the notification useless: an activator gets pinged and must open
   the app to learn what changed, which is the entire problem the notification solves.

Set 3 plan §6 states the same rule in the same words. `schema.prisma`'s
`ActivationInformation.value` comment (updated in Set 3) already reads
*"Exposure: activator, client (key-gated), admin (D3)"* — **execution must extend it to name
Telegram**, so the schema does not contradict the behaviour.

Corollary that must not be lost: this exception is about the *client's* credentials only. The
§6.4 forbidden list is absolute and has no D3 escape hatch.

### 6.6 Worked bodies (French, plain text, no `parse_mode`)

```
ACTIVATION_CREATED
  🆕 Nouvelle activation disponible
  Carte : ****3F2A
  Abonnement : Snapchat — 12 mois
  Reçue à : 10/08/2026 14:32

ACTIVATION_INFORMATION_UPDATED
  ✏️ Informations corrigées par le client
  Carte : SV-8842-3F2A
  Client : Amine Belkacem
  Valeurs à jour :
  • Nom d'utilisateur : amine.bk
  • Mot de passe : Sn@p2026!parisien
  Ouvrez votre demande active pour continuer.

ACTIVATION_OTP_RECEIVED
  🔐 Code OTP reçu
  Carte : SV-8842-3F2A
  Client : Amine Belkacem
  Code OTP : 483920

ACTIVATION_STATUS_CHANGED → ACTIVATED
  ✅ Activation terminée
  Carte : SV-8842-3F2A · Client : Amine Belkacem
  Durée : 00:18:44
  Commission : 350,00 DZD

ACTIVATION_STATUS_CHANGED → CANCELLED_BY_ADMIN
  ⛔ Activation annulée par un administrateur
  Carte : SV-8842-3F2A · Client : Amine Belkacem
  Durée : 02:14:07
  Aucune commission n'a été créditée pour cette activation.

ACTIVATION_FROZEN
  🧊 Activation gelée — intervention requise
  Carte : SV-8842-3F2A · Client : Amine Belkacem
  Activateur : Yacine Meziane
  Temps écoulé : 01:42:10
  Motif : Le compte demande une vérification par e-mail.

ORDER_REQUEST_CREATED
  📦 Nouvelle demande de commande
  Distributeur : Boutique El Djazair
  Abonnement : Snapchat — 12 mois
  Quantité : 50 cartes

REVOCATION_REQUEST_CREATED
  ♻️ Nouvelle demande de révocation
  Distributeur : Boutique El Djazair
  Carte : SV-8842-3F2A (Snapchat — 12 mois)
  Motif : Échec d'activation, le client a annulé.

ORDER_CREATED
  🚚 Votre commande a été créée
  Commande : CMD-2026-0142
  Cartes : 50
  Vous serez notifié à chaque étape de la livraison.

REVOCATION_APPROVED
  ✅ Demande de révocation approuvée
  Carte : SV-8842-3F2A
  La carte est de nouveau disponible dans votre stock.
  Note de l'administrateur : Vérifié, révoquée.

TELEGRAM_LINKED
  ✅ Notifications activées
  Bonjour Yacine Meziane (Activateur).
  Vous recevrez désormais les notifications SetVision dans cette conversation.
```

---

## 7. The polling loop

### 7.1 Lifecycle

```ts
// common/notifications/telegram.poller.ts
let controller: AbortController | null = null;
let running = false;

export const startTelegramPoller = (prisma: PrismaClient): void => {
  if (running) return;                              // idempotent
  running = true;
  controller = new AbortController();
  void loop(prisma, controller.signal);             // fire-and-forget; loop() never rejects
};

export const stopTelegramPoller = (): void => {
  running = false;
  controller?.abort();                              // cancels the in-flight long poll NOW
  controller = null;
};
```

Wiring in [`server.ts`](Apps/api/src/server.ts):

```ts
initNotifications();                    // registers bus subscribers, or logs & returns (§2.7)

async function main() {
  await prisma.$connect();
  httpServer.listen(env.PORT, () => {
    logger.info(`API listening on port ${env.PORT}`);
    // AFTER the port is bound (§0.7) and only in polling mode.
    if (env.NOTIFICATIONS_ENABLED && env.TELEGRAM_MODE === 'polling') startTelegramPoller(prisma);
  });
}

function shutdown(signal: string): void {
  logger.info({ signal }, 'Shutting down');
  stopTelegramPoller();                 // FIRST — abort the long poll before closing anything
  io.close();
  httpServer.close(() => { void prisma.$disconnect().finally(() => process.exit(0)); });
}
```

`stopTelegramPoller()` must be the **first** statement in `shutdown`. `getUpdates` holds a 30-second
long poll; without the abort the process would sit past `httpServer.close`'s callback and only exit
on the `process.exit(0)` — masking a leak that would bite under a real orchestrator's SIGKILL
timeout. The `AbortController` is why this is a self-rescheduling async loop and **not**
`setInterval`: `setInterval` cannot cancel an in-flight fetch, and it would overlap polls whenever
one exceeded the interval (which a 30-second long poll does by design).

### 7.2 The loop

```ts
async function loop(prisma: PrismaClient, signal: AbortSignal): Promise<void> {
  let offset = 0;                 // 0 = "give me everything unconfirmed" (§7.3)
  let backoffMs = 0;
  while (running && !signal.aborted) {
    try {
      const updates = await getUpdates({ offset, timeoutSec: 30, signal });
      backoffMs = 0;                                     // reset on ANY success, incl. empty
      for (const u of updates) {
        const id = await handleTelegramUpdate(prisma, u);   // never throws (§3.1)
        if (id !== null && id >= offset) offset = id + 1;    // advance even if ignored
      }
    } catch (err) {
      if (signal.aborted) break;                         // clean shutdown, not an error
      backoffMs = nextBackoff(backoffMs, err);            // §7.4
      logger.error({ err, backoffMs }, 'Telegram getUpdates failed');
      await sleep(backoffMs, signal);
    }
  }
  logger.info('Telegram poller stopped');
}
```

`timeoutSec: 30` on Telegram's side, with the client-side `AbortSignal.timeout` set **above** it
(45s) so the server's long poll is never severed mid-flight by our own timeout.
`allowed_updates: ['message']` on every call — we act on nothing else, and narrowing it means
Telegram does not queue update types we would only discard.

### 7.3 Offset persistence across restarts — in-memory, and why that is correct

**No new table, no file, no Redis key.** The offset lives in the `loop` closure.

How Telegram's offset actually works: calling `getUpdates?offset=N` **confirms and permanently
deletes** every update with `update_id < N`. Unconfirmed updates are retained server-side for
**24 hours**. So on restart, starting from `offset = 0` redelivers exactly the updates that were
never confirmed — at most the final batch in flight when the process died, since every successful
poll confirms the previous one.

Redelivery is harmless because **the intake handler is idempotent**:

- A `/start <token>` whose token was already consumed → the token is `NULL` in the DB → no match →
  `NOT_FOUND` → the user gets the "invalid or already-used link" reply. No state change.
- A `/start <token>` that was *never* processed → it links, which is the desired outcome.
- Anything else → ignored.

The only observable artefact of a restart mid-batch is that a user might receive the
"already-used link" reply twice. That is the entire cost.

Rejected alternative: a `TelegramPollerState` (or generic `AppState`) key/value model. It would add
a table and a migration to persist one integer, for a transport that by decision (§7.5, U4) runs
only on the developer's machine — and it would not remove the need for idempotency, since a crash
between "handled" and "persisted offset" reintroduces exactly the same replay. **Q5.**

### 7.4 Error backoff

```ts
const MAX_BACKOFF_MS = 60_000;
const nextBackoff = (current: number, err: unknown): number => {
  const base = current === 0 ? 1_000 : Math.min(current * 2, MAX_BACKOFF_MS);
  // Telegram 429 sends retry_after (seconds) — honour it exactly rather than guessing.
  const retryAfter = retryAfterMsFrom(err);
  return Math.max(base, retryAfter ?? 0) + jitterMs(250);
};
```

1 s → 2 → 4 → 8 → 16 → 32 → 60 (cap), reset to 0 on any success. ±250 ms jitter so a restart storm
does not synchronise. Failure classes:

| Class | Behaviour |
|---|---|
| Network / DNS / timeout | Backoff ladder. Common on a laptop that slept; recovers silently. |
| **HTTP 409** | §7.5 — the loud one. |
| HTTP 401 (bad bot token) | `logger.fatal`, then **stop the poller** rather than hammer forever. The token will not fix itself and 401 is unambiguous. The API keeps serving; notifications are simply dead until the env is corrected. |
| HTTP 429 | Honour `parameters.retry_after`. |
| Other 4xx/5xx | Backoff ladder. |
| `signal.aborted` | Not an error — `break`. |

### 7.5 Two instances running — the 409 failure mode

Telegram permits **one** `getUpdates` consumer per bot token. A second one makes the API return:

```
409 Conflict: terminated by other getUpdates request; make sure that only one bot instance is running
```

Both instances then fight: each 409s the other, and neither reliably receives updates. Symptom on
the user's side: deep links intermittently do nothing.

Handling, explicitly:

- **Detect 409 by status code**, not by message text. On 409: `logger.error` **once** (a
  `warnedConflict` latch, so a 60-second cap does not produce 1 440 identical lines an hour), then
  jump straight to `MAX_BACKOFF_MS` — no ladder. The message must name the cause: *"another
  getUpdates consumer or a registered webhook is active for this bot token"*.
- **A registered webhook also causes 409.** So `startTelegramPoller` calls `deleteWebhook` **once
  on start** before its first poll. This is a deliberate side effect on shared bot state, and it is
  exactly why U4 matters.

**U4 — two bots, two tokens.** Per your decision:

| Environment | Bot | `TELEGRAM_MODE` | Token |
|---|---|---|---|
| Local development | `@SetVisionDevBot` | `polling` | `TELEGRAM_BOT_TOKEN` (dev) |
| Deployed instance | `@SetVisionBot` | `webhook` | `TELEGRAM_BOT_TOKEN` (prod) |

With separate tokens, `deleteWebhook` on the dev bot can never take down production's webhook — the
single most plausible operational accident this set could cause. **The plan's env docs and
`.env.example` must state this in a comment** (§10). Both bots are created with @BotFather; the
`TELEGRAM_BOT_USERNAME` differs per environment because the deep link embeds it.

The remaining 409 risk is two dev processes on one machine (e.g. `npm run dev` twice, or a stale
`tsx watch`). The one-shot 409 log line names it, which is the whole point of not swallowing it.

---

## 8. Token flow

### 8.1 Generation

`crypto.randomBytes(32).toString('hex')` — i.e. **reuse
[`generateOpaqueToken()`](Apps/api/src/common/utils/token.utils.ts)** unchanged.

It fits Telegram's deep-link `start` payload constraints exactly: max 64 characters, alphabet
`A-Za-z0-9_-`. Hex is 64 chars of `[0-9a-f]` — at the limit, inside the alphabet, 256 bits of
entropy. No new util, no new dependency, and the existing unit test for it (frozen) still applies.

The API returns the assembled deep link, not the raw pieces:

```
https://t.me/{env.TELEGRAM_BOT_USERNAME}?start={token}
```

Composed **server-side** so the bot username stays a backend env var — the frontend needs no new
`VITE_*` variable and the link has one source of truth (§11.2). **Q12.**

### 8.2 Uniqueness

- `@unique` per model (§1.1). On a **nullable** Postgres column, unlimited NULLs coexist, so every
  unlinked row holds `NULL` without colliding — the D7 shape.
- **Cross-table collision** is theoretically possible (three separate unique indexes). At 256 bits
  it will not happen; nonetheless `consumeLinkToken` searches the three tables in a fixed order and
  takes the first hit, so behaviour is deterministic rather than undefined even in that impossible
  case.
- Generation retries on `P2002` once, then throws — the standard defensive shape, though the
  collision probability makes it dead code.

### 8.3 Stored in the clear — a decision, with the reasoning

`telegramLinkToken` is **not** hashed, unlike `RefreshToken.tokenHash`.

Why: the admin must be able to re-display the deep link (page reload, second attempt, sending it
over WhatsApp), and a hash cannot be un-hashed to rebuild the URL. A store-the-hash-and-show-once
design would mean any reload forces a regeneration — hostile to the actual workflow, where an admin
generates a link and pastes it to someone.

The residual risk is bounded and consistent with how this system already works:

- What a leaked token grants: **receiving one person's notifications**. Not login, not API access,
  not role escalation.
- It is single-use (§3.2) and clears on link, so the window is short in practice.
- It is visible only to admins, in the admin UI — the same admins who already see plaintext
  generated passwords in `GeneratedPasswordPanel.tsx`.
- Mitigation if it is ever abused: unlink (§8.4) invalidates the chat binding immediately.

**Q7** — say the word and it becomes hash-stored with show-once semantics; it is a contained change
to `telegram.link.ts` plus the admin UI's re-display behaviour.

### 8.4 Single-use, regeneration, unlink

| Action | Route | Writes | Log |
|---|---|---|---|
| **Generate / regenerate** | `POST /telegram/link/:role/:profileId` (admin) | `telegramLinkToken = <new>`. **`telegramChatId` is left alone.** | `GENERATE_TELEGRAM_TOKEN` — *"Generated a Telegram link token for activator Yacine Meziane"* / *"Regenerated…"* when one already existed |
| **Consume** | the bot, via `consumeLinkToken` | `telegramChatId = chat.id`, `telegramLinkedAt = now`, `telegramLinkToken = null` — one predicate-guarded `updateMany`, `count === 1` required | **none** (§1.4 — no honest actor) |
| **Unlink** | `DELETE /telegram/link/:role/:profileId` (admin) | **all three fields cleared**: `telegramChatId = null`, `telegramLinkedAt = null`, `telegramLinkToken = null` | `UNLINK_TELEGRAM` — *"Unlinked Telegram for activator Yacine Meziane"* |
| **Status** | `GET /telegram/link/:role/:profileId` (admin) | — | — |

- **Single-use** is the `count === 1` predicate guard, not a flag. Reusing a consumed link →
  `NOT_FOUND` → the bot replies *"Ce lien est invalide ou a déjà été utilisé."* (manual test 4).
- **Regeneration does not unlink.** Generating while already linked is how you *move* someone to a
  new chat: the old chat keeps receiving until the new `/start` completes, at which point §3.2
  step 3 clears the stale binding. The admin UI must warn that completing the new link replaces the
  current chat.
- **Unlink clears `telegramLinkToken` too** — v2-decisions A2's explicit addition. Clearing only
  `telegramChatId` would leave a live token that could re-link after a deliberate unlink.
- Both admin actions write their `Log` row **inside** the same `$transaction` as the profile update
  — the 13-of-18 majority pattern, and what Sets 4/5 did. No `writeLog` helper is introduced
  (R9/Set 4 Q6: Set 1 did not land it, and inventing it in Set 6 would create a second convention
  mid-programme).

### 8.5 The polymorphic `:role/:profileId` shape

One endpoint triple, not three copies on `ADMIN_ROUTES` / `ACTIVATOR_ROUTES` /
`DISTRIBUTOR_ROUTES`. The handler is byte-identical across roles apart from which Prisma delegate
it touches, so triplicating it would triplicate the token logic — the exact duplication D12
forbids. `role` is validated by `z.enum(UserRole)` and mapped through an exhaustive
`Record<UserRole, delegate>` switch inside `telegram.service.ts`, so a fourth role fails `tsc`.

---

## 9. Failure handling

### 9.1 No automatic retries — decision and reasoning

**One attempt per notification. No retry, no queue, no scheduler.**

- Automatic retry needs durable scheduling (a worker, a cron, a queue). This app has no background
  job infrastructure at all — the poller (§7) is the first long-running process in it. Building a
  retry scheduler to serve a best-effort convenience channel is disproportionate.
- The scope's own mechanism is **manual resend from the admin log page** (§11.3), and manual test
  11 tests exactly that.
- Most real failures are **permanent**, not transient: the user blocked the bot (403), the chat was
  deleted (400), the token is wrong (401). Retrying those just multiplies FAILED rows.
- Transient failures are visible and one click from fixed.

Automatic retry with exponential backoff is a clean later addition — `attempts` and `error` are
already on the row for it.

### 9.2 How rows are recorded

`dispatch(request)` in strict order:

1. **`create` the row `PENDING`** with `attempts: 0`, the rendered `body`, and the recipient
   snapshot (`recipientName`, `recipientAddress`). Written **before** the send, so a crash or a
   hung provider leaves evidence rather than silence.
2. `update` → `attempts: { increment: 1 }`.
3. `await provider.send(recipient.address, body)`.
4. Success → `update` → `stat: SENT`, `sentAt: now`.
5. Throw → `update` → `stat: FAILED`, `error: String(err.message).slice(0, 500)` +
   `logger.error({ notificationId, type, channel, recipientRole, recipientProfileId }, 'Notification send failed')`.
   **The log line carries ids only — never `body`** (it may hold the client's password).
6. **Nothing is rethrown.** `dispatch` resolves either way.

A stuck `PENDING` row therefore means the process died mid-send — diagnosable, and distinct from
`FAILED`. If step 4 or 5's `update` itself fails (DB down), the `catch` logs and returns; the row
stays `PENDING`. That is the correct degradation.

`dispatchAll` uses `Promise.allSettled` — one blocked activator cannot suppress the other four.

### 9.3 Why a send failure can never fail the originating HTTP request — three independent layers

| # | Layer | Mechanism |
|---|---|---|
| **1** | **Deferral off the synchronous emit path** | `eventBus.emit` is synchronous and un-caught inside domain services (e.g. [`activate():799`](Apps/api/src/modules/activation/activation.service.ts#L799)). Every subscriber handler's body is therefore scheduled with **`setImmediate`** and returns instantly. The emitting service resumes on the next line no matter what the notifier goes on to do. |
| **2** | **An async-aware wrapper on every handler** | The gateway's [`safe()`](Apps/api/src/common/realtime/realtime-gateway.ts#L10-L16) is `try { fn() } catch` — **sync-only**, and it would not catch a rejected promise. The subscriber defines its own `safeAsync(fn, evt)` that `await`s inside `try/catch` and logs through Pino. **`safe` must not be imported or copied.** (§0.4 caveat 2.) |
| **3** | **`dispatch` never throws** | §9.2 step 6. Even reaching layer 2 requires a bug in recipient resolution or template rendering, not a provider failure. |

```ts
// common/notifications/notification.subscribers.ts
const safeAsync = (evt: string, fn: () => Promise<void>) => (): void => {
  // setImmediate: the domain service's eventBus.emit() returns before any of this runs, so
  // a Telegram outage cannot unwind into the activation's request/response cycle (R5).
  setImmediate(() => {
    void fn().catch((err) => logger.error({ err, evt }, 'Notification subscriber failed'));
  });
};

export const initNotificationSubscribers = (svc: INotificationService, prisma: PrismaClient): void => {
  eventBus.on('activation:created', (p) => safeAsync('activation:created', () => onActivationCreated(svc, prisma, p))());
  … one line per subscribed event …
};
```

**Verification during the manual pass:** temporarily `throw new Error('boom')` at the top of
`onActivationCreated`, submit an activation, and confirm the client's submit still returns 200 and
the pending pool still updates. Then remove it. (v2-decisions R5 asks for exactly this test.)

### 9.4 Resend

`resend(notificationId)`:

1. Load the row. Missing → `NotFoundError`.
2. `stat !== FAILED` → `ConflictError('Only failed notifications can be resent')`. A `SENT` row is
   history, not a template; re-sending it would silently duplicate a message.
3. **Re-resolve the recipient's *current* address** from `recipientRole` + `recipientProfileId`
   (not the stored `recipientAddress`). If the profile is no longer linked →
   `BadRequestError('This recipient is no longer linked to Telegram')` and **no attempt is made**.
   Re-resolving is what makes "unlink, fix the link, resend" work; the stored snapshot stays as the
   audit record of what was tried the first time.
4. `attempts: { increment: 1 }`, send, then `SENT`+`sentAt` or `FAILED`+`error`, updating
   `recipientAddress` to the address actually used.
5. **`body` is never re-rendered.** Resend delivers the byte-identical original message. Re-running
   the template against today's data would send something the log row does not record — and could
   leak a *newer* password than the event was about.

### 9.5 Pino hygiene

[`logger.ts`](Apps/api/src/common/config/logger.ts)'s `redact` list gains
`'botToken'`, `'telegramLinkToken'`, `'token'`, `'req.headers["x-telegram-bot-api-secret-token"]'`.

Independently of redaction, by construction: `Notification.body` is never logged; the provider
never logs its request URL (which embeds the bot token, §2.5); the stubs log the address only; and
`consumeLinkToken` logs the outcome and the profile id, never the token.

---

## 10. Env vars and the `.env.example` diff

### 10.1 `env.ts`

```ts
const envSchema = z
  .object({
    … existing 10 keys unchanged …

    // ── Notifications (Set 6) ──────────────────────────────────────────────
    // z.stringbool(), NOT z.coerce.boolean(): coerce.boolean("false") === true, so the
    // string "false" from a .env file would silently ENABLE the subsystem.
    NOTIFICATIONS_ENABLED: z.stringbool().default(false),
    TELEGRAM_MODE: z.enum(['polling', 'webhook']).default('polling'),
    TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),
    TELEGRAM_BOT_USERNAME: z.string().min(1).optional(),
    TELEGRAM_WEBHOOK_SECRET: z.string().min(32).optional(),
  })
  // Conditionally required, so NOTIFICATIONS_ENABLED=false boots with no dummy values
  // (manual test 1) while an enabled-but-misconfigured boot CRASHES, as the brief requires.
  .superRefine((v, ctx) => {
    if (!v.NOTIFICATIONS_ENABLED) return;
    if (!v.TELEGRAM_BOT_TOKEN)
      ctx.addIssue({ code: 'custom', path: ['TELEGRAM_BOT_TOKEN'],
        message: 'Required when NOTIFICATIONS_ENABLED=true' });
    if (!v.TELEGRAM_BOT_USERNAME)
      ctx.addIssue({ code: 'custom', path: ['TELEGRAM_BOT_USERNAME'],
        message: 'Required when NOTIFICATIONS_ENABLED=true (the deep link embeds it)' });
    if (v.TELEGRAM_MODE === 'webhook' && !v.TELEGRAM_WEBHOOK_SECRET)
      ctx.addIssue({ code: 'custom', path: ['TELEGRAM_WEBHOOK_SECRET'],
        message: 'Required when TELEGRAM_MODE=webhook' });
  });
```

The existing `safeParse` → `console.error(z.treeifyError(...))` → `process.exit(1)` block needs no
change; `superRefine` issues flow through it and print with their paths.

**Type-narrowing note for execution.** After `superRefine`, `env.TELEGRAM_BOT_TOKEN` is still
`string | undefined` to `tsc` — a refinement narrows values, not types. Narrow **once**, at the
composition root (§2.7), where `NOTIFICATIONS_ENABLED` is already being branched on. Do **not**
sprinkle `!` assertions through the provider and the poller. (Considered and rejected: a
`.transform()` producing a discriminated `env.notifications` union. It gives tsc-level proof but
changes `env`'s established flat shape, which every other file in the app relies on — too much
churn for one narrowing.)

### 10.2 `.env.example` diff

```diff
 # Realtime (WebSocket)
 WS_PATH=/socket.io
+
+# ── Notifications (Set 6) ─────────────────────────────────────────────────────
+# Master switch. false => no bus subscribers, no poller, no webhook route, no sends.
+# Nothing else in this block is required while this is false.
+NOTIFICATIONS_ENABLED=false
+
+# Telegram intake transport.
+#   polling  — local development. No public URL or tunnel needed.
+#   webhook  — the deployed instance. Requires TELEGRAM_WEBHOOK_SECRET.
+TELEGRAM_MODE=polling
+
+# !! USE A SEPARATE BOT PER ENVIRONMENT !!
+# Telegram allows ONE intake method per bot token. Starting the poller calls deleteWebhook,
+# which would TAKE DOWN a production webhook sharing the same token; and setting a webhook
+# makes polling fail with HTTP 409. Create two bots with @BotFather:
+#   @SetVisionDevBot  -> local, TELEGRAM_MODE=polling
+#   @SetVisionBot     -> deployed, TELEGRAM_MODE=webhook
+# From @BotFather: /newbot, then /token. Required when NOTIFICATIONS_ENABLED=true.
+TELEGRAM_BOT_TOKEN=
+
+# Bot username WITHOUT the leading @. The deep link the admin panel shows is built as
+# https://t.me/<TELEGRAM_BOT_USERNAME>?start=<token>. Required when NOTIFICATIONS_ENABLED=true.
+TELEGRAM_BOT_USERNAME=SetVisionDevBot
+
+# Shared secret for the webhook endpoint, min 32 chars. Telegram echoes it back in the
+# X-Telegram-Bot-Api-Secret-Token header on every update; the API rejects anything else.
+# Register it with:
+#   curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
+#     -d "url=https://<host>/api/v1/telegram/webhook" -d "secret_token=<THIS VALUE>"
+# Required ONLY when TELEGRAM_MODE=webhook. Generate: openssl rand -hex 32
+TELEGRAM_WEBHOOK_SECRET=
```

### 10.3 What you must set for the manual pass

| Var | Value |
|---|---|
| `NOTIFICATIONS_ENABLED` | `false` for test 1, then `true` |
| `TELEGRAM_MODE` | `polling` |
| `TELEGRAM_BOT_TOKEN` | from @BotFather `/newbot` → `/token` for the **dev** bot |
| `TELEGRAM_BOT_USERNAME` | that bot's username, no `@` |
| `TELEGRAM_WEBHOOK_SECRET` | leave empty in polling mode |

No frontend env var is added — the deep link is assembled server-side (§8.1).

---

## 11. Admin UI

### 11.1 Contract additions

```ts
// Apps/contract/src/modules/telegram/telegram.routes.ts
export const TELEGRAM_ROUTES = {
  BASE: '/telegram',
  WEBHOOK: '/webhook',                    // unauthenticated, header-guarded (§4)
  LINK_STATUS: '/link/:role/:profileId',  // GET    admin
  GENERATE_TOKEN: '/link/:role/:profileId', // POST  admin
  UNLINK: '/link/:role/:profileId',       // DELETE admin
} as const;

// Apps/contract/src/modules/notification/notification.routes.ts
export const NOTIFICATION_ROUTES = {
  BASE: '/notifications',
  GET_ALL: '/',        // admin
  RESEND: '/:id/resend', // admin
} as const;
```

`WEBHOOK` is declared **before** the `/link/:role/:profileId` params so the static path wins —
the existing precedence convention ([`card.routes.ts`](Apps/api/src/modules/card/card.routes.ts#L29-L34)).

| Contract file | Contents |
|---|---|
| `modules/telegram/telegram.routes.ts` | above |
| `modules/telegram/telegram.dtos.ts` | `TelegramLinkStatusDTO` = `{ role, profileId, name, isLinked: boolean, linkedAt: string \| null, hasPendingToken: boolean, deepLink: string \| null }` |
| `modules/telegram/telegram.query.ts` | `TelegramLinkParamsSchema` = `{ role: z.enum(UserRole), profileId: z.uuid() }` |
| `modules/telegram/index.ts` | barrel (no `command.ts`, no `events.ts`, no `enums.ts` — contract-rules §2: create a file only if the module needs it) |
| `modules/notification/notification.enums.ts` | `NotificationChannel`, `NotificationStat`, `NotificationType` — byte-identical to the Prisma enums |
| `modules/notification/notification.routes.ts` | above |
| `modules/notification/notification.query.ts` | `GetNotificationsQuerySchema` = `{ page, limit, stat?, channel?, type?, recipientRole?, search?, dateFrom?, dateTo? }` (mirrors `GetLogsQuerySchema`) · `NotificationIdParamsSchema` |
| `modules/notification/notification.dtos.ts` | `NotificationResponseSchema` → `NotificationDTO` = `{ id, channel, type, stat, recipientRole, recipientProfileId, recipientName, body, error, attempts, sentAt, createdAt }` · `PaginatedNotificationsSchema = paginated(...)` |
| `modules/notification/index.ts` | barrel |
| `src/index.ts` | `+ export * from './modules/telegram'; + export * from './modules/notification';` |
| `modules/activation/activation.enums.ts` + `activation.events.ts` | `ClientUpdateKind` + the `kind` field (§5.5) |
| `modules/log/log.enums.ts` | `+ GENERATE_TELEGRAM_TOKEN`, `+ UNLINK_TELEGRAM` |

`recipientAddress` (the chat id) is **not** on `NotificationDTO`: an admin log page has no use for a
raw chat id, and it is contact data. `recipientName` + `recipientRole` identify the recipient.

⚠️ Neither new contract module imports from another contract module except `common/types`
(`paginated`) and `user.enums` (`UserRole`) — both already imported across the package with no
cycle. Run `madge --circular src` after (R13).

### 11.2 Token / link management — one component, three mounting points

`Apps/web/src/components/sections/admin/TelegramLinkPanel.tsx`, props
`{ role: UserRole; profileId: string; name: string }`:

- **Not linked, no token:** a *"Generate Telegram link"* button.
- **Not linked, token pending:** the deep link in a read-only input + a copy-to-clipboard button
  (`sonner` toast on copy), a *"Regenerate"* action, and a hint that the link works once.
- **Linked:** a success badge *"Linked · {formatDateTime(linkedAt)}"*, an *"Unlink"* action behind
  an `AlertDialog`, and a *"Generate a new link"* action carrying the §8.4 warning that completing
  it replaces the current chat.
- Loading → `Skeleton` in place of the panel body; error → inline `NotFoundState`. The card frame
  survives both (front-end-rules §4).

| Mounting point | File | Placement |
|---|---|---|
| Activator | [`ActivatorDetailPage.tsx`](Apps/web/src/pages/admin/activators/ActivatorDetailPage.tsx) | a card beside `ProfileCard` |
| Distributor | [`DistributorDetailPage.tsx`](Apps/web/src/pages/admin/distributors/DistributorDetailPage.tsx) | a card beside `DistributorProfileCard` |
| Admin | [`AdminAccountsTab.tsx`](Apps/web/src/pages/admin/settings/components/AdminAccountsTab.tsx) | admins have **no detail page** — a row action in [`AdminActionsMenu.tsx`](Apps/web/src/pages/admin/settings/components/AdminActionsMenu.tsx) opens the panel in a `Dialog` |

The settings page keeps its 4 tabs — **no fifth tab.** Telegram linking is a per-user attribute, so
it belongs on the user, next to the existing account actions (`CreateDistributorAccountModal`,
`GeneratedPasswordPanel`), not in a global settings tab. (Sets 9 and 10 will take the tab count to
6; the file's "Exactly 4 tabs" comment is theirs to update, not this set's.)

### 11.3 The notification log page

`/admin/notifications`, modelled on [`pages/admin/logs/`](Apps/web/src/pages/admin/logs/):

| File | Purpose |
|---|---|
| `pages/admin/notifications/NotificationsPage.tsx` | `PageHeader` + filters + `DataTable` + `SimplePagination` |
| `pages/admin/notifications/components/NotificationsFilters.tsx` | status · channel · type · recipient role · search · date range · clear (mirrors `LogsFilters.tsx`) |
| `pages/admin/notifications/components/NotificationsTable.tsx` | `DataTable` + `TableSkeleton` / `EmptyState` / `NotFoundState`; mobile card rows |
| `pages/admin/notifications/components/NotificationBodyDialog.tsx` | full body + error, read-only (bodies are multi-line and too long for a cell) |

Columns: created (`formatDateTime` + `formatRelativeTime` title, the `LogsTable.tsx:49-50` idiom) ·
recipient (name + role badge) · type badge · channel · status badge · attempts · body preview
(truncated, click → dialog) · error. Row action **Resend**, rendered **only** when
`stat === FAILED`, behind an `AlertDialog`.

| File | Change |
|---|---|
| `services/notifications.service.ts` | **new** — `getNotifications(query)`, `resendNotification(id)` |
| `services/telegram-link.service.ts` | **new** — `getLinkStatus`, `generateLinkToken`, `unlinkTelegram` |
| `hooks/useNotifications.ts` | **new** — `useNotifications(query)`, `useResendNotification()` (invalidates `qk.notifications.all()`) |
| `hooks/useTelegramLink.ts` | **new** — `useTelegramLink(role, profileId)`, `useGenerateTelegramToken()`, `useUnlinkTelegram()` (both invalidate `qk.telegramLink.detail(role, profileId)`) |
| [`query-keys.ts`](Apps/web/src/lib/query-keys.ts) | `+ notifications: { all(), list(query) }`, `+ telegramLink: { detail(role, profileId) }` |
| [`nav-links.ts`](Apps/web/src/config/nav-links.ts) | `ADMIN_NAV_LINKS` += `{ to: '/admin/notifications', labelKey: 'admin.shell.nav.notifications', icon: BellRing }` — a leaf next to Logs |
| [`App.tsx`](Apps/web/src/App.tsx) | 1 lazy import + 1 route under `<AdminGuard>`, alongside `/admin/logs` ([:270](Apps/web/src/App.tsx#L270)) |
| [`StatusBadge.tsx`](Apps/web/src/components/shared/StatusBadge.tsx) | `NOTIFICATION_STAT_TONE: Record<NotificationStat, BadgeTone>` + `NotificationStatusBadge`. ⚠️ **`LOG_ACTION_TONE` must gain `GENERATE_TELEGRAM_TOKEN` and `UNLINK_TELEGRAM`** — that `Record<LogActionType, …>` is exhaustive and `tsc` fails without them (the same trap Sets 4 and 5 both hit). |
| [`translations.json`](Apps/web/src/config/translations.json) | §11.4 |

`NotificationBell.tsx` is **not** touched. It is a chrome-only dropdown by an earlier decision
([its own comment](Apps/web/src/components/layout/NotificationBell.tsx#L13-L15)), and Set 4 Q2
deferred a real feed. Turning `Notification` rows into an in-app bell feed is a coherent later
feature — it is not in this set's scope, and conflating "Telegram outbox" with "in-app bell" would
be the wrong data model for it.

### 11.4 Translation keys

Flat `key → { en, fr, ar: "" }`, `ar` present and empty (front-end-rules §6.B). No inline strings.

| Group | ~Count |
|---|---|
| `enums.notificationStat.{PENDING,SENT,FAILED}` | 3 |
| `enums.notificationChannel.{TELEGRAM,EMAIL,WHATSAPP}` | 3 |
| `enums.notificationType.*` (10 values) | 10 |
| `enums.logActionType.{GENERATE_TELEGRAM_TOKEN,UNLINK_TELEGRAM}` | 2 |
| `admin.shell.nav.notifications` | 1 |
| `admin.notifications.{title,subtitle,table.*,filters.*,resend*,body*,empty*,error*}` | ~30 |
| `admin.telegram.{title,notLinked,linked,linkedAt,generate,regenerate,copy,copied,unlink,unlinkConfirm*,replaceWarning,singleUseHint,error*}` | ~18 |
| `common.roles.{ADMIN,ACTIVATOR,DISTRIBUTOR}` | reuse if present, else 3 |

**≈ 70 new keys.** Telegram **message** copy is *not* in `translations.json` — it is backend French
(§6.1). Only the admin UI chrome is translated.

---

## 12. Split recommendation

**Split it. Two parts, and the boundary is unusually clean.**

This is the largest set in the programme: 1 migration (3 enums, 1 table, 9 columns), 2 new contract
modules + 3 modified, ~15 new backend files across `common/notifications/` and 2 new modules, edits
to 3 existing backend services, the first long-running process in the app, the first
unauthenticated write endpoint, ~14 new frontend files and ~70 translation keys. Landing that as
one reviewable step means the external-I/O half (Telegram, polling, webhook secrets, two bots) and
the fan-out half (9 subscriptions, 10 templates, an audited allowlist) are debugged
simultaneously — and when a message does not arrive you will not know which half is at fault.

### Split point: **the delivery pipe is proven by the link confirmation, before any subscriber exists.**

**Set 6a — Delivery pipe + linking.** No bus subscriber, no domain event handling.

- Prisma: the whole migration `add_telegram_notifications` (§1). One migration, not two.
- Contract: `modules/telegram/`, `modules/notification/`, `log.enums.ts` additions.
  **Not** the `ClientUpdateKind` change (§5.5) — that belongs with its consumer.
- Env: all five vars + the `.env.example` block (§10).
- `common/notifications/`: types, provider interface, registry, `TelegramProvider`, both stubs,
  `NotificationService` (full row lifecycle + `resend`), `telegram.api.ts`, `telegram.link.ts`,
  `telegram.intake.ts`, `telegram.poller.ts`, `index.ts`.
  **`notification.templates.ts` with exactly one template: `TELEGRAM_LINKED`.**
  **No `notification.subscribers.ts`, no `notification.recipients.ts`.**
- `server.ts`: `initNotifications()` + poller start/stop.
- `modules/telegram/`: webhook (secret middleware, rate limiter, conditional mount) + link
  management (generate / status / unlink + the two `Log` action types).
- `modules/notification/`: the log list + resend endpoint.
- Frontend: `TelegramLinkPanel` at all three mounting points, the notification log page, resend.

**Why 6a is independently verifiable end to end:** the `/start` confirmation message *is* a full
exercise of the pipe — intake handler → token match → `NotificationService.dispatch` →
`TemplateS` render → `TelegramProvider` → a real `Notification` row → the admin log page. Manual
tests **1, 2, 3, 4, 11** and **10** all pass on 6a alone. Point the bot token at nonsense and you
get a `FAILED` row with the error and a working Resend — test 2's failure path, proven before a
single domain event is wired.

**Set 6b — Subscribers, matrix, templates.**

- The five missing Set 4 emits (§5.1, U1).
- The `ClientUpdateKind` contract change + its two emit sites (§5.5, U2).
- `common/utils/duration.utils.ts` (§6.3).
- `notification.recipients.ts` (the 4 queries), `notification.subscribers.ts` (`safeAsync`,
  `setImmediate`, the 8 subscriptions), the remaining **9 templates** + `FIELD_LABEL_FR` + the
  `STATUS_TEMPLATE` map (§5.4.2).
- `schema.prisma` comment update naming Telegram as an exposure surface (§6.5).
- Manual tests **5, 6, 7, 8, 9** + the deliberate-throw R5 check.

**Rough weight:** 6a ≈ 55% (it carries the migration, both HTTP modules and most of the frontend),
6b ≈ 45% (concentrated, no schema, no new frontend page). 6b's frontend surface is **zero** —
another reason the seam is in the right place.

**Sequencing note:** 6a's migration adds every column 6b needs, so 6b is schema-free and its
`tsc`/`madge` failure modes are confined to the contract change. If you want to stop after 6a, the
system is coherent: users can link, admins can see the log, and nothing sends unsolicited traffic.

---

## 13. Open questions and manual test checklist

### 13.1 Open questions

Q1–Q4 in the U-table at the top are already decided. These are the ones still live; every one has
a recommendation the plan is written to, so none blocks execution.

| # | Question | Recommendation |
|---|---|---|
| **Q5** | Persist the polling offset across restarts (a new table), or keep it in memory? | **In memory** (§7.3). Telegram retains unconfirmed updates 24 h and the intake handler is idempotent; a table would persist one integer for a dev-only transport and would not remove the need for idempotency. |
| **Q6** | Is `PROCESSING` really a no-message row (§5.4.2)? It is the only U3 row where I actively suppress a transition. | **Keep it suppressed.** Both sites already emit `activation:client-updated`, whose templates carry the actual new values including password and OTP. A "status is now PROCESSING" message beside them is strictly less informative duplicate noise. Say the word and it becomes a 10th template. |
| **Q7** | Store `telegramLinkToken` in the clear, or hash it with show-once display? | **Clear** (§8.3). The admin must be able to re-display the deep link after a reload; a leaked token grants notification delivery only, and unlink revokes it. Contained change if you disagree. |
| **Q8** | Auto-unlink on a Telegram 403 ("bot was blocked by the user")? | **No.** A `FAILED` row with the error is honest; silently clearing someone's link because one send bounced is a surprising side effect with no audit trail. Revisit if blocked bots become common. |
| **Q9** | One chat ↔ one profile: clear a duplicate `chatId` within the same model on link (§3.2 step 3), but allow the same chat across models? | **Yes to both.** Two profiles of the same role sharing a chat is a mistake; one person legitimately being both an admin and a distributor should receive both streams. |
| **Q10** | Should the bot reply to text that is not `/start`? | **Silence** (§3.1 step 3). A chatty bot becomes an unowned support channel and a free oracle for probing. Bare `/start` with no token does get a short help line. |
| **Q11** | 6a's `TELEGRAM_LINKED` message is `NotificationType`'s only member until 6b. Enum-complete now or grow it? | **Declare all 10 values in 6a's migration**, implement one template. Avoids a second `ALTER TYPE` migration in 6b, and `Record<NotificationType, Renderer>` being exhaustive means 6a must still stub the other nine — recommend 6a's nine placeholders `throw new Error('template not implemented')`, since they are unreachable without subscribers and a silent empty body would be worse. |
| **Q12** | Return the assembled `deepLink` from the API, or expose `TELEGRAM_BOT_USERNAME` to the frontend as a `VITE_*` var? | **Return the deep link** (§8.1). No new frontend env var, one source of truth, and the token never has to be re-assembled client-side. |
| **Q13** | `Apps/api` has **no eslint config** (§0.9). CLAUDE.md's DoD requires "eslint clean in all three". | Not introduced by this set — flagged in Set 1's report and unresolved since. Recommend `tsc --noEmit` + `madge` for api, eslint for contract and web, and keep reporting the gap. Fixing it is a tooling task, not a Set 6 task. |
| **Q14** | Frozen tests that will break: `Apps/api/test/unit/env.spec.ts` (5 new keys + a `superRefine`), `test/unit/common/events/event-bus.spec.ts` (the `kind` field), `test/contract/routes.conformance.spec.ts` and `Apps/contract/src/__tests__/conformance.test.ts` (2 new modules), plus any activation-event test. | Expected and out of scope per CLAUDE.md. **Do not touch them.** List them in the execution report for the Set 14 catch-up. |

### 13.2 Manual test checklist

Preconditions: an admin session, an activator with a login, a distributor with a login, plus one
**account-less** distributor (test 14). A dev bot from @BotFather. `Apps/api/.env` per §10.3. Both
dev servers running.

**Part 6a — the pipe**

1. **Inert when disabled.** `NOTIFICATIONS_ENABLED=false`, restart the API. Boot logs
   *"Notifications disabled — subscribers and poller not started"*. Submit an activation, approve
   an order request: everything works, **zero** `Notification` rows
   (`SELECT count(*) FROM "Notification"` = 0), no Telegram traffic, no poller log lines.
2. **Missing config crashes the boot.** `NOTIFICATIONS_ENABLED=true` with `TELEGRAM_BOT_TOKEN`
   empty → the API **exits 1** naming `TELEGRAM_BOT_TOKEN`. Set `TELEGRAM_MODE=webhook` with no
   secret → exits 1 naming `TELEGRAM_WEBHOOK_SECRET`. Then fill both and boot cleanly.
3. **Generate → link → confirmation.** `TELEGRAM_MODE=polling`. Admin → the activator's detail page
   → Generate. Copy the `t.me/…?start=…` link, open it in Telegram, press START. Within ~2 s the
   bot replies *"✅ Notifications activées"*. In the DB: `telegramChatId` set, `telegramLinkedAt`
   set, **`telegramLinkToken` NULL**. The panel now shows Linked + the timestamp without a reload
   after refetch. A `TELEGRAM_LINKED` row appears `SENT` at `/admin/notifications`.
4. **A used link is dead.** Press START on the same link again (or re-open it) → *"Ce lien est
   invalide ou a déjà été utilisé."* No DB change, no new `Notification` row.
5. **Bad bot token → FAILED, and nothing else breaks.** Set `TELEGRAM_BOT_TOKEN` to garbage,
   restart. Generate a token for a *second* user and tap it. The link still succeeds (chat id
   stored — the DB write does not depend on the send), and the confirmation becomes a **FAILED**
   row at `/admin/notifications` carrying the Telegram error text. The poller logs a 401 and
   stops itself (§7.4) rather than looping.
6. **Resend.** Restore the good token, restart, then Resend that FAILED row. `attempts` goes 1 → 2,
   the row flips to `SENT` with a `sentAt`, and the message actually arrives. Try Resend on a
   `SENT` row → **409**, no second message.
7. **Unlink is complete.** Unlink that user. All three columns are NULL. Generate again → a *new*
   token; the previous link stays dead.
8. **Poller lifecycle.** With polling running, `Ctrl+C` the API. It logs *"Telegram poller
   stopped"* and **exits within a second or two** — it does not hang for the 30-second long poll.
   Restart, tap a fresh link, confirm it still works (offset replay is harmless, §7.3).
9. **Two instances → one loud 409.** Start a second API process on a different `PORT`, same bot
   token. One logs the 409 **once** naming another consumer or a registered webhook, and backs off
   to 60 s. Neither hot-loops. Kill the second; the first recovers on its next poll.
10. **Webhook security, without a tunnel.** `TELEGRAM_MODE=webhook`, restart.
    - `curl -X POST localhost:3000/api/v1/telegram/webhook -H 'Content-Type: application/json' -d '{}'`
      → **401** `AUTH_UNAUTHORIZED`.
    - With `-H 'X-Telegram-Bot-Api-Secret-Token: wrong'` → **401**, byte-identical body.
    - With the correct secret and a hand-written `/start <valid token>` update body → **200** and
      the link completes, proving both transports share one handler.
    - Switch back to `TELEGRAM_MODE=polling`, restart, and confirm the same `curl` with the
      correct secret now **404s** — the route does not exist in polling mode.

**Part 6b — the matrix**

11. **New activation → every linked activator, once each.** Link two activators, leave a third
    unlinked. A client submits. Both linked activators get exactly **one** message with the masked
    key and the plan; the unlinked one gets nothing and **has no `Notification` row**.
12. **Correction carries the password in the clear.** Activator takes it, flags Username +
    Password as wrong. The client corrects both. The **assigned activator only** receives a message
    listing both new values, **the password fully visible, unmasked, unescaped** — byte-identical
    to what `ActiveRequestCard` shows. No other activator receives anything.
13. **OTP arrives unhidden.** Activator requests additional info (OTP). Client submits `483920`.
    The assigned activator receives a message containing **`483920`** in the clear, using the OTP
    template — not the correction template. (This is what U2's `kind` buys.)
14. **A password with Markdown metacharacters survives.** Repeat test 12 with a password like
    `A_b*c[d]e~f` and confirm every character arrives intact. This is the `parse_mode` check
    (§2.5) — the single most likely silent-corruption bug in the set.
15. **Status changes: only the three that should fire.** As the assigned activator, walk one
    activation through take → flag → (client corrects) → request OTP → (client answers) →
    activate. You should receive: two client-updated messages (tests 12, 13) and **one**
    completion message with duration and commission. **No** message for take, flag, request-OTP,
    or the bare `PROCESSING` transitions (§5.4.2). Count them.
16. **FREEZE → admins only.** Freeze an activation. Every linked, enabled admin gets one message
    with the card key, client, activator name, elapsed time and reason. The activator who froze it
    gets **nothing**. A *disabled* admin gets nothing.
17. **Admin resolves a freeze → exactly one message.** Admin activates the frozen activation. The
    activator gets **one** message saying an admin completed it, with the commission — **not two**
    (this is §5.4.1's no-double-send check). Repeat with cancel-by-admin: one message, no
    commission line.
18. **Order request submitted → admins.** Distributor submits. Every linked admin gets one message
    with store name, plan and quantity. **This is the path Set 4 never emitted** — it must now also
    make the admin's `/admin/distributors/order-requests` table update live.
19. **Order created → that distributor only.** Approve the request, then create an order linked to
    it. The owning distributor gets **one** message with the order number and card count. Then move
    the order `IN_DELIVERY` and `DELIVERED`: **no further Telegram messages** (row 8's filter — only
    `APPROVED → PENDING_DELIVERY` fires). Approving alone, earlier, sent nothing either.
20. **Revocation: submitted → admins, approved → distributor.** Distributor submits a revocation
    (needs an `ACTIVATION_FAILED` card, per Set 5's setup). Admins get one message each with the
    card key and reason. Admin approves → the distributor gets one message with the card key and
    the admin note. Admin *rejects* a second one → the distributor gets **nothing** (row 9 filters
    on `APPROVED`).
21. **An account-less distributor still receives.** Take a distributor with **no login**
    (`userId IS NULL`), generate a Telegram token for them, link it, and run test 19. They receive
    the order message. This is §1.1's whole justification, and it is the test that proves the fields
    are on the right model.
22. **A send failure cannot fail the request.** Temporarily `throw new Error('boom')` at the top of
    the `activation:created` handler. A client submits: the submit still returns **200**, the
    pending pool still updates for every activator, and one *"Notification subscriber failed"*
    error line appears. Remove the throw. (v2-decisions R5.)
23. **Secret hygiene sweep.** After all of the above:
    - `SELECT body FROM "Notification"` — contains client passwords and OTPs (**expected**);
      contains **no** argon2/bcrypt hash (`$argon2`/`$2b$`), **no** `eyJ` JWT prefix, **no** 64-char
      hex link token.
    - `SELECT "actionDescription" FROM "Log" WHERE "actionType" IN ('GENERATE_TELEGRAM_TOKEN','UNLINK_TELEGRAM')`
      — names the person, contains **no token**.
    - `grep -Ei '\$argon2|\$2b\$|eyJ[A-Za-z0-9_-]{10,}|[0-9a-f]{64}' <api log>` — no hits. Also
      confirm the bot token never appears in a log line.
24. **Reconnect / restart under load.** Restart the API while an activation is mid-flight. Nothing
    is double-sent (each event fires once per process), the poller resumes, and the realtime UI
    re-fetches on reconnect as before.

---

## 14. Definition of done

- [ ] `npx tsc --noEmit` clean in `Apps/contract`, `Apps/api`, `Apps/web` (production code;
      frozen-test drift from Q14 listed in the report, not fixed)
- [ ] eslint clean in `Apps/contract` and `Apps/web`; the missing `Apps/api` config re-flagged (Q13)
- [ ] `npx madge --circular src` clean in `Apps/contract` — the two new modules must not create a
      cycle (R13)
- [ ] Migration `…_add_telegram_notifications` created **and** applied; `prisma migrate reset` +
      all four seed scripts still run
- [ ] **`grep -rn "telegramLinkToken" Apps/api/src`** shows a token *match* in exactly one place
      (`common/notifications/telegram.link.ts`), plus generate/clear in
      `modules/telegram/telegram.service.ts`. Neither `telegram.poller.ts` nor
      `telegram.controller.ts` contains any token logic (§3.3)
- [ ] **`grep -rn "notificationService\|NotificationService" Apps/api/src`** shows callers only in
      `common/notifications/` (subscribers, intake) and `modules/{telegram,notification}/`
      controllers. **No domain service, no controller, no mapper, and the realtime gateway do not
      call a provider or the service directly**
- [ ] `notification.subscribers.ts` uses its **own** async-aware wrapper — it does not import or
      copy the gateway's sync `safe()` (§0.4, §9.3)
- [ ] `TelegramProvider` sets **no `parse_mode`** and the file says why (§2.5)
- [ ] Both stub providers satisfy `NotificationProvider`, no-op without throwing, and are
      unreachable — `channel` is never derived from env, a payload, or user input (§2.4)
- [ ] All five env vars are in the `env.ts` Zod schema **and** `.env.example`; an enabled-but-
      unconfigured boot **exits 1** (test 2)
- [ ] With `NOTIFICATIONS_ENABLED=false`: no bus listener, no poller, no webhook route, zero
      `Notification` rows (test 1)
- [ ] The poller starts inside `httpServer.listen`'s callback and `stopTelegramPoller()` is the
      **first** statement in `shutdown()` (§7.1, test 8)
- [ ] All five Set 4 emits added and individually confirmed in the report (§5.1)
- [ ] All 11 `activation:status-changed` sites accounted for in the report against §5.4.2 — 3
      sending, 8 documented as no-message
- [ ] `schema.prisma`'s `ActivationInformation.value` comment names Telegram as an exposure surface
      (§6.5)
- [ ] Pino `redact` extended; test 23's sweep clean
- [ ] No test file created, modified, deleted or run — verified with `git status`
- [ ] No magic strings; every new user-facing web string is a translation key with `en`, `fr`,
      `ar: ""`. Telegram copy is backend French and deliberately not in `translations.json` (§6.1)
- [ ] Report written to `Docs/Stage-04-fix/results/set-6/execution-report.md`
- [ ] **Stop. Do not start Set 7.**
