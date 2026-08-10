# Set 6a — Telegram notifications: delivery pipe + linking — Execution Report

**Implements:** `Docs/Stage-04-fix/plan/set-6-plan.md`, part **6a only** (§12 split), as approved.
**Not implemented in this session (Set 6b):** `notification.subscribers.ts`,
`notification.recipients.ts`, the five missing Set 4 emits (§5.1), the `ClientUpdateKind`
contract change (§5.5), the nine remaining templates (§6), `common/utils/duration.utils.ts`
(§6.3), and the `schema.prisma` comment update naming Telegram as an exposure surface (§6.5).
**Migration:** `20260810095708_add_telegram_notifications`
**Branch:** `version-02-01`

---

## 1. Files created / modified, grouped by package

### `Apps/api` (Prisma + backend)

**Prisma**
- `prisma/schema.prisma` — modified: `telegramChatId`/`telegramLinkToken`/`telegramLinkedAt` on
  `Admin`, `Activator`, `Distributor`; new `Notification` model; new enums
  `NotificationChannel`, `NotificationStat`, `NotificationType` (all 10 values, per Q11); two
  new `LogActionType` values `GENERATE_TELEGRAM_TOKEN`, `UNLINK_TELEGRAM`.
- `prisma/migrations/20260810095708_add_telegram_notifications/migration.sql` — new.

**`common/notifications/` — new subsystem (§2.1, mirrors `common/realtime/`)**
- `notification.types.ts` — `NotificationRecipient`, `NotificationRequest`,
  `NotificationProvider`, `INotificationService`.
- `notification.service.ts` — `NotificationService`: `dispatch`, `dispatchAll`, `resend`,
  private `attemptSend`. Never throws from `dispatch`/`dispatchAll` (§9.2–9.3).
- `notification.mapper.ts` — `NotificationMapper.toDTO`, shared by the common service's
  `resend` and `modules/notification`'s list service.
- `notification.templates.ts` — `TEMPLATES: Record<NotificationType, …>`. Only
  `TELEGRAM_LINKED` is implemented; the other nine throw `"…not implemented until Set 6b"` by
  design (Q11) — they are unreachable in 6a (no subscribers exist yet).
- `providers/registry.ts`, `providers/telegram.provider.ts`, `providers/email.provider.ts`,
  `providers/whatsapp.provider.ts` — the exhaustive `ProviderRegistry`, the real Telegram
  sender (plain `fetch`, deliberately no `parse_mode` — see §2.2), and two non-throwing stubs.
- `telegram.api.ts` — `TelegramUpdateSchema` (third-party wire shape, not in the contract),
  `getUpdates`, `deleteWebhook`, `TelegramApiError`.
- `telegram.link.ts` — `consumeLinkToken`: **the only place in the codebase that matches a
  `telegramLinkToken` and writes a `telegramChatId`.**
- `telegram.intake.ts` — `handleTelegramUpdate`: **the one shared intake handler** both
  transports call.
- `telegram.poller.ts` — `startTelegramPoller`/`stopTelegramPoller`, the `AbortController`
  lifecycle, exponential backoff, 401/409/429 handling.
- `index.ts` — composition root: `notificationService` singleton, `initNotifications()`,
  `resolveTelegramPollerDeps()`.

**`modules/telegram/` — new (webhook + link management)**
- `telegram.middleware.ts` — `requireWebhookSecret` (constant-time compare via
  `crypto.timingSafeEqual`), `webhookRateLimiter`.
- `telegram.interface.ts`, `telegram.mapper.ts`, `telegram.service.ts`,
  `telegram.controller.ts`, `telegram.routes.ts`.

**`modules/notification/` — new (admin log list + resend)**
- `notification.interface.ts`, `notification.service.ts` (thin — delegates `resend` to the
  common singleton), `notification.controller.ts`, `notification.routes.ts`.

**Modified elsewhere in `api`**
- `src/env.ts` — 5 new vars + a `superRefine` making them conditionally required.
- `.env.example` — the 5-var block + the two-bot-token warning comment.
- `src/common/config/logger.ts` — `redact` extended (`botToken`, `telegramLinkToken`, `token`,
  the webhook secret header).
