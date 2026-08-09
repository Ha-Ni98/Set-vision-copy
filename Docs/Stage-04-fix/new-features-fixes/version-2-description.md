# SetVision v2 — Implementation Sets

15 sets (0–14). Each is a Claude Code session or part of one — see **Session grouping** at the end. Manual test between every set. No test files touched anywhere.

---

## How to run a session

1. Paste the **Plan prompt** → Claude audits the code and writes `Docs/Stage-04-fix/plan/set-N-plan.md`. No production code.
2. **You read the plan**, answer its open questions, edit it if needed.
3. Paste the **Execute prompt** → Claude implements the approved plan.
4. `tsc` + eslint must be clean. You manually test. You commit.
5. Next set.

Splitting plan/execute matters because seven sets change the Prisma schema and most change the contract — cheap to argue with a markdown file, expensive to argue with a migration.

---

## Standing rules — put this in `CLAUDE.md` before Set 0

```md
# SetVision — working rules for Claude Code

## Rules docs — read the relevant ones before touching a layer
- Docs/Stage-01-Contract/contract-rules.md   → before touching Apps/contract
- Docs/Stage-02-Backend/back-end-rules.md    → before touching Apps/api
- Docs/Stage-03-Frontend/front-end-rules.md  → before touching Apps/web
These are binding, not suggestions. If a rule blocks the task, stop and ask.

## Build order inside every set
prisma schema → contract → backend → frontend. Never the reverse.

## TESTS ARE FROZEN — hard constraint
- Do NOT create, modify, delete, move, or run any test file or test config.
- Frozen: **/*.test.ts, **/*.test.tsx, **/*.spec.ts, tests/, __tests__/,
  vitest.config.*, MSW handlers/mocks, docker-compose.test.yml, test setup files.
- Existing tests WILL break as the contract changes. That is expected and out of
  scope. Do not "fix" them. Do not run `npm test`, `test:unit`, `test:int`, or
  `validate` (validate runs the conformance test — run tsc, lint and madge separately).
- If a change seems to require a test change, note it in the report and move on.

## The database holds throwaway test data
Destructive migrations are fine. `prisma migrate reset` + reseed is fine. Prefer a clean
schema over a backward-compatible one — no compatibility shims, no dead columns, no
data-preserving migration gymnastics. Reseed with the existing scripts (load_wilaya,
load_commission_durations, create_admin_account, load_mock_data) and tell me if a seed
script needs updating for a new required field.

## Definition of done for a set
- `npx tsc --noEmit` clean in contract, api, and web
- eslint clean in all three
- `npx madge --circular src` clean in Apps/contract
- prisma migration created and applied (if the set has one)
- No test file changed (verify with `git status`)
- No magic strings in the changed file, except when said it explicitly
- Stop and report. Do not start the next set.

## Non-negotiables (from the rules docs, repeated because they get forgotten)
- Contract has ZERO logic. Types are always `z.infer` of a schema. DTO dates are `z.iso.datetime()`.
- No magic strings. Routes come from contract route constants, on both api and web.
- Backend: every response through `sendSuccess`; errors thrown as AppError subclasses,
  never `res.status().json()` in a service; no `console.*` (use the Pino logger);
  no DB calls in middleware except `requireAuth({ checkDB: true })`;
  `common/` never imports from `modules/`.
- Backend module = the 6-file pattern (mapper / interface / service / controller / routes / index).
- Realtime and notifications: services publish typed events to the event bus. Only
  `realtime-gateway.ts` calls Socket.IO; only `notification.subscribers.ts` calls the
  notification service. Activator rooms are keyed by `Activator.id`, not `User.id`.
- Frontend: Component → Hook → Service, one axios instance, no `useEffect` fetching,
  no inline strings in JSX (translations.json, `ar` key present as ""), layout survives
  loading and error states.
- Money is Prisma Decimal. Never a JS float. Currency is DZD.
- Do NOT install a new library without asking first.

## Reporting
End every execution session with: files created/modified (grouped by package), the migration name,
open questions, the execution report and a numbered manual-test checklist for me under `Docs/Stage-04-fix/results/[name]`.
```

---

## Confirmed decisions

Settled. Set 0 verifies them against the real code; it does not reopen them.

| # | Decision |
|---|---|
| **D1** | **Order requests and revocation requests are distributor-only.** The activator portal is complete and out of scope for v2 except the duration-format sweep. The new portal is the distributor portal. |
| **D2** | A `Distributor` **may** have a login. `Distributor.userId String? @unique`; inventory-only distributors with no account keep working everywhere. `UserRole` += `DISTRIBUTOR`. |
| **D3** | The client's Snapchat **password and OTP are not system secrets** — the client changes the password after activation. They go in the admin activation detail DTO directly, no separate secrets route, no reveal gate. They still never appear in a log description, a Pino line, or a Telegram message. (Contract rule §5 still applies in full to `User.password`, refresh-token hashes, and JWTs — that rule is about *our* credentials.) |
| **D4** | Where the duration formatter lives is Claude's call after auditing the codebase. One spec, applied everywhere. Contract stays logic-free, so a contract-level implementation is not an option. |
| **D5** | New `CardOrderRequest` model holding `orderId String? @unique`. The existing `Order` model is **not modified**. The link is set and cleared from the add-order form's "order request" selector, which lists approved, unlinked requests (and may be left empty). |
| **D6** | **Telegram only.** `NotificationService` interface + DI, with `TelegramProvider` implemented and `EmailProvider` / `WhatsAppProvider` as empty stubs behind the same interface. Called from `notification.subscribers.ts` off the event bus — never inline in a domain service — so a Telegram outage cannot fail an activation. |
| **D7** | Telegram linking uses **deep link + one-time token**. `telegramChatId`, `telegramLinkToken` (unique), `telegramLinkedAt` — all nullable — on `Admin`, `Activator`, `Distributor`. An admin generates/regenerates the token; the user taps `t.me/<bot>?start=<token>`; the bot matches it and stores the `chat_id`. |
| **D8** | Support phone + WhatsApp for the client-form banner come from the **existing header/footer contact config**, not a new env var. |
| **D9** | **Revenue.** Cash in = `Order.orderPrice` for completed orders (`deliverPrice` excluded). Cash out = `Activation.activationCost` + `Activation.activationPrice` (the activator commission). |
| **D10** | **Activation cost.** New nullable `Activation.activationCost` (default `0`). On completion (`ACTIVATED` / `ACTIVATED_BY_ADMIN`) it is stamped from a new `SubscriptionPlanCost` table. Admin settings tab: plan × cost, `-` when null, edit action. Admin activation table: `activationCost` column + edit action, enabled **only** for completed activations. The stamp is a snapshot — later plan-cost edits never rewrite history. |
| **D11** | **Order request status mirrors the linked order.** `OrderRequestStat` = `PENDING \| APPROVED \| REJECTED \| CANCELLED` **plus every `OrderStat` value** (`PENDING_DELIVERY`, `IN_DELIVERY`, `DELIVERED`, `RETURNED`). Admin sets approve/reject on the request; once an order is linked, every subsequent order status change propagates to the request in the same transaction. Unlinking reverts the request to `APPROVED`. |
| **D12** | **Telegram transport is env-switched.** `TELEGRAM_MODE=polling\|webhook`. Polling for local manual testing (no tunnel), webhook for the deployed instance. One provider, one intake handler, two transports. |
| **D13** | **Activation email pool.** New `ActivationEmail` table: `subscriptionPlanId` (FK), `email`, `nbOfActivation`, `lastUsedAt`, `createdAt`, soft-delete fields. Unique on `[subscriptionPlanId, email]` — the same address may serve several plans with separate counters. Admin settings tab: add, list (plan, email, usage count), delete (soft). When an activator or admin sets an activation to `ACTIVATED` / `ACTIVATED_BY_ADMIN`, they pick from the pool **for that activation's plan**, ordered oldest-used first, or type a free address. A free address matching an active pool row (case-insensitive) increments that row. `Activation.activationEmail` **stays a plain string — no FK**. |

### Notification matrix (D6)

| Event | Admin | Activator | Distributor |
|---|---|---|---|
| New activation created | — | **all** activators | — |
| Activation status changed / information updated | — | the activator **in charge** | — |
| Activation `FREEZE` | ✓ | — | — |
| Order request submitted | ✓ | — | — |
| Revocation request submitted | ✓ | — | — |
| `Order` actually created | — | — | ✓ |
| Revocation request approved | — | — | ✓ |