- `src/modules/index.ts` — 2 new router mounts.
- `src/server.ts` — `initNotifications()` before `main()`; poller start inside
  `httpServer.listen`'s callback; `stopTelegramPoller()` as the **first** statement in
  `shutdown()`.

### `Apps/contract`

- `src/modules/telegram/{routes,query,dtos,index}.ts` — new module. `TELEGRAM_ROUTES`,
  `TelegramLinkParamsSchema`, `TelegramLinkStatusDTO`. No `command.ts`/`enums.ts`/`events.ts` —
  none needed (contract-rules §2).
- `src/modules/notification/{enums,routes,query,dtos,index}.ts` — new module.
  `NotificationChannel`/`NotificationStat`/`NotificationType`, `NOTIFICATION_ROUTES`,
  `GetNotificationsQuerySchema`, `NotificationDTO`.
- `src/modules/log/log.enums.ts` — `+ GENERATE_TELEGRAM_TOKEN`, `+ UNLINK_TELEGRAM`.
- `src/index.ts` — barrel exports for both new modules.

### `Apps/web`

**New**
- `src/services/telegram-link.service.ts`, `src/services/notifications.service.ts`.
- `src/hooks/useTelegramLink.ts`, `src/hooks/useNotifications.ts`.
- `src/components/sections/admin/TelegramLinkPanel.tsx` — mounted at all three points (§11.2).
- `src/pages/admin/notifications/NotificationsPage.tsx` +
  `components/{NotificationsFilters,NotificationsTable,NotificationBodyDialog}.tsx`.

**Modified**
- `src/lib/query-keys.ts` — `+ notifications`, `+ telegramLink` families.
- `src/components/shared/StatusBadge.tsx` — `+ NotificationStatusBadge`; `LOG_ACTION_TONE`
  extended with the 2 new `LogActionType` values (the `Record` is exhaustive — `tsc` would
  otherwise fail, same trap Sets 4/5 hit).
- `src/config/nav-links.ts` — `+ /admin/notifications` leaf.
- `src/App.tsx` — 1 lazy import + 1 route, alongside `/admin/logs`.
- `src/pages/admin/activators/ActivatorDetailPage.tsx` — `+ <TelegramLinkPanel
  role={ACTIVATOR}>` after `StatsRevenueGrid`.