---

## Assumptions still open — confirm or override in Set 0

| # | Assumption | Why it's a guess |
|---|---|---|
| **A1** | Telegram message copy is **French**. | Algeria-facing internal users. Per-user language would cost a `language` column on the profile rows. |
| **A2** | The one-time Telegram token is **single-use** — cleared on link, regenerable by an admin, no expiry. | Expiry is easy to add later; unlimited reuse would let a leaked token hijack notifications. |
| **A3** | Cash-in = `OrderStat.DELIVERED` anchored on `Order.completedAt`; cash-out anchored on `Activation.completedAt`. | `RETURNED` clearly isn't revenue, and the date anchor changes every number on the chart. |
| **A4** | In the activation-email picker, **never-used addresses (`lastUsedAt` null) sort first**, then oldest-used → newest-used. | Your rule is "oldest used first". A brand-new address has no usage date; treating it as oldest gets it into rotation immediately. |
| **A5** | A free-typed address matches **active pool rows only**. If it matches a soft-deleted row, nothing is incremented and no row is restored. | A deleted address is hidden everywhere; silently resurrecting its counter would be surprising. |
| **A6** | Re-adding an address that was soft-deleted for that plan **restores the existing row** (keeping its historical count) rather than failing on the unique constraint. | The `[subscriptionPlanId, email]` unique index makes a plain insert fail. Restore-in-place is the least surprising resolution; the alternative is resetting the counter to zero. |

---

## Set map

| Set | Title | Layers | Depends on |
|---|---|---|---|
| 0 | Recon & decision record | docs only | — |
| 1 | Distributor role & distributor accounts | schema, contract, api, web | 0 |
| 2 | Duration formatting + full admin activation detail | contract, api, web | 1 |
| 3 | Admin correction of activation info + audit log | schema (enum), contract, api, web | 2 |
| 4 | Card order requests | schema, contract, api, web | 1 |
| 5 | Card revocation requests | schema, contract, api, web | 1, 4 |
| 6 | Telegram notifications | schema, contract, api, web | 3, 4, 5 |
| 7 | Distributor portal | contract, api, web | 1, 4, 5 |
| 8 | Lot creation card picker | contract, api, web | — (1) |
| 9 | Activation cost & plan cost settings | schema, contract, api, web | 1 |
| 10 | Activation email pool | schema, contract, api, web | 9 |
| 11 | Revenue dashboard & charts | contract, api, web | 9 |
| 12 | Client form support banner + client correction | contract, api, web | 3 |
| 13 | Consistency & responsiveness pass | web mostly | all |
| 14 | *(optional)* Test catch-up | tests only | all |

---

# Set 0 — Recon & decision record

**Touches:** documentation only. Zero code.

### Plan prompt

```
Read CLAUDE.md and the three rules docs in Docs/.

This is a recon session. Write NO production code, NO schema changes, NO test changes.
Your only output is one markdown file.

Audit the repo and answer, with file paths as evidence:

1. Modules — every backend module in Apps/api/src/modules and every contract module. For
   each: route constants exposed and roles guarding them.
2. Auth — every site where UserRole guards something (backend requireAuth calls, frontend
   route guards, nav rendering, login redirect). This becomes the Set 1 checklist.
3. Distributor — how Distributor records are created and managed today. Confirm there is no
   login concept and no userId.
4. Activator portal — what already exists (dashboard, activation list, filters, detail). I
   believe it is feature-complete; confirm, and list anything from the v2 requirements
   genuinely missing there.
5. Activation — the full read path: which DTOs exist, and where ActivationInformation /
   WrongInformation / AdditionalInformation values are exposed and to whom.
6. Activation completion — EVERY code path that sets an activation to ACTIVATED or
   ACTIVATED_BY_ADMIN, and for each, where activationEmail is written today. Sets 9 and 10
   both hook these paths, so this inventory must be exhaustive.
7. Realtime + events — the three namespaces, every room key, every event published to the
   bus, and where the gateway subscribes. I need a second independent consumer (notifications)
   alongside the gateway; confirm the bus supports that.
8. Order lifecycle — every code path that changes OrderStat, since order status must propagate
   to a linked order request (D11).
9. Audit log — every call site that writes to Log, with its LogActionType. State which of
   these are NOT logged today: activation info changes, order requests, revocations, status
   changes, role assignment, cost changes, activation email management.
10. Money — every money field and its meaning in the current flows. Specifically confirm that
    Activation.activationPrice IS the activator's commission, verified against the code that
    writes it, and say plainly if it is something else.
11. Contact info — where the support phone and WhatsApp number live for the public header/footer.
12. Duration/date rendering — every place a date, time or elapsed duration is rendered, admin
    and activator. Then RECOMMEND where the shared duration formatter should live (contract is
    not an option — it must stay logic-free).
13. Settings — does an admin settings page with tabs already exist? Sets 9, 10 and the plan-cost
    tab all need one.
14. Test surface — list the test directories/files so we know what is frozen. Do not open them
    beyond listing.

Then write Docs/Stage-04-fix/plan/v2-decisions.md containing:
- Everything above, condensed.
- A "Confirmed decisions" section: restate D1–D13 (pasted below) and mark each CONFIRMED or
  CONFLICTS WITH CODE, with evidence. These are settled — if one conflicts with the codebase,
  describe the conflict, do not silently redesign it.
- An "Open assumptions" section: A1–A6, with your recommendation on each.
- A "Risk register": where v2 collides with an existing rule or design decision.

[paste the D1–D13 and A1–A6 tables here]
```

**Execute prompt:** none — plan-only. Answer the open assumptions inside the file, then start Set 1.

---

# Set 1 — Distributor role & distributor accounts

**Depends on:** 0 · **Touches:** prisma, contract, api, web

**Scope**
- `UserRole` += `DISTRIBUTOR`; `Distributor.userId String? @unique` + relation; `User.distributor Distributor?`.
- `LogActionType` += account link/unlink actions.
- Admin UI: create a login for a distributor, unlink it — mirroring how activator accounts are created today.
- **Audit every existing guard** so `DISTRIBUTOR` gains access to nothing by accident. This is the real work of the set.
- Frontend: role-aware guard, nav, post-login redirect, empty `/portal` shell.
- Realtime: `/distributors` namespace, rooms keyed by `Distributor.id`. May have no events yet.

**Manual test after**
1. Existing admin and activator logins see exactly what they saw before.
2. Give a distributor a login → they sign in, land on the portal shell.
3. That user opens an admin URL directly → blocked, not a blank page.
4. That user hits an activator-only API route via curl → 403.
5. Unlink → they can no longer sign in.
6. Inventory-only distributors (no account) still work in orders, cards, stats.
7. Log rows for link and unlink.

### Plan prompt

```
Read CLAUDE.md, Docs/Stage-04-fix/plan/v2-decisions.md, and the three rules docs.

Plan Set 1: a DISTRIBUTOR role and optional distributor login accounts. WRITE NO CODE.

Audit first:
- Every backend route and its requireAuth roles array.
- Every frontend protected route, guard component, and nav-link config.
- Exactly how admins create activator user accounts — the distributor flow mirrors it, it does
  not invent a second pattern.
- The realtime gateway's namespace/room setup.

Then write Docs/Stage-04-fix/plan/set-1-plan.md with:
1. Exact prisma diff (enum value, new field, relation, indexes) and migration name.
2. Contract diff: files changed in modules/user and modules/distributor, new commands, route
   constants, DTO fields.
3. Backend: a TABLE of every existing route × current roles × roles after this set. This is the
   deliverable I care most about — a route silently opening to DISTRIBUTOR is the main risk here.
4. What happens to a Distributor with no userId at every read site — it must keep working.
5. Frontend: guard changes, nav per role, login redirect, the empty /portal shell, translation keys.
6. Realtime: the /distributors namespace and room key.
7. Open questions and manual test checklist.

Scope discipline: no order requests, no revocation requests, no dashboard content, no Telegram
fields. The portal is an empty shell in this set.
```

### Execute prompt

```
Implement Docs/Stage-04-fix/plan/set-1-plan.md exactly. Order: prisma → contract → backend → frontend.

Reminders for this set:
- Work the route × roles table one row at a time. Every route ends with an explicit roles array;
  no route relies on a default.
- The contract UserRole enum and the prisma UserRole enum stay byte-identical.
- Distributor.userId is nullable. Check every place Distributor is read; the account-less case
  must still work.
- Reuse the existing activator-account creation flow; do not build a parallel one.
- Link and unlink both write to Log via the existing audit path.
- The DB is test data: reset and reseed rather than writing a defensive migration.

Constraints: tests frozen. No test commands.
Done = tsc + eslint + madge clean, migration applied, no test file touched.
Report changed files, the migration name, and my manual test checklist.
```

---

# Set 2 — Duration formatting + full admin activation detail

**Depends on:** 1 · **Touches:** contract, api, web (no schema change)

**Scope**
- Duration formatter, one spec: `< 60min → mm:ss`, `< 24h → hh:mm:ss`, `≥ 24h → dd:hh:mm:ss`. Location is Claude's call (D4).
- Admin activation detail showing everything: client info, card → set → lot → distributor chain, assigned activator, full `ActivationStep` timeline with timestamps, every information row **including PASSWORD and OTP** (D3).
- Durations returned as **integer seconds**; human strings produced at the render edge.
- Apply the formatter to admin **and activator** time stats — the one place the activator portal is in scope.

**Manual test after**
1. >24h → `dd:hh:mm:ss`; <1h → `mm:ss`; ~3h → `hh:mm:ss`.
2. In-progress activation with null `completedAt` → no crash, no `NaN:NaN`.
3. Detail view shows password and OTP where they exist.
4. Activator hitting the admin detail route → 403.
5. Timeline order matches `ActivationStep.createdAt`.
6. Activator portal duration columns use the same format.

### Plan prompt

```
Read CLAUDE.md, Docs/Stage-04-fix/plan/v2-decisions.md, and the three rules docs.

Plan Set 2: human-readable duration formatting everywhere, and a complete admin activation
detail view including the client's PASSWORD and OTP values. WRITE NO CODE.

Note on D3: the client's Snapchat password and OTP are NOT system secrets — the client changes
the password after activation. They belong in the admin detail DTO. Contract rule §5 still
applies in full to User.password, refresh-token hashes, and JWTs. Do not build a separate
"secrets" route; do not add a reveal gate.

Audit first:
- Every existing activation DTO and every mapper that produces one.
- Where information/wrong-information/additional-information values are currently exposed.
- Every place a duration or elapsed time is rendered, in admin AND the activator portal.
- The existing activation statistics endpoints and their units.

Then write Docs/Stage-04-fix/plan/set-2-plan.md with:
1. The duration spec as a table of input → output covering 0, 59s, exactly 3600s, exactly
   86400s, null, negative, >99 days. Every implementation must satisfy this table.
2. Your recommendation for WHERE the formatter lives, with reasoning, and whether one or two
   implementations are needed. Contract must stay logic-free.
3. Contract: the detail DTO built field by field, its route constant, and a one-line note in
   the DTO file explaining why password/OTP are present so a future reader doesn't "fix" it.
4. Backend: mapper and service changes, the ADMIN guard, and the include/select plan — this DTO
   joins several tables and must not be an N+1.
5. Frontend: detail view structure, where the formatter applies, translation keys.
6. Every endpoint changing its return unit to seconds, and every UI site that must change.
7. Open questions and manual test checklist.

Scope discipline: read-only. Admin editing is Set 3.
```

### Execute prompt

```
Implement Docs/Stage-04-fix/plan/set-2-plan.md exactly. Order: contract → backend → frontend.

Reminders for this set:
- Every formatter implementation satisfies the format table identically. Null and negative are
  handled explicitly — no crashes, no "NaN:NaN".
- Backend returns integer seconds. All formatting happens at the render edge.
- Password and OTP appear in the admin detail response only. They must NOT reach a log
  description, a Pino line, or any other DTO.
- No inline strings in JSX; every new label in translations.json with en, fr, ar:"".
- Replace the duration rendering in the activator portal too — same formatter, no second
  implementation.

Constraints: tests frozen. No test commands.
Done = tsc + eslint + madge clean, no test file touched.
Report changed files and my manual test checklist.
```

---

# Set 3 — Admin correction of activation info + audit log

**Depends on:** 2 · **Touches:** prisma (one enum value), contract, api, web

**Scope**
- Admin edits activation account information (any `AccountInformation` key), client fields, `activationEmail`.
- Every modification writes a Log row with before → after. For PASSWORD and OTP: log **that** the field changed, not the value.
- `LogActionType` += `CHANGE_ACTIVATION_INFORMATION`.
- New event `activation:information-updated` → gateway pushes to the activator room and the client's activation room. Set 6 subscribes the notifier to the same event.
- Admin audit-log view filterable by activation.

**Manual test after**
1. Edit a username on a PENDING activation → activator dashboard updates live.
2. Edit while in progress → no duplicate `ActivationInformation` rows.
3. Log row shows old → new for a normal field.
4. Edit PASSWORD → log records the change, not the value.
5. Activator hitting the edit endpoint → 403.
6. Bad email → field-level error, nothing written.

### Plan prompt

```
Read CLAUDE.md, Docs/Stage-04-fix/plan/v2-decisions.md, Docs/Stage-04-fix/plan/set-2-plan.md, and the rules docs.

Plan Set 3: admin correction of activation information, with full audit logging and a realtime
push. WRITE NO CODE.

Audit first:
- How ActivationInformation rows are written during the normal flow (which service, upsert or
  create, how the [activationId, accountInform] unique constraint is respected).
- The existing audit-log write path and its helper signature.
- The existing activation events and how the gateway maps them to rooms.

Then write Docs/Stage-04-fix/plan/set-3-plan.md with:
1. The exact editable field set, and per field: validation rule, and whether its VALUE may
   appear in a log description. PASSWORD and OTP: value never logged, only the fact of change.
2. Contract: update command schema, route constant, the new event type.
3. Backend: service logic (upsert against the unique constraint), transaction boundary (data
   write + log write must not half-apply), event publish, guard.
4. Gateway: which rooms receive the event, and what the client portal sees versus the activator.
5. Frontend: admin edit UI (inline vs dialog — recommend one), hook and its invalidations,
   translation keys.
6. A note for Set 6: the exact event name and payload the notifier will subscribe to.
7. Open questions and manual test checklist.

Scope discipline: admin-side correction only. Client self-correction is Set 12.
```

### Execute prompt

```
Implement Docs/Stage-04-fix/plan/set-3-plan.md exactly. Order: prisma → contract → backend → frontend.

Reminders for this set:
- Data write + log write in one transaction. A correction that logs nothing, or a log with no
  correction, is a bug.
- Upsert against [activationId, accountInform]; no duplicate information rows.
- Never put a password or OTP value in a log description or a Pino line.
- The service publishes to the event bus; only realtime-gateway.ts touches Socket.IO.
- The client room must not receive sensitive field values.
- Mutation hooks invalidate their read queries; never hand-patch the cache.

Constraints: tests frozen. No test commands.
Done = tsc + eslint + madge clean, migration applied, no test file touched.
Report changed files, the migration name, and my manual test checklist.
```

---

# Set 4 — Card order requests (distributor)

**Depends on:** 1 · **Touches:** prisma, contract, api, web

**Scope**
- `CardOrderRequest`: `distributorId`, `subscriptionPlanId`, `nbOfCards`, `note?`, `stat`, `adminNote?`, `reviewedByUserId?`, `orderId String? @unique`, `createdAt`, `reviewedAt?`.
- `OrderRequestStat` (D11): `PENDING | APPROVED | REJECTED | CANCELLED | PENDING_DELIVERY | IN_DELIVERY | DELIVERED | RETURNED`.
- `LogActionType` += `CHANGE_ORDER_REQUEST_STAT`.
- Distributor portal: submit a request, see history and status.
- Admin: list, filter, approve/reject with a note.
- **Add-order form gets an "order request" selector** listing approved, unlinked requests — selectable, removable, may be left empty. Linking sets `orderId`; the request's status then tracks the order's. Unlinking reverts it to `APPROVED`.
- **Status propagation:** every existing `OrderStat` change path must also update the linked request, in the same transaction.
- Events: `order-request:created`, `order-request:status-changed`. Set 6 subscribes.