- `src/pages/admin/distributors/DistributorDetailPage.tsx` — `+ <TelegramLinkPanel
  role={DISTRIBUTOR}>` after `DistributorStatsGrid` — unconditional, so an account-less
  distributor (no `userId`) still gets a working panel (§1.1's whole point).
- `src/pages/admin/settings/components/AdminActionsMenu.tsx` — `+ onRequestTelegram` menu item.
- `src/pages/admin/settings/components/AdminAccountsTab.tsx` — `+ telegramRow` state, a
  `Dialog` hosting `<TelegramLinkPanel role={ADMIN}>` (admins have no detail page, so this is
  the mounting point per plan §11.2).
- `src/config/translations.json` — ~65 new keys: `enums.logActionType.*` (2),
  `enums.notificationStat/Channel/Type.*` (16), `common.roles.*` (3), `admin.shell.nav.notifications`
  (1), `admin.notifications.*` (~20), `admin.telegram.*` (~13).

---

## 2. Deliberate deviations from the plan text (all within 6a's intent)

1. **`handleTelegramUpdate` takes 4 params, not 2.** The plan's illustrative signature was
   `(prisma, raw)`. I added `notificationService` and `botToken` as explicit parameters instead
   of importing the `common/notifications` singleton from inside `telegram.intake.ts`, because
   that import would create a cycle: `index.ts` → `telegram.poller.ts` → `telegram.intake.ts` →
   `index.ts`. Both transports (`telegram.poller.ts`, `telegram.controller.ts`) already hold
   these values from their own composition, so threading them costs nothing and keeps the
   module graph acyclic (confirmed by `madge --circular`, zero cycles). The token-matching
   logic itself is still written exactly once, in `telegram.link.ts`.
2. **Prisma enum values are passed directly to Prisma `data:` objects without a
   `PrismaX as PrismaX` cast**, unlike the `PrismaOrderRequestStat`-style casts used in Set
   4/5. Investigated and confirmed: this Prisma version (6.19.3) generates enums as
   `const X = { A: 'A', ... } as const` + a derived string-literal-union type, not TypeScript
   `enum`. Contract enum members (nominal, string-branded) are structurally assignable into
   that plain union without a cast; the reverse direction (Prisma read value → contract type)
   still needs `as ContractEnum`, which I did wherever a Prisma row feeds a DTO or a comparison
   against a contract enum. `tsc --noEmit` is clean either way; I kept a few explicit
   `PrismaNotificationStat`/`PrismaUserRole` imports in `notification.service.ts` for write-path
   clarity even though they turned out not to be strictly required, to keep the intent legible.
3. **`generateOpaqueToken` reused unchanged** for the link token (§8.1), including its retry
   wrapper in `telegram.service.ts` — as specified.

No other deviations. Everything else (file layout, the `consumeLinkToken` single-use claim via
predicate-guarded `updateMany`, the one-chat-per-profile-per-model clearing, the webhook secret
header + rate limiter + conditional mount, the poller's `AbortController` lifecycle and 401/409
backoff handling, the `NOTIFICATIONS_ENABLED=false` full inertness, the `deepLink` assembled
server-side) matches the plan section-for-section.

---

## 3. Definition of done

| Item | Status |
|---|---|
| `npx tsc --noEmit` — `Apps/contract` | ✅ clean |
| `npx tsc --noEmit` — `Apps/api` | ✅ clean in `src/`. Frozen-test drift only (below) — not modified, per CLAUDE.md |
| `npx tsc --noEmit` — `Apps/web` (app + test configs) | ✅ clean in `src/`. One pre-existing frozen-test error (`formatTime` export, documented in the Set 2/3 reports) — not introduced by this set |
| `eslint` — `Apps/contract` | ✅ clean |
| `eslint` — `Apps/web` | ✅ clean on every file this set touched (ran `eslint --fix` scoped to exactly those files, then re-verified with a plain `eslint` pass — 0 errors). Pre-existing prettier debt in ~10 unrelated files (`LandingPage.tsx`, `wilaya-geometry.ts`, etc.) is untouched and out of scope. |
| `eslint` — `Apps/api` | No tooling installed — pre-existing gap, first flagged in Set 1's report, still unresolved (plan §13.1 Q13). `tsc` + `madge` stand in. |
| `npx madge --circular src` — `Apps/contract` | ✅ clean |
| `npx madge --circular` — `Apps/api` (informational; CLAUDE.md only requires it for contract) | ✅ clean, incl. the new `common/notifications`/`modules/telegram`/`modules/notification` graph |
| `common/` never imports `modules/` | ✅ verified with `grep -rn "modules/" src/common/` — zero hits |
| Migration created and applied | ✅ `20260810095708_add_telegram_notifications`, applied via `prisma migrate deploy` (see note below) |
| No test file touched | ✅ verified with `git status` — only `test/data/*.factory.ts` and `test/unit/**` show **compiler drift**, not edits; nothing under `test/`/`tests/` was created, modified, or run |
| No magic strings | ✅ routes from contract constants; enums from contract; no inline strings in new JSX (`translations.json`) |
| Report + manual test checklist | this file |

**Migration note:** `prisma migrate dev` requires an interactive TTY and this session is
non-interactive, so the migration was generated via `prisma migrate diff --from-url … --to-schema-datamodel …`
(diffing the live dev DB against the updated schema), written into a
timestamp-named migration directory by hand, and applied with `prisma migrate deploy` —
functionally identical output to what `migrate dev` would have produced (verified the SQL
contains exactly the expected `CREATE TYPE`/`ALTER TYPE ADD VALUE`/`ALTER TABLE`/`CREATE TABLE`/
`CREATE INDEX` statements, no unrelated drift). `prisma generate` was run after.

**Frozen-test drift, confirmed pre-existing/expected and NOT touched:**
`test/data/activator.factory.ts`, `test/data/admin.factory.ts` (new required Telegram fields on
the Prisma types), `test/unit/modules/log/log.mapper.spec.ts`,
`test/unit/modules/activation/activation.mapper.spec.ts`,
`test/unit/modules/order/order.service.spec.ts`, `test/unit/modules/payment/payment.mapper.spec.ts`
(all Set 4/5-era signature drift, some newly surfaced by the schema change). None modified,
per CLAUDE.md's test freeze — flagged here for the Set 14 catch-up.

**Seed impact:** none. Every new column is nullable; `Notification` has no FK into seeded data.
`load_wilaya`, `load_commission_durations`, `create_admin_account`, `load_mock_data` all still
run unchanged (not re-run this session — no schema-required-field gap to necessitate it).

---

## 4. What I actually exercised (smoke tests run this session)

Since the deployed dev environment has no live Telegram bot credentials, I could not run the
full manual checklist myself. I did run these, live, against the built server, to catch wiring
bugs before handing this back:

1. **Boot with `NOTIFICATIONS_ENABLED` unset (defaults false):** server starts cleanly, logs
   *"Notifications disabled — subscribers and poller not started"*, `/health` and normal traffic
   unaffected.
2. **Boot with `NOTIFICATIONS_ENABLED=true` and no bot token/username:** process **exits 1**,
   naming exactly `TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_USERNAME` as missing.
3. **Boot with `TELEGRAM_MODE=webhook` and no webhook secret:** exits 1, naming
   `TELEGRAM_WEBHOOK_SECRET`.
4. **Boot with `NOTIFICATIONS_ENABLED=true`, `TELEGRAM_MODE=polling`, a syntactically-valid but
   fake bot token:** server boots, poller starts, `deleteWebhook` is attempted, `getUpdates`
   returns Telegram's real HTTP 401, and the poller logs `FATAL … stopping poller` and stops
   itself cleanly — no crash, no infinite retry loop.
5. **Webhook secret guard, `TELEGRAM_MODE=webhook`, live `curl`:**
   - No header → **401**.
   - Wrong header value → **401**, byte-identical response to the no-header case.
   - Correct header + `{"update_id":1}` (no `message`) → **200** `{"received":true}`, proving
     the route, the middleware, and the intake handler's early-return path all work end to end.
6. **Same server restarted with `NOTIFICATIONS_ENABLED=false`:** `POST /telegram/webhook` →
   **404** — the route genuinely does not exist outside webhook mode, not just guarded.

All five processes were cleanly terminated after each check; nothing was left bound to
port 3000 or 5173.

**Not exercised (no live bot):** the actual `/start <token>` deep-link flow end to end (token
match → `telegramChatId` write → confirmation message delivered), resend against a real FAILED
row, the admin UI screens in a browser, and the poller's `SIGTERM` abort against a genuinely
in-flight 30-second long poll (my fake token 401s in well under a second, so it never reached a
real long-poll state to abort). These are exactly what the manual checklist below is for.

---

## 5. Env vars you must set for the manual pass

| Var | Value for local testing |
|---|---|
| `NOTIFICATIONS_ENABLED` | `false` first (test 1), then `true` |
| `TELEGRAM_MODE` | `polling` |
| `TELEGRAM_BOT_TOKEN` | Create a **dev** bot via @BotFather (`/newbot` → `/token`). **Do not reuse your deployed bot's token** — starting the poller calls `deleteWebhook`, which would take down a production webhook sharing the same token. |
| `TELEGRAM_BOT_USERNAME` | That dev bot's username, no leading `@` |
| `TELEGRAM_WEBHOOK_SECRET` | Leave empty in polling mode |

No frontend `VITE_*` var is needed — the deep link is assembled server-side.

---

## 6. Manual test checklist (6a scope only)

Preconditions: an admin session; an activator with a login; a distributor with a login; and one
**account-less** distributor (no `userId`) for test 8. A dev Telegram bot from @BotFather.
`Apps/api/.env` set per §5. Both dev servers running.

1. **Inert when disabled.** `NOTIFICATIONS_ENABLED=false`, restart the API. Boot log reads
   *"Notifications disabled…"*. Confirm `SELECT count(*) FROM "Notification"` = 0 and no
   `GET /admin/notifications` errors (empty table renders fine).
2. **Missing config crashes the boot.** Set `NOTIFICATIONS_ENABLED=true` with
   `TELEGRAM_BOT_TOKEN` empty → API exits 1 naming it. Fill it, leave
   `TELEGRAM_BOT_USERNAME` empty → exits 1 naming that. Set `TELEGRAM_MODE=webhook` with no
   secret → exits 1 naming `TELEGRAM_WEBHOOK_SECRET`. Fill everything correctly → boots clean.
3. **Generate → link → confirmation arrives.** `TELEGRAM_MODE=polling`. Open an activator's
   admin detail page → the new Telegram card → **Generate**. Copy the `t.me/…?start=…` link
   (via the copy button), open it in Telegram, press **START**. Within ~2s the bot replies
   *"✅ Notifications activées"*. Confirm in the DB: `telegramChatId` set, `telegramLinkedAt`
   set, **`telegramLinkToken` is NULL**. The panel flips to "Linked" without a manual reload
   (refetch on mutation success). `/admin/notifications` shows one `TELEGRAM_LINKED` row, `SENT`.
4. **A used link is dead.** Re-open the same `t.me/…` link (or send `/start <same token>`
   again) → *"Ce lien est invalide ou a déjà été utilisé."* No DB change, no new
   `Notification` row.
5. **Bad bot token → FAILED row, link still completes.** Set `TELEGRAM_BOT_TOKEN` to garbage,
   restart. Generate a token for a **second** user, tap the link. The **link still succeeds**
   (the DB write happens before the send attempt) but the confirmation message shows as a
   **FAILED** row on `/admin/notifications`, with the Telegram error text visible. Check the API
   log: the poller should log a `FATAL` 401 and stop itself (confirmed in this session's smoke
   test — verify it doesn't hot-loop).
6. **Resend.** Restore the good token, restart. Resend the FAILED row from test 5.
   `attempts` increments, the row flips to `SENT`, the message actually arrives in Telegram this
   time. Try Resend on an already-`SENT` row → **409** (no double-send).
7. **Unlink is complete.** Unlink the user from test 3. All three DB columns are `NULL`.
   Generate again → a genuinely new token (the old dead link stays dead).
8. **Account-less distributor still links.** Take a distributor with **no login**
   (`userId IS NULL`) — the panel on their detail page must still work exactly like a
   distributor with a login. This is the concrete proof that putting the fields on the profile
   row (not `User`) was the right call.
9. **Poller lifecycle.** With polling active and a **real, valid** token (so a genuine
   30-second long poll is in flight), `Ctrl+C` the API. It should log *"Telegram poller
   stopped"* and exit within a second or two — **not** hang for up to 30s. (This is the one
   thing I could not verify myself with a fake token, since a 401 stops the poller almost
   instantly — see §4.)
10. **Two pollers → one loud 409.** Start a second API instance on a different `PORT`, same bot
    token. One of the two should log a single 409 conflict warning (not a spam loop) and back
    off to the 60s cap; the other keeps working.
11. **Webhook mode, secret guard (already smoke-tested by me — re-verify from your machine).**
    `TELEGRAM_MODE=webhook`, restart. `curl` with no header → 401. Wrong header → 401 (same
    shape). Correct header → 200. Switch back to `polling`, restart, same `curl` → **404**.
12. **Admin log page usability.** `/admin/notifications`: filter by status/channel/type/role,
    date range, search by recipient name; click a truncated body to open the full-text dialog;
    confirm passwords/OTPs (once 6b lands) will be visible there unmasked — for 6a, confirm the
    `TELEGRAM_LINKED` body renders correctly and nothing crashes on an empty table.
13. **Secret hygiene sweep.** `SELECT body, error FROM "Notification"` and the API's own log
    output — confirm no bot token, no `telegramLinkToken`, no JWT, no password hash ever appears
    anywhere. (The redact list and the "never log the request URL" rule in `TelegramProvider`
    should make this structurally true; worth eyeballing once with real traffic.)

---

## 7. Open items carried to Set 6b (not gaps in 6a — explicitly out of scope per the split)

- The five missing Set 4 emits on `CardOrderRequestService` (plan §5.1) — **6a does not touch
  Set 4's files at all.**
- `notification.subscribers.ts`, `notification.recipients.ts`, and the 9 remaining templates.
- The `ClientUpdateKind` contract addition on `activation:client-updated` (plan §5.5).
- `common/utils/duration.utils.ts` (only needed once templates that render a duration exist).
- The `schema.prisma` comment update naming Telegram as an exposure surface for
  `ActivationInformation.value` (plan §6.5) — there is nothing to expose yet in 6a, since no
  subscriber reads that table.

**Stop. This is 6a only — do not start 6b without confirming this report first.**