**Manual test after**
1. Distributor submits → admin bell fires live.
2. Admin approves with a note → distributor's open page updates live.
3. Add-order form lists that request; create the order with it selected → request status follows the order.
4. Move the order to `IN_DELIVERY`, then `DELIVERED` → request mirrors each time.
5. Unlink the request from the order → request returns to `APPROVED` and reappears in the selector.
6. A rejected request never appears in the selector.
7. Quantity 0, negative, absurd → clear rejection.
8. Log rows for each status change.
9. Distributor A cannot see B's requests, via UI or curl.

### Plan prompt

```
Read CLAUDE.md, Docs/Stage-04-fix/plan/v2-decisions.md, and the rules docs.

Plan Set 4: card order requests, submitted by DISTRIBUTORS ONLY and managed by admins.
WRITE NO CODE.

Two decided points to design around:
- D5: the FK lives on CardOrderRequest (orderId, unique). The Order model is NOT modified. The
  add-order form gets a selector over approved, unlinked requests; it may be left empty.
- D11: OrderRequestStat includes its own PENDING/APPROVED/REJECTED/CANCELLED **plus every
  OrderStat value**. Once linked, the order's status propagates to the request on every change.
  Unlinking reverts the request to APPROVED.

Audit first:
- The existing Order module end to end (contract module, backend 6 files, frontend
  service/hooks/pages). The new module mirrors its structure — do not invent a new pattern.
- EVERY code path that changes OrderStat. All of them must propagate. List them.
- The add-order form and its command schema.
- The admin notification bell: namespace, room, payload shape.
- The pagination/filter query-schema pattern in the contract.

Then write Docs/Stage-04-fix/plan/set-4-plan.md with:
1. Exact prisma model + enum + indexes + migration name. Justify each index.
2. The state machine as a table: from → to, who may trigger it, and whether it is manual
   (admin decision) or propagated (order status). Include the unlink case.
3. The full list of OrderStat-changing code paths and where propagation is inserted in each.
   This is the correctness risk of the set — a missed path silently desynchronizes the request.
4. Contract: full module file list using Command/Query/DTO vocabulary, route constants, events.
5. Backend: the 6 module files, guards per route, distributor scoping, event publishes,
   audit-log writes.
6. The add-order form changes: how the selector queries approved+unlinked requests, and what
   happens if two admins pick the same request concurrently (the unique constraint will catch
   it — state the error the second admin sees).
7. Gateway: rooms for the distributor and for admins.
8. Frontend: portal submit form + history table, admin management table, the order-form
   selector, hooks, services, translation keys. Reuse components/shared/DataTable explicitly.
9. A note for Set 6 with the exact event names and payloads.
10. Open questions and manual test checklist.

Scope discipline: revocation is Set 5. No Telegram — publish events only.
```

### Execute prompt

```
Implement Docs/Stage-04-fix/plan/set-4-plan.md exactly. Order: prisma → contract → backend → frontend.

Reminders for this set:
- Mirror the existing Order module file for file. If you find yourself inventing a new pattern,
  stop and report instead.
- STATUS PROPAGATION: go through the list of OrderStat-changing paths in the plan one by one.
  Every one updates the linked request in the SAME transaction as the order. Confirm each in
  your report. A missed path is the failure mode of this set.
- Unlinking an order request reverts it to APPROVED and makes it selectable again.
- Enforce the state machine in the service, not just the UI. An invalid transition is a thrown
  ConflictError.
- Distributor scoping is enforced in the query, not by filtering after fetch.
- Every status change writes a Log row in the same transaction, then publishes the event.
- Reuse DataTable and the existing pagination query-schema pattern.
- No inline strings; en, fr, ar:"" for every new key.

Constraints: tests frozen. No test commands.
Done = tsc + eslint + madge clean, migration applied, no test file touched.
Report changed files, the migration name, the propagation paths you touched, and my manual
test checklist.
```

---

# Set 5 — Card revocation requests (distributor)

**Depends on:** 1, 4 · **Touches:** prisma, contract, api, web

**Scope**
- `CardRevocationRequest`: `cardId`, `activationId?`, `distributorId`, `reason`, `stat`, `adminNote?`, `reviewedByUserId?`, `createdAt`, `reviewedAt?`.
- `RevocationRequestStat`: `PENDING | APPROVED | REJECTED | CANCELLED`.
- Eligibility: cancelled/failed activations only — `CANCELLED_BY_ACTIVATOR`, `CANCELLED_BY_ADMIN`, `REMOVED_FROM_ACTIVATOR`, `ACTIVATION_FAILED` (plan confirms against the enum) — and only on the distributor's own cards.
- On APPROVE: reuse the existing card-revocation path (`Card.isRevoked`, `cardStat`, `REVOKE_CARD` log).
- Events mirroring Set 4; approval notifies the distributor in Set 6.

**Manual test after**
1. The revoke action appears only on eligible activations of the distributor's own cards.
2. Submit → admin bell fires; card **not** yet revoked.
3. Approve → card revoked, `cardStat` correct, `REVOKE_CARD` log present.
4. Reject → card untouched, distributor sees the reason.
5. Duplicate request while one is PENDING → blocked with a clear message.
6. Submit against a still-active activation via curl → rejected server-side.
7. Submit against another distributor's card via curl → 403/404.

### Plan prompt

```
Read CLAUDE.md, Docs/Stage-04-fix/plan/set-4-plan.md, and the rules docs.

Plan Set 5: card revocation requests, distributor-only. WRITE NO CODE.

Audit first:
- Everything that currently revokes a card: which service, what it sets on Card (isRevoked,
  isDisabled, cardStat), whether it writes the REVOKE_CARD log.
- The ActivationStat values representing a cancelled or failed activation.
- The Set 4 module you just built — reuse its shape exactly.

Then write Docs/Stage-04-fix/plan/set-5-plan.md with:
1. Exact prisma model + enum + indexes + migration name.
2. Eligibility as an explicit list of ActivationStat values PLUS the ownership rule (the card
   belongs to the requesting distributor), both enforced server-side.
3. What APPROVE does to the Card field by field, and how it REUSES the existing revoke service
   so exactly one place mutates revocation state. If that needs a small refactor, say so.
4. Duplicate-request policy when a PENDING request already exists for a card.
5. Contract / backend / frontend file lists, mirroring Set 4.
6. A note for Set 6 with event names and payloads.
7. Open questions and manual test checklist.

Scope discipline: no Telegram — publish events only.
```

### Execute prompt

```
Implement Docs/Stage-04-fix/plan/set-5-plan.md exactly. Order: prisma → contract → backend → frontend.

Reminders for this set:
- Eligibility AND ownership are enforced server-side. Hiding the button is not enforcement.
- APPROVE reuses the existing card-revocation service so there is one code path mutating Card
  revocation state. Call out any refactor you make to achieve that.
- Approve = card mutation + log write in one transaction, then publish.
- Follow the Set 4 module structure exactly.

Constraints: tests frozen. No test commands.
Done = tsc + eslint + madge clean, migration applied, no test file touched.
Report changed files, the migration name, and my manual test checklist.
```

---

# Set 6 — Telegram notifications

**Depends on:** 3, 4, 5 · **Touches:** prisma, contract, api, web
**Largest set. Its plan prompt asks for a split recommendation — take it seriously.**

**Architecture (D6)**

```
Express Controller → Domain Service → event bus
                                          │
                              notification.subscribers.ts
                                          │
                              NotificationService (interface, DI)
                                          ├── TelegramProvider   (implemented)
                                          ├── EmailProvider      (stub)
                                          └── WhatsAppProvider   (stub)
```

**Scope**
- `telegramChatId String?`, `telegramLinkToken String? @unique`, `telegramLinkedAt DateTime?` on `Admin`, `Activator`, `Distributor` (D7).
- `Notification` model: recipient, channel, type, body, `stat` (`PENDING|SENT|FAILED`), `error?`, `sentAt?`, `attempts`.
- `NotificationService` interface + provider DI; `TelegramProvider` via `fetch` (no new dependency); the other two as no-op stubs.
- **Intake, two transports (D12):** `TELEGRAM_MODE=polling|webhook`. One handler for `/start <token>`; polling drives it via `getUpdates`, webhook via a route. Same handler, same token logic.
- Admin UI: generate/regenerate a link token per user, copyable deep link, link status, unlink; notification log with resend.
- Env: `NOTIFICATIONS_ENABLED`, `TELEGRAM_MODE`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET` — in `env.ts` and `.env.example`.
- Subscribers wired to the full notification matrix.
- **Templates never interpolate a password or OTP.**

**Manual test after**
1. `NOTIFICATIONS_ENABLED=false` → nothing sends, nothing crashes.
2. Bad bot token → activation still completes; a FAILED row appears with the error.
3. `TELEGRAM_MODE=polling`: generate a token, tap the deep link → chat_id stored, token cleared, confirmation received.
4. Reuse the same link → rejected (A2).
5. New activation → all activators with a linked chat get one message each; none for unlinked.
6. Status change → only the activator in charge.
7. `FREEZE` → admins only.
8. Order request / revocation request → admins. Order created / revocation approved → that distributor.
9. **No password or OTP in any message or Notification row.**
10. Resend a failed one → attempts increments.

### Plan prompt

```
Read CLAUDE.md, Docs/Stage-04-fix/plan/v2-decisions.md, and the plans for Sets 3, 4 and 5. Read the rules docs.

Plan Set 6: Telegram notifications. WRITE NO CODE.

Architecture is decided (D6):
  Controller → Domain Service → event bus → notification.subscribers.ts
  → NotificationService (interface, DI) → TelegramProvider | EmailProvider (stub) | WhatsAppProvider (stub)
Domain services never call the notification service directly. Sends happen off the request path
so a Telegram outage cannot fail an activation.

Linking is decided (D7): an admin generates a one-time token stored on the Admin/Activator/
Distributor row; the user taps t.me/<bot>?start=<token>; the bot matches it and stores chat_id.

Transport is decided (D12): TELEGRAM_MODE=polling|webhook, selected by env. Polling for my
local manual testing (no tunnel), webhook for the deployed instance. ONE intake handler shared
by both transports — the token-matching logic must not be duplicated.

Audit first:
- Every event now published to the bus, its payload shape, and where it is published.
- realtime-gateway.ts — the notification subscriber sits ALONGSIDE it as a second independent
  bus consumer, not inside it. Confirm the bus supports that.
- How dependency injection is done elsewhere in this codebase, if at all. Provider DI matches
  existing conventions; do not import a DI framework.
- env.ts and .env.example.
- Whether any long-running background process already exists in server.ts — the poller needs a
  lifecycle (start after listen, stop on SIGTERM/SIGINT).
- How routes are mounted, for the webhook endpoint (it is unauthenticated by JWT and must be
  protected by a secret path or header instead).

Then write Docs/Stage-04-fix/plan/set-6-plan.md with:
1. Prisma diff: telegram fields on the three profile models, the Notification model, indexes,
   migration name. Explain why the fields go on the profile rows rather than User.
2. The NotificationService interface, the provider interface, how providers are registered and
   selected, and what the two stubs do. Show the actual TypeScript signatures.
3. The transport abstraction: the shared intake handler's signature, and how polling and webhook
   each feed it. Show that the token logic exists once.
4. Webhook security: how the endpoint is protected, and why it is exempt from requireAuth.
5. A TABLE: event → recipients (and the exact query resolving them) → template key. Use my
   notification matrix; flag any recipient you cannot resolve from the current schema.
6. Template strategy: where copy lives, French (A1), how the Set 2 duration formatter is used in
   bodies, and an explicit ALLOWLIST of fields a template may interpolate. PASSWORD and OTP are
   not on it.
7. Polling loop: lifecycle, offset persistence across restarts, error backoff, and the failure
   mode if two instances ever run (getUpdates conflicts).
8. Token flow: generation, uniqueness, single-use semantics, regeneration, unlink, audit entries.
9. Failure handling: retries or not, how FAILED rows are recorded, and why a send failure must
   never fail the originating HTTP request.
10. Env vars added and the .env.example diff.
11. Admin UI: token/link management inside the existing user panel, and the notification log page.
12. A recommendation on splitting this set, with the split point.
13. Open questions and manual test checklist.

No new dependencies: Telegram is plain fetch.
```

### Execute prompt

```
Implement Docs/Stage-04-fix/plan/set-6-plan.md exactly. Order: prisma → contract → backend → frontend.
If I approved a split, implement only part [a/b] and stop.

Reminders for this set:
- notification.subscribers.ts is the ONLY caller of NotificationService. No controller, service,
  or gateway calls a provider directly.
- Sends never throw into the request path. Wrap every provider call; failures mark the row
  FAILED and log through Pino.
- ONE intake handler. Polling and webhook are transports feeding it — the token-matching logic
  is written once.
- The webhook route is protected by the secret from the plan. It is the only unauthenticated
  write endpoint in the API; treat it accordingly.
- Templates interpolate only allowlisted fields. Password and OTP values never appear in a
  message, a Notification row, or a Pino line.
- The stub providers satisfy the interface and no-op cleanly — not throwing placeholders, and
  not selectable by accident.
- Every new env var goes in the env.ts Zod schema AND .env.example. A referenced-but-missing var
  must crash the boot; that is intended.
- With NOTIFICATIONS_ENABLED=false the whole subsystem is inert, including the poller.
- The poller starts after server.listen and stops on SIGTERM/SIGINT.
- No new dependencies. Telegram is plain fetch.

Constraints: tests frozen. No test commands.
Done = tsc + eslint + madge clean, migration applied, no test file touched.
Report changed files, the migration name, the env vars I must set, and my manual test checklist.
```

---

# Set 7 — Distributor portal

**Depends on:** 1, 4, 5 · **Touches:** contract, api, web

**Scope** — visibility rules are strict:
- Dashboard: **card counts by status only**.
- Card list: the key is visible **only if that card is already in an activation process** (plan confirms the `CardStat` list). Other keys never leave the server — not masked client-side, not in the payload.
- Their orders and deliveries.
- Activations on their cards, with search/filter and detail.
- The Set 4 and 5 request pages get their home here.
- No activator earnings, credits, or commission data.

**Manual test after**
1. Dashboard counts match a manual DB count for that distributor.
2. An `AT_DISTRIBUTOR` card shows no key **in the network response**, not just in the UI.
3. A card in activation shows its key.
4. Orders list shows only their orders.
5. Activation search by client name/phone works; filters combine; pagination survives filter changes.
6. Distributor A cannot fetch B's card, order, or activation by id via curl.
7. No activator earnings anywhere in the portal.

### Plan prompt

```
Read CLAUDE.md, Docs/Stage-04-fix/plan/v2-decisions.md, and the rules docs.

Plan Set 7: the distributor portal. WRITE NO CODE.

Visibility rules, strict:
- Dashboard shows card COUNTS BY STATUS only.
- A card key is visible ONLY when that card is already in an activation process. Keys for other
  cards must never leave the server — not masked client-side, not present in the payload.
- Their orders and deliveries.
- Activations on their cards.
- No activator earnings, credits, or commission data.

Audit first:
- The existing activator dashboard and activation list — reuse their patterns and components
  where the data shape allows, since that portal is already complete.
- The existing card and order query services and their filters.
- The pagination/filter query-schema pattern in the contract.
- Existing statistics endpoints — can I extend one instead of adding another?

Then write Docs/Stage-04-fix/plan/set-7-plan.md with:
1. The dashboard summary DTO field by field, with each field's source query. One endpoint,
   aggregated — not six round trips.
2. The card list DTO, and exactly how the key field is conditionally included IN THE MAPPER
   (server-side). State the CardStat values that unlock the key.
3. Scoping rules per resource (cards, orders, activations, requests) as they will appear in the
   Prisma where clause.
4. The activation list query schema: search fields, filters, sort, pagination defaults, max limit.
5. Frontend: portal nav, dashboard, card list, orders list, activations list + detail, and where
   the Set 4/5 request pages slot in. Loading skeletons that preserve layout, empty and error
   states, translation keys.
6. What you can reuse from the activator portal versus what must be new, and why.
7. Open questions and manual test checklist.
```

### Execute prompt

```
Implement Docs/Stage-04-fix/plan/set-7-plan.md exactly. Order: contract → backend → frontend.

Reminders for this set:
- Card key omission happens in the mapper. Verify by reading the mapper that a non-activated
  card's key cannot reach the response under any code path.
- Scoping is enforced in the service query, not by filtering after fetch and not in the UI.
- One aggregated summary endpoint. No N+1.
- Search and filtering are server-side.
- isLoading swaps in Skeletons shaped like the content; isError renders inside the content area.
  The layout never disappears.
- No useEffect fetching. Component → Hook → Service.
- Reuse the activator portal's components where the shape allows; do not fork them.

Constraints: tests frozen. No test commands.
Done = tsc + eslint + madge clean, no test file touched.
Report changed files and my manual test checklist.
```

---

# Set 8 — Lot creation card picker

**Depends on:** nothing hard (any time after 1) · **Touches:** contract, api, web

**Scope**
- Endpoint returning available cards (printed, not in a lot, matching the lot's plan) **grouped by Set**, with the set's creation date.
- Search by card key within available cards.
- Selection UX: expand a set, select cards, select-all-in-set, running count vs capacity, clear selection.
- Server-side re-validation on submit — a card selected 90 seconds ago may already be in another lot.

**Manual test after**
1. Groups show set number + creation date, in the intended order.
2. Only eligible cards appear.
3. Search by full key finds it; partial behaves as specified.
4. Select-all-in-set then deselect a few → count correct.
5. 200+ cards selected → no lag, request succeeds.
6. Two tabs: assign a card in tab A, submit the stale selection in tab B → clear error naming the failed cards, no corrupt lot.

### Plan prompt

```
Read CLAUDE.md and the rules docs.

Plan Set 8: a proper card picker for lot creation — available cards grouped by set and creation
date, searchable by key, with easy bulk selection. WRITE NO CODE.

Audit first:
- The current lot creation flow end to end: contract command, service, UI.
- How "available" is currently determined (cardStat, lotId null, plan match). Write down the
  exact predicate.
- Existing card query/filter schemas in the contract.

Then write Docs/Stage-04-fix/plan/set-8-plan.md with:
1. The eligibility predicate exactly as it will appear in the Prisma where clause.
2. The grouped response shape, and how paging works with grouping (page groups, page within a
   group, or cap per group) — pick one and justify it for a realistic card count.
3. Search behaviour: exact, prefix, or contains, and the index consequences. Card.key is unique;
   say whether another index is needed for the chosen behaviour.
4. Selection UX: state shape, select-all-in-set semantics under paging, the capacity counter.
5. Server-side re-validation on submit and the exact error shape, which must NAME the cards that
   failed.
6. Expected card volume and what keeps the UI responsive at that size. No virtualization library
   — we are not adding dependencies.
7. Open questions and manual test checklist.
```

### Execute prompt

```
Implement Docs/Stage-04-fix/plan/set-8-plan.md exactly. Order: contract → backend → frontend.

Reminders for this set:
- The eligibility predicate lives in one place, server-side. The UI never assumes it.
- Submit re-validates and returns which specific cards failed. Either the lot is created with
  exactly the requested cards or it errors — no partial silent success.
- Card-to-lot assignment happens in a transaction.
- Keep selection state simple; memoize only if you can name the expensive computation.
- No new libraries.

Constraints: tests frozen. No test commands.
Done = tsc + eslint + madge clean, no test file touched.
Report changed files and my manual test checklist.
```

---

# Set 9 — Activation cost & plan cost settings

**Depends on:** 1 · **Touches:** prisma, contract, api, web
**Must land before Sets 10 and 11.**

**Scope (D10)**
- `SubscriptionPlanCost`: `subscriptionPlanId` unique, `cost Decimal?` (null = unset), `updatedAt`.
- `Activation.activationCost Decimal? @default(0)`.
- On completion (`ACTIVATED` / `ACTIVATED_BY_ADMIN`), stamp from the plan's cost. Null plan cost → leave `0`.
- Admin settings tab: plan × cost table, `-` when null, edit action.
- Admin activation table: `activationCost` column + edit action, enabled **only** for completed activations.
- `LogActionType` += `SET_SUBSCRIPTION_PLAN_COST`, `CHANGE_ACTIVATION_COST`.
- The stamp is a **snapshot** — later plan-cost edits never rewrite history.

**Manual test after**
1. Settings tab lists every plan; unset ones show `-`.
2. Set a cost → log row.
3. Complete an activation on that plan → `activationCost` equals the plan cost at that moment.
4. Change the plan cost → the completed activation is **unchanged**.
5. Complete on a plan with no cost → `activationCost` is `0`, no crash.
6. Edit an activation's cost manually → log row; disabled for non-completed activations, and the API rejects it too.

### Plan prompt

```
Read CLAUDE.md, Docs/Stage-04-fix/plan/v2-decisions.md, and the rules docs.

Plan Set 9: activation cost, plus a subscription-plan cost settings tab. WRITE NO CODE.

The model is decided (D10):
- New SubscriptionPlanCost table: one nullable cost per subscription plan.
- New nullable Activation.activationCost, default 0.
- On completion (ACTIVATED or ACTIVATED_BY_ADMIN) the cost is STAMPED from the plan cost — a
  snapshot. Later plan-cost edits must never change historical activations.
- Admin settings tab (plan × cost, "-" when null, edit action).
- Admin activation table: activationCost column + edit action, enabled only for completed
  activations.

Audit first:
- EVERY code path that transitions an activation to ACTIVATED or ACTIVATED_BY_ADMIN. All of them
  must stamp the cost — if there are three such paths, list all three. Set 10 will reuse this
  inventory, so make it exhaustive and put it in the plan verbatim.
- How SubscriptionPlanCommission is administered today; the settings tab follows that pattern.
- Whether an admin settings area with tabs already exists, or one is needed.
- How Prisma Decimal is currently serialized in DTOs — I need one consistent answer.

Then write Docs/Stage-04-fix/plan/set-9-plan.md with:
1. Exact prisma diff, indexes, migration name. Explain why cost is nullable on the plan table
   but defaults to 0 on the activation.
2. THE COMPLETION PATH INVENTORY, and where the stamp goes in each. This is the correctness risk
   of the set — a path that forgets to stamp produces silently wrong revenue later.
3. Contract: schemas, route constants, DTOs, and the Decimal serialization decision applied
   consistently.
4. Backend: services, guards, transaction boundaries, audit-log writes for both new actions.
5. Frontend: the settings tab (and the tab shell itself if none exists), the activation-table
   column and its edit action, the enable/disable rule, translation keys.
6. What the admin cost edit does NOT do — it must not recalculate anything else.
7. Open questions and manual test checklist.
```

### Execute prompt

```
Implement Docs/Stage-04-fix/plan/set-9-plan.md exactly. Order: prisma → contract → backend → frontend.

Reminders for this set:
- Every completion code path stamps the cost. Go through the inventory in the plan one by one
  and confirm each in your report.
- The stamp is a snapshot. Nothing may retroactively rewrite a completed activation's cost
  except an explicit admin edit.
- The "completed only" rule for editing is enforced server-side too, not just by a disabled button.
- Both new log actions write through the existing audit path.
- Money is Decimal end to end, serialized exactly as the plan specifies. No JS floats.

Constraints: tests frozen. No test commands.
Done = tsc + eslint + madge clean, migration applied, no test file touched.
Report changed files, the migration name, the completion paths you stamped, and my manual test
checklist.
```

---

# Set 10 — Activation email pool

**Depends on:** 9 (reuses its completion-path inventory) · **Touches:** prisma, contract, api, web

**Scope (D13)**
- `ActivationEmail`: `subscriptionPlanId` (FK), `email`, `nbOfActivation Int @default(0)`, `lastUsedAt DateTime?`, `createdAt`, `isDeleted Boolean @default(false)`, `deletedAt DateTime?`. Unique `[subscriptionPlanId, email]`.
- Admin settings tab: add an email for a plan; table of plan / email / usage count; delete button (**soft** — hidden from every list, settings and picker alike).
- Re-adding a soft-deleted pair **restores the row** with its counter intact (A6).
- On setting an activation to `ACTIVATED` / `ACTIVATED_BY_ADMIN`, activator **and** admin get a picker of pool emails **for that activation's plan**, ordered never-used first, then oldest-used → newest-used (A4). A free address may be typed instead.
- A submitted address matching an active pool row (case-insensitive) increments `nbOfActivation` and sets `lastUsedAt` (A5: soft-deleted rows never match).
- `Activation.activationEmail` **stays a plain string. No FK, no schema change to Activation.**
- `LogActionType` += `ADD_ACTIVATION_EMAIL`, `DELETE_ACTIVATION_EMAIL`.

**Manual test after**
1. Add three emails for one plan → they appear in the settings table with count 0.
2. Complete an activation on that plan → the picker shows only that plan's emails.
3. Pick one → its count becomes 1 and `lastUsedAt` is set; reopen the picker → it now sorts last.
4. Complete another → the picker's first option is a still-unused address.
5. Type a free address not in the pool → activation saves, no pool row created.
6. Type an address that **is** in the pool → that row increments.
7. Delete an email → gone from settings and from the picker; existing activations that used it still show it.
8. Re-add the same address for the same plan → the row returns with its old count.
9. Same address added for a different plan → separate row, separate counter.
10. Log rows for add and delete.

### Plan prompt

```
Read CLAUDE.md, Docs/Stage-04-fix/plan/v2-decisions.md, Docs/Stage-04-fix/plan/set-9-plan.md, and the rules docs.

Plan Set 10: an activation email pool. WRITE NO CODE.

The model is decided (D13):
- New ActivationEmail table: subscriptionPlanId FK, email, nbOfActivation, lastUsedAt, createdAt,
  soft-delete fields. Unique on [subscriptionPlanId, email] — the same address may serve several
  plans with separate counters.
- Admin settings tab: add, list (plan / email / usage count), delete (SOFT — hidden from every
  list, settings and picker).
- When an activator OR an admin sets an activation to ACTIVATED / ACTIVATED_BY_ADMIN, they get a
  picker of pool emails FOR THAT ACTIVATION'S PLAN, ordered never-used first then oldest-used →
  newest-used. They may type a free address instead.
- A submitted address matching an ACTIVE pool row (case-insensitive) increments nbOfActivation and
  sets lastUsedAt. Soft-deleted rows never match.
- Re-adding a soft-deleted [plan, email] pair RESTORES the existing row with its counter intact.
- Activation.activationEmail STAYS A PLAIN STRING. Do not add an FK. Do not modify the Activation
  model at all in this set.

Audit first:
- The completion-path inventory from set-9-plan.md. Every one of those paths writes
  activationEmail; all of them must run the match-and-increment logic. Restate the inventory.
- How activationEmail is captured today in the activator UI and the admin UI — both need the picker.
- The settings tab shell from Set 9.

Then write Docs/Stage-04-fix/plan/set-10-plan.md with:
1. Exact prisma model + indexes + migration name. Explain the index supporting the picker's sort.
2. The picker query: filter (plan, not deleted), sort expression handling null lastUsedAt, and
   whether it paginates.
3. The match-and-increment rule written as pseudocode: normalization (trim, lowercase), what it
   matches against, and what happens on no match. State plainly that it runs in the same
   transaction as the activation completion.
4. The restore-on-re-add flow and the exact error if something goes wrong with the unique constraint.
5. Contract: module files, route constants, DTOs, commands.
6. Backend: the module, guards (settings = ADMIN; picker list = ADMIN + ACTIVATOR), audit-log
   writes for add and delete, and where the increment hooks into each completion path.
7. Frontend: the settings tab, and the picker component used in BOTH the activator and admin
   completion flows — one component, two call sites. Free-text entry alongside the list.
   Translation keys.
8. Confirm in writing that Activation is unmodified.
9. Open questions and manual test checklist.
```

### Execute prompt

```
Implement Docs/Stage-04-fix/plan/set-10-plan.md exactly. Order: prisma → contract → backend → frontend.

Reminders for this set:
- Activation.activationEmail stays a String. Do not add an FK. Do not touch the Activation model.
- Every completion path from the Set 9 inventory runs the match-and-increment logic, in the SAME
  transaction as the completion. Confirm each path in your report.
- Matching is case-insensitive and trims whitespace, and matches ACTIVE rows only. A soft-deleted
  row is never matched and never restored implicitly.
- Soft delete means hidden from the settings list AND the picker. Check both queries.
- One picker component, used by both the activator and the admin completion flows. Do not build
  two.
- Never-used emails sort first, then oldest lastUsedAt → newest.
- Add and delete write Log rows via the existing audit path.

Constraints: tests frozen. No test commands.
Done = tsc + eslint + madge clean, migration applied, no test file touched.
Report changed files, the migration name, the completion paths you hooked, and my manual test
checklist.
```

---

# Set 11 — Revenue dashboard & charts

**Depends on:** 9 · **Touches:** contract, api, web

**Scope (D9)**
- Cash in = `Order.orderPrice` for completed orders (`deliverPrice` excluded).
- Cash out = `Activation.activationCost` + `Activation.activationPrice` for `ACTIVATED` / `ACTIVATED_BY_ADMIN`.
- Net = in − out, over time (day/week/month), plus breakdowns by plan, wilaya, and distributor.
- Recharts (already approved). All aggregation in the DB.

**Manual test after**
1. Totals for a known month match a manual SQL sum.
2. Granularity toggle changes buckets; empty periods render as zero, not gaps.
3. A range with no data → empty state, no crash.
4. Two-decimal accuracy, no floating-point artifacts.
5. Charts render on a narrow viewport without overflow.
6. Page loads acceptably with your real data volume.

### Plan prompt

```
Read CLAUDE.md, Docs/Stage-04-fix/plan/v2-decisions.md, Docs/Stage-04-fix/plan/set-9-plan.md, and the rules docs.

Plan Set 11: the admin revenue dashboard. WRITE NO CODE.

Revenue is decided (D9):
  cash in  = sum(Order.orderPrice) for completed orders. deliverPrice EXCLUDED.
  cash out = sum(Activation.activationCost + Activation.activationPrice) for activations in
             ACTIVATED or ACTIVATED_BY_ADMIN.
  net      = in - out.
My assumption (A3): "completed order" = OrderStat.DELIVERED, anchored on Order.completedAt; cash
out anchored on Activation.completedAt. Confirm both against the code, or tell me what the data
actually supports.

Audit first:
- What OrderStat values orders actually reach in practice, and whether completedAt is reliably set.
- The existing statistics module: endpoints, query patterns, DTO shapes, wilaya choropleth.
- The Decimal serialization decision from Set 9 — reuse it exactly.

Then write Docs/Stage-04-fix/plan/set-11-plan.md with:
1. The revenue formula over named fields with its date anchor per term, stated explicitly — the
   anchor changes every number on the chart.
2. Endpoint list, each with query schema (range, granularity, optional dimension) and DTO. Prefer
   few parameterized endpoints over many narrow ones.
3. Aggregation strategy per endpoint (groupBy vs raw SQL) and any index that must be added.
4. Empty-period zero-filling, timezone handling, date-range defaults.
5. Chart list: which chart answers which question, with recharts. No new libraries.
6. How this coexists with the existing statistics page — extend it or add a tab.
7. Open questions and manual test checklist.
```

### Execute prompt

```
Implement Docs/Stage-04-fix/plan/set-11-plan.md exactly. Order: contract → backend → frontend.

Reminders for this set:
- Aggregate in the database. Never fetch rows to sum them in JS.
- Money is never a JS float — including chart tooltips and axis labels. Use the Set 9
  serialization decision everywhere.
- Empty periods are zero-filled server-side so charts have no holes.
- Responsive containers and readable labels at narrow widths.
- Extend the existing statistics module rather than building a parallel one, if the plan says so.
- No new libraries — recharts only.

Constraints: tests frozen. No test commands.
Done = tsc + eslint + madge clean, no test file touched.
Report changed files, any index added, and my manual test checklist.
```

---

# Set 12 — Client form support banner + client correction

**Depends on:** 3 · **Touches:** contract, api, web (mostly web)

**Scope**
- Support banner on the public activation form: appears once a **valid card key** is accepted, on every step **except Finish**. Darija + French copy, phone and WhatsApp from the **existing header/footer contact config** (D8), `tel:` and `wa.me` links, tap-friendly on mobile.
- Client-side correction of already-submitted information, gated server-side by activation status.
- Emits an event so the activator sees the correction live.

**Manual test after**
1. Before a key → no banner. After a valid key → banner on every step.
2. Finish step → no banner.
3. Mobile: the number opens the dialer; WhatsApp opens; the banner doesn't cover inputs.
4. EN↔FR toggle → the Darija/French copy stays the same (intentional).
5. Correct a field while PENDING → activator dashboard updates live.
6. Correct after ACTIVATED → blocked server-side with a clear message.
7. Bad card key → no banner, sensible error.
8. A card key does not grant edit access to a different activation.

### Plan prompt

```
Read CLAUDE.md, Docs/Stage-04-fix/plan/v2-decisions.md, Docs/Stage-04-fix/plan/set-3-plan.md, and the rules docs.

Plan Set 12: a support-contact banner on the public activation form, plus client-side correction
of submitted activation information. WRITE NO CODE.

Audit first:
- The public activation flow: every step component, how step state is tracked, and exactly where
  "valid card key accepted" is known.
- Which step is the Finish step and how it is identified.
- Where the support phone and WhatsApp number live for the header/footer — the banner reuses that
  source, not a new env var.
- The Set 3 admin correction endpoint: can the client path reuse the service with different
  authorization and a narrower field set? Recommend reuse or separation, with reasoning.

Then write Docs/Stage-04-fix/plan/set-12-plan.md with:
1. The banner: component location, placement in the step layout, visibility predicate as a
   boolean expression over real state, and mobile behaviour.
2. The exact Darija + French copy, written out in full for me to approve or rewrite. Natural
   Algerian phrasing, not translated-sounding French. Stored in translations.json (the
   no-inline-strings rule holds) with the SAME string under en and fr, phone injected as a variable.
3. tel: and wa.me link formats for an Algerian number, and how the number is read from the
   existing contact config.
4. Client correction: which fields, which activation statuses allow it, server-side enforcement,
   and which event fires.
5. Anti-abuse: this is a PUBLIC route. State the authorization model explicitly — what stops
   someone with one card key from editing another activation. This is the main risk in the set.
6. Open questions and manual test checklist.
```

### Execute prompt

```
Implement Docs/Stage-04-fix/plan/set-12-plan.md exactly. Order: contract → backend → frontend.

Reminders for this set:
- This is a PUBLIC endpoint. The authorization model from the plan is enforced server-side on
  every request. A card key alone must not grant edit access to another activation's data.
- Allowed-status enforcement is server-side.
- Banner copy lives in translations.json with the phone interpolated. No inline strings.
- The banner must not shift or cover the form at ~360px width.
- The correction publishes a bus event; only the gateway emits to sockets.
- Reuse the header/footer contact source for the number — do not add an env var.

Constraints: tests frozen. No test commands.
Done = tsc + eslint + madge clean, no test file touched.
Report changed files and my manual test checklist.
```

---

# Set 13 — Consistency & responsiveness pass

**Depends on:** all · **Touches:** web mostly, small api fixes

**Scope**
- Every duration and datetime goes through the shared formatter. No stray `toLocaleString`, no raw ISO strings on screen.
- Every form: Zod validation, field-level messages, disabled while pending, no silent failures.
- Responsive pass: public + distributor portal mobile-first, admin desktop-first with horizontal table scroll.
- Audit-log coverage matrix: every critical action is actually logged.
- Translation completeness: no inline strings, every key has `en`, `fr`, `ar: ""`.

**Manual test after**
1. Walk every page at 360px, 768px, 1440px.
2. Submit every form empty, then with invalid data.
3. Confirm each row of the audit-log matrix by performing the action and finding the Log row.
4. Grep the UI for any raw ISO timestamp.
5. Toggle EN↔FR on every page.

### Plan prompt

```
Read CLAUDE.md and the rules docs.

Plan Set 13: a consistency and responsiveness pass across Sets 1–12. WRITE NO CODE.
This is an audit that produces a fix list.

Produce Docs/Stage-04-fix/plan/set-13-plan.md with four inventories, each a table with file paths:

1. TIME FORMATTING — every place a date, time, or duration is rendered. Columns: file, what it
   renders, current method, compliant yes/no, fix.
2. FORMS — every form. Columns: file, validated by (contract schema / local schema / nothing),
   field-level errors yes/no, pending state yes/no, fix.
3. RESPONSIVENESS — every page. Columns: file, public/portal/admin, required approach, concrete
   problems visible in the markup, fix.
4. AUDIT LOG COVERAGE — every critical action: activations, activation information changes,
   activation cost changes, plan cost changes, activation email add/delete, order requests, order
   creation and status propagation, revocations, status changes, role assignment, Telegram
   link/unlink, admin actions. Columns: action, logged yes/no, LogActionType used, where, fix.

Also list every inline string still in JSX and every translation key missing en or fr.

Order the combined fix list by risk and mark anything that would change an API contract — I decide
separately whether those are in scope.
```

### Execute prompt

```
Implement the fix list in Docs/Stage-04-fix/plan/set-13-plan.md, in the order given, EXCLUDING anything I
marked out of scope.

Reminders for this set:
- Formatting fixes route through the existing shared formatter. Do not add another implementation.
- Audit-log gaps reuse the existing log helper and existing LogActionType values where they fit.
  New enum values go in ONE batched migration at the start — tell me its name.
- Responsiveness fixes use existing Tailwind tokens and semantic CSS variables. No new colors, no
  new libraries.
- This is cleanup: do not add features, do not refactor beyond the listed fixes.

Constraints: tests frozen. No test commands.
Done = tsc + eslint + madge clean, no test file touched.
Report changed files grouped by inventory, and my manual test checklist.
```

---

# Set 14 *(optional)* — Test catch-up

Run only after you've manually validated Sets 1–13. The one session where the freeze lifts.

```
Read CLAUDE.md and Docs/test-rules.md.

The test freeze is LIFTED for this session only. Sets 1–13 changed the contract, the schema, and
many endpoints; the suites are stale.

Work in this order and report after each step:
1. Run the three suites and produce a failure inventory: file, failure, root cause classified as
   (a) stale expectation, (b) stale fixture/mock, (c) genuine bug in Set 1–13 code.
2. Show me the (c) list and STOP. Genuine bugs get fixed in the source and I want to see them
   before you touch anything.
3. After I confirm, update (a) and (b): contract-conformance schemas, API unit + integration
   tests, MSW handlers, web tests.
4. Add coverage for the new surface: distributor role guards, order requests including status
   propagation from the linked order, revocation requests, the notification subscriber + provider
   DI (mock the provider, never hit Telegram), admin activation correction, activation cost
   stamping on EVERY completion path, activation email match-and-increment, the revenue
   aggregation, and the duration formatter (use the format table from the Set 2 plan as cases).

Do not weaken an assertion to make a test pass. Do not delete a test to make a suite green. If a
test is genuinely obsolete, say so and ask.
```

---

# Session grouping

Sets sharing a session keep Claude's context warm — the second set reuses the audit and conventions from the first instead of rediscovering them. **You still manual-test after each set's execute prompt**; grouping is about context, not skipping verification. Start a fresh session whenever the context gets long or confused, regardless of this table.

| Session | Sets | Why they belong together |
|---|---|---|
| **A** | 0 | Recon alone. Its output is the reference every later session reads. |
| **B** | 1 | The guard audit needs undivided attention; a mistake here is a security hole. |
| **C** | 2 → 3 | Same domain, same files, same mappers. Set 3 edits exactly what Set 2 just learned to read. |
| **D** | 4 → 5 | Set 5 mirrors Set 4's module structure deliberately. Building it in the same session is why it comes out consistent. |
| **E** | 6 | Largest set. Alone, and possibly split in two by its own plan. |
| **F** | 7 | Portal UI is broad but shallow; benefits from a clean context. |
| **G** | 9 → 10 | Both hook the *same* completion paths and both add a settings tab. Set 10's plan explicitly reuses Set 9's completion-path inventory. Running them apart means auditing those paths twice. |
| **H** | 11 | Follows G naturally — cost data now exists — but aggregation work wants a clear head. |
| **I** | 8, or 12 | Both are self-contained. Slot either into a short session whenever you want a break from schema work. |
| **J** | 13 | Cleanup alone, so the fix list doesn't get diluted by feature thinking. |
| **K** | 14 | Optional, and only after manual QA is done. |

## Notes on sequencing

- **Sets 1, 3, 4, 5, 6, 9, 10 migrate the schema.** Your data is disposable, so reset freely — but reseeding means seed scripts may need updating when a new required field lands.
- **Set 9 gates Sets 10 and 11.** Both need `activationCost` to exist and be stamped.
- **The quiet failure mode of this whole plan** is a completion path that gets missed. Sets 9 and 10 both hook `ACTIVATED` / `ACTIVATED_BY_ADMIN`; Set 4 hooks every `OrderStat` change. Miss one and nothing errors — the data just drifts. That's why those three sets demand an exhaustive path inventory before implementation and a per-path confirmation in the report.
- **Frozen tests get noisier every set.** Don't let the drift run past four or five sets, or Set 14 becomes its own project.