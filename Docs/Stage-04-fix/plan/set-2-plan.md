# Set 2 — Duration formatting + full admin activation detail

**Depends on:** Set 1 · **Touches:** contract, api, web · **Schema change:** none · **Migration:** none
**Date:** 2026-08-09 · **Branch:** `version-02-01`
**Inputs read:** `.claude/CLAUDE.md`, `Docs/Stage-04-fix/plan/v2-decisions.md`, `contract-rules.md`, `back-end-rules.md`, `front-end-rules.md`, `version-2-description.md` §Set 2.

**Scope discipline: read-only.** No write endpoint, no edit UI. Admin correction is not part of this
programme any more — see [set-3-plan.md](set-3-plan.md), which replaced it.

---

## 0. Audit findings (the basis for everything below)

### 0.1 Every activation DTO and the mapper method that produces it

All eight live in [activation.dtos.ts](Apps/contract/src/modules/activation/activation.dtos.ts) and
[activation.mapper.ts](Apps/api/src/modules/activation/activation.mapper.ts).

| DTO | Mapper method | Audience | Has a duration? |
|---|---|---|---|
| `KeyVerificationDTO` | `toKeyVerificationDTO` (`:107`) | Public client, gated by card key | no |
| `ClientActivationStatusDTO` | `toClientStatusDTO` (`:166`) | Public client | no |
| `PendingActivationDTO` | `toPendingDTO` (`:174`) | Activator + Admin | no — `requestedAt` only, ticked client-side |
| `ActiveRequestDTO` | `toActiveRequestDTO` (`:188`) | Assigned activator | no — `takenAt` only, ticked client-side |
| `ActivatorHistoryItemDTO` | `toActivatorHistoryItemDTO` (`:228`) | Activator (own) | **`durationSeconds: z.number().int().nullable()`** |
| `RecentActivationDTO` | `toRecentDTO` (`:260`) | Activator + Admin | no |
| `AdminActivationDTO` | `toAdminActivationDTO` (`:281`) | Admin | **`durationSeconds: z.number().int().nullable()`** |
| `ActivationDetailDTO` | `toActivationDetailDTO` (`:317`) | Admin | **none — the gap this set closes** |

Sub-shapes: `ClientBlock`, `DistributorBlock`, `AccountFieldValue {fieldLabel, value}`,
`SubmittedField {field, value}`, `TimelineEntry`, `CardHistoryEntry`.

Duration is produced by exactly one backend helper,
[`durationSeconds(takenAt, completedAt)`](Apps/api/src/modules/activation/activation.mapper.ts#L95-L98)
— `Math.round((completedAt − takenAt)/1000)`, `null` if either side is null.

### 0.2 Where information / wrong-information / additional-information values are exposed today

The three tables are merged by
[`resolveLatestWinsInfo()`](Apps/api/src/modules/activation/activation.service.ts#L117-L133): base
`ActivationInformation`, then every step's `wrongInformation` and `additionalInformation` applied
newest-last.

| Audience | Path | PASSWORD / OTP |
|---|---|---|
| Public client | `verify()` → `toKeyVerificationDTO.submittedFields` ([mapper:132-138](Apps/api/src/modules/activation/activation.mapper.ts#L132-L138)) | **raw, unmasked** |
| Assigned activator | `buildActiveRequestDTO` → `accountFields` + dedicated `otpValue` ([mapper:218-222](Apps/api/src/modules/activation/activation.mapper.ts#L218-L222)) | **raw, unmasked** |
| **Admin** | `getById()` → `toActivationDetailDTO.submittedInformation`, `timeline[].wrongFields`, `timeline[].additionalFields` | **masked to `"****"`** by `maskValue()` + `SENSITIVE_FIELDS` ([mapper:38-41, 85-88](Apps/api/src/modules/activation/activation.mapper.ts#L38-L41)) |
| Admin list / history / recent | `AdminActivationDTO`, `ActivatorHistoryItemDTO`, `RecentActivationDTO` | not present at all |

**The admin is currently the least-privileged reader of data the client typed itself.** D3 fixes
that inversion. Three masking call sites to remove: `mapper:334`, `:341`, `:345`.

### 0.3 Every duration / elapsed-time render site

Two independent `mm:ss` implementations exist:
[`formatTime`](Apps/web/src/lib/utils.ts#L18-L23) and an inline copy inside
[LiveTimer.tsx:19-24](Apps/web/src/components/shared/LiveTimer.tsx#L19-L24). Both break past 60
minutes (185 min renders as `185:12`).

| # | Site | Portal | Method | Source value |
|---|---|---|---|---|
| 1 | [LiveTimer.tsx:19-24](Apps/web/src/components/shared/LiveTimer.tsx#L19-L24) | shared | inline `mm:ss` | live `Date.now() − since` |
| 2 | [HistoryPage.tsx:200](Apps/web/src/pages/activator/HistoryPage.tsx#L200) | activator | `formatTime` | `durationSeconds` |
| 3 | [HistoryPage.tsx:373](Apps/web/src/pages/activator/HistoryPage.tsx#L373) | activator (mobile card) | `formatTime` | `durationSeconds` |
| 4 | [DashboardPage.tsx:93](Apps/web/src/pages/activator/DashboardPage.tsx#L93) | activator | `formatTime` | `avgActivationTimeSeconds` |
| 5 | [ActivationsTable.tsx:74](Apps/web/src/pages/admin/activations/components/ActivationsTable.tsx#L74) | admin | `formatTime` | `durationSeconds` |
| 6 | [ActivationsTable.tsx:75](Apps/web/src/pages/admin/activations/components/ActivationsTable.tsx#L75) | admin | `LiveTimer` | `takenAt` |
| 7 | [ActivationsPage.tsx:123](Apps/web/src/pages/admin/activations/ActivationsPage.tsx#L123) | admin | `formatTime` | `avgDurationSeconds` |
| 8 | [ActivatorsTable.tsx:81](Apps/web/src/pages/admin/activators/components/ActivatorsTable.tsx#L81) | admin | `formatTime` | `avgActivationTimeSeconds` |
| 9 | [StatsRevenueGrid.tsx:29](Apps/web/src/pages/admin/activators/components/StatsRevenueGrid.tsx#L29) | admin | `formatTime` | `avgActivationTimeSeconds` |
| 10 | [AvgTimeTrendChart.tsx:73](Apps/web/src/pages/admin/statistics/components/AvgTimeTrendChart.tsx#L73) | admin | `formatTime` | chart Y axis, `avgSeconds` |
| 11 | [AvgTimeTrendChart.tsx:75](Apps/web/src/pages/admin/statistics/components/AvgTimeTrendChart.tsx#L75) | admin | `formatTime` | chart tooltip |
| 12 | [RequestsPage.tsx:141](Apps/web/src/pages/activator/RequestsPage.tsx#L141) | activator | `LiveTimer` (wait) | `requestedAt` |
| 13 | [RequestsPage.tsx:253](Apps/web/src/pages/activator/RequestsPage.tsx#L253) | activator (mobile) | `LiveTimer` (wait) | `requestedAt` |
| 14 | [PendingActivationsTable.tsx:46](Apps/web/src/pages/admin/components/PendingActivationsTable.tsx#L46) | admin | `LiveTimer` (wait) | `requestedAt` |
| 15 | [PendingActivationsTable.tsx:76](Apps/web/src/pages/admin/components/PendingActivationsTable.tsx#L76) | admin (mobile) | `LiveTimer` (wait) | `requestedAt` |
| 16 | [ActiveRequestCard.tsx:174](Apps/web/src/components/sections/activator/ActiveRequestCard.tsx#L174) | activator | `LiveTimer` | `takenAt` |
| 17 | [StatsRow.tsx:46](Apps/web/src/components/sections/landing/StatsRow.tsx#L46) | public landing | **hardcoded `"3:24"`** | none — marketing copy |

[duration-tone.ts](Apps/web/src/lib/duration-tone.ts) (`toneClass`, `durationToneClass`) colours
durations, never formats them. **Leave it alone.**

### 0.4 Activation statistics endpoints and their units

**Every duration-bearing endpoint already returns seconds. Not one returns minutes or
milliseconds.** The real gap is that three of them return **fractional** seconds while the contract
field is a bare `z.number()`.

| Endpoint | Contract field | Producer | Integer? |
|---|---|---|---|
| `ACTIVATION_ROUTES.GET_MY_HISTORY` | `ActivatorHistoryItemDTO.durationSeconds` `z.number().int()` | `durationSeconds()` (`Math.round`) | ✅ |
| `ACTIVATION_ROUTES.GET_ALL` | `AdminActivationDTO.durationSeconds` `z.number().int()` | `durationSeconds()` (`Math.round`) | ✅ |
| `STATISTICS_ROUTES.ACTIVATIONS_SUMMARY` | `avgDurationSeconds` `z.number()` ([statistics.dtos.ts:66](Apps/contract/src/modules/statistics/statistics.dtos.ts#L66)) | `avgSeconds()` [statistics.service.ts:41](Apps/api/src/modules/statistics/statistics.service.ts#L41) — `total/n/1000` | ❌ float |
| `STATISTICS_ROUTES.OVERVIEW` | `avgTimeTrend[].avgSeconds` `z.number()` ([:94](Apps/contract/src/modules/statistics/statistics.dtos.ts#L94)) | [statistics.service.ts:262,298](Apps/api/src/modules/statistics/statistics.service.ts#L262) | ❌ float |
| `STATISTICS_ROUTES.WILAYA_HEATMAP` | `avgActivationTimeSeconds` `z.number()` ([:110](Apps/contract/src/modules/statistics/statistics.dtos.ts#L110)) | [statistics.service.ts:382,403](Apps/api/src/modules/statistics/statistics.service.ts#L382) | ❌ float |
| `ACTIVATOR_ROUTES.GET_ALL` / `GET_BY_ID` / `MY_STATS` | `avgActivationTimeSeconds` `z.number()` ([activator.dtos.ts:15,58](Apps/contract/src/modules/activator/activator.dtos.ts#L15)) | `computeAvgSeconds()` [activator.service.ts:39-48](Apps/api/src/modules/activator/activator.service.ts#L39-L48) — `totalMs/n/1000` | ❌ float |

The float is why `formatTime`'s own comment says it must `Math.round` before the modulo.
§6 fixes it at the source.

---

## 1. The duration spec — the table every implementation must satisfy

**Rule:** `< 60 min → mm:ss` · `< 24 h → hh:mm:ss` · `≥ 24 h → dd:hh:mm:ss`.
**Order of operations, exactly:** reject non-finite → clamp negatives to `0` → `Math.round` →
bucket → pad.

| # | Input (seconds) | Output | Why |
|---|---|---|---|
| 1 | `null` | `—` | no duration exists (in-progress / never taken) |
| 2 | `undefined` | `—` | same as null; defensive |
| 3 | `NaN` | `—` | non-finite guard, before any arithmetic |
| 4 | `Infinity` / `-Infinity` | `—` | non-finite guard |
| 5 | `-1` | `00:00` | **clamp, do not sign** — negative means clock skew, not a real interval |
| 6 | `-86400` | `00:00` | clamp applies at every magnitude |
| 7 | `0` | `00:00` | boundary |
| 8 | `0.4` | `00:00` | rounds down |
| 9 | `0.5` | `00:01` | `Math.round` half-up |
| 10 | `59` | `00:59` | last second of the `mm:ss` band |
| 11 | `59.4` | `00:59` | float from an avg, rounds down |
| 12 | `60` | `01:00` | |
| 13 | `599` | `09:59` | |
| 14 | `3599` | `59:59` | **last second before the hour band** |
| 15 | `3599.6` | `01:00:00` | rounds to 3600 **first**, then buckets — rounding precedes bucketing |
| 16 | **`3600`** | **`01:00:00`** | boundary is inclusive on the hour band |
| 17 | `3661` | `01:01:01` | |
| 18 | `36000` | `10:00:00` | two-digit hours, no day yet |
| 19 | `86399` | `23:59:59` | last second before the day band |
| 20 | **`86400`** | **`01:00:00:00`** | boundary is inclusive on the day band |
| 21 | `90061` | `01:01:01:01` | |
| 22 | `8639999` (99 d 23:59:59) | `99:23:59:59` | last 2-digit day |
| 23 | `8640000` (100 d) | `100:00:00:00` | **days are never truncated and never clamped** — the field widens to 3+ digits |
| 24 | `864000000` (10 000 d) | `10000:00:00:00` | still no truncation |

**Padding rules.** `ss`, `mm`, `hh` are always exactly 2 digits, zero-padded. `dd` is
zero-padded to a **minimum** of 2 and grows without limit (rows 23–24). No locale formatting,
no thousands separators, no `Intl` — this is a fixed-width technical readout, and it must be
byte-identical in EN and FR.

**The `—` placeholder** is U+2014 EM DASH, exported as a named constant (`DURATION_EMPTY`), not an
inline literal, so it satisfies the no-magic-strings rule. It is punctuation, not copy: it is
**not** a translation key and must not go through `t()`.

---

## 2. Where the formatter lives — recommendation

> **`Apps/web/src/lib/duration.ts` — one new frontend module, ONE implementation.**

```ts
export const DURATION_EMPTY = "—";
export function formatDuration(seconds: number | null | undefined): string
```

**Why there, and why only one:**

1. **The contract cannot hold it.** `contract-rules.md` §6.1 — zero logic, no functions with
   behaviour. A formatter is behaviour. This is not negotiable and D4 already excludes it.
2. **The backend has no reason to hold it.** §0.4 proves every duration-bearing endpoint already
   returns raw seconds and formats nothing. Formatting is a render-edge concern, which
   `front-end-rules.md` §1 places in `src/lib/`.
3. **One Vite app covers both audiences.** Admin pages and activator pages are the same bundle,
   so a single module genuinely serves all 17 sites in §0.3 — no package plumbing, no new
   build target, no new dependency.
4. **Not `lib/utils.ts`.** That file is already a grab-bag (`cn`, money, dates, blobs, wilaya
   labels). `lib/duration-tone.ts` sitting next to it is the established precedent for splitting
   duration concerns into their own module. `back-end-rules.md` §13.3 names "god utils" as an
   anti-pattern for the same reason.

**A second implementation is NOT needed for this set.** It would only become necessary if Set 6's
Telegram templates render a duration server-side. If that survives the Set 6 plan, mirror it as
`Apps/api/src/common/utils/duration.utils.ts` (`back-end-rules.md` §9 sanctions pure domain-split
utils under `common/utils/`) and make **this table** the shared contract both must satisfy. Do not
create a workspace package for a 20-line pure function.

**`formatTime` is deleted, not kept as an alias.** Leaving a second entry point is exactly how the
spec drifts on day one (v2-decisions.md R17). All 8 `formatTime` call sites move to
`formatDuration` in this set, and `LiveTimer`'s inline copy is replaced by a call to the same
function.

---

## 3. Contract changes

### 3.1 `ActivationDetailResponseSchema` — built field by field

File: [activation.dtos.ts](Apps/contract/src/modules/activation/activation.dtos.ts). Fields marked
**NEW** do not exist today.

| Field | Type | New? | Source | Note |
|---|---|---|---|---|
| `id` | `z.uuid()` | | `Activation.id` | |
| `state` | `z.enum(ActivationStat)` | **NEW** | `Activation.activationStat` | replaces the frontend's `timeline.at(-1)?.stat` guess ([ActivationDetailPage.tsx:67](Apps/web/src/pages/admin/activations/ActivationDetailPage.tsx#L67)) |
| `client` | `ClientBlockSchema` | | `clientFullName`, `clientPhone` | unchanged |
| `distributor` | `DistributorBlockSchema` | | `card.distributor` + wilaya/commune | unchanged |
| `activator` | `z.object({id, fullName}).nullable()` | | `Activation.activator` | unchanged |
| `card` | `CardChainSchema` (below) | **NEW** | `card` → `set` → `lot` | the "card → set → lot → distributor chain" the set scope asks for |
| `timing.requestedAt` | `z.iso.datetime()` | **NEW** | `Activation.requestedAt` | |
| `timing.takenAt` | `z.iso.datetime().nullable()` | **NEW** | `Activation.takenAt` | |
| `timing.completedAt` | `z.iso.datetime().nullable()` | **NEW** | `Activation.completedAt` | |
| `timing.durationSeconds` | `z.number().int().nullable()` | **NEW** | `durationSeconds()` helper | **integer seconds**; `null` while in progress |
| `activationEmail` | `z.string().nullable()` | **NEW** | `Activation.activationEmail` | already on `RecentActivationDTO`; absent from detail |
| `submittedInformation` | `z.array(AccountFieldValueSchema)` | | `resolveLatestWinsInfo()` | **masking removed (D3)** |
| `timeline` | `z.array(TimelineEntrySchema)` | | `steps` desc | **masking removed (D3)** |
| `cardHistory` | `z.array(CardHistoryEntrySchema)` | | `buildCardHistory()` | unchanged |
| `financial.activationPrice` | `z.number().nullable()` | | `Activation.activationPrice` | unchanged |
| `financial.commissionTierLabel` | `z.string().nullable()` | | `computeCommission()` | unchanged |

New sub-shape, in the same file, above `ActivationDetailResponseSchema`:

```
CardChainSchema = {
  key:        z.string(),            // RAW key — admin only, mirrors AdminActivationDTO.key
  setNumber:  z.string(),            // Set.setNumber
  lotNumber:  z.string().nullable(), // Lot.lotNumber — nullable, Card.lotId is optional
  subscriptionLabel: z.string(),     // composeSubscriptionLabel(plan)
}
```

`timing` is a nested object (not four flat fields) so the frontend can pass one prop to a
`TimingBlock` component, matching how `financial` already works.

### 3.2 The explanatory note — verbatim, above `ActivationDetailResponseSchema`

This is the artefact v2-decisions.md **R3** exists to create. It must be a comment in the DTO
file, not only in this plan.

```
// PASSWORD and OTP values appear here in the clear, and that is deliberate — do not "fix" it.
// These are the client's own Snapchat credentials, which the client changes after activation;
// they are NOT system secrets. They already reach the public client (KeyVerificationDTO
// .submittedFields, key-gated) and the assigned activator (ActiveRequestDTO.accountFields)
// unmasked, so masking them here made the admin the least-privileged reader of data the client
// typed. Decision D3, v2-decisions.md §D3 + R3 — an explicit, informed override of the
// schema.prisma "activator-only exposure" comments. contract-rules.md §3.5/§6.5 still applies in
// full to User.password, RefreshToken.tokenHash and JWTs; none of those appear in any DTO.
```

### 3.3 Route constant

**No new route.** `ACTIVATION_ROUTES.GET_BY_ID = '/:id'`
([activation.routes.ts:24](Apps/contract/src/modules/activation/activation.routes.ts#L24)) already
exists, is already `adminOnly`, and already returns `ActivationDetailDTO`. This set enriches that
response.

Per the prompt: **no separate "secrets" route, no reveal gate, no second fetch.** One admin
endpoint returns the whole thing.

### 3.4 Statistics / activator DTOs — tighten to integer seconds

Add `.int()` to the five float fields listed in §0.4:
`statistics.dtos.ts:66` `avgDurationSeconds` · `:94` `avgTimeTrend[].avgSeconds` · `:110`
`avgActivationTimeSeconds` · `activator.dtos.ts:15` and `:58` `avgActivationTimeSeconds`.

These are `.parse()`d on the way out by their mappers, so §6's backend rounding must land in the
same set or the responses throw.

### 3.5 Contract checklist

- No new module, no new barrel entry — everything is in existing files, so `index.ts` is untouched.
- No cross-module import added → `madge --circular src` risk is nil, but still run it.
- `exactOptionalPropertyTypes` (R12): every new field is required-or-`.nullable()`, never
  `.optional()`, so the `...(x && {y})` spread idiom is not needed here.

---

## 4. Backend changes

### 4.1 `activation.mapper.ts`

| Change | Detail |
|---|---|
| **Delete `SENSITIVE_FIELDS`** (`:38-41`) | Its only consumer is `maskValue`. |
| **Delete `maskValue()`** (`:85-88`) | Three call sites: `:334`, `:341`, `:345`. Replace each with `value: x.value ?? ''` — the same `?? ''` normalisation `toActiveRequestDTO` already uses at `:220`. |
| **Keep `maskKey()`** (`:81-83`) | Different concern (card key on the *pending* feed). `toPendingDTO` and `toRecentDTO` keep using it. `toActivationDetailDTO` gets the **raw** key, matching `toAdminActivationDTO` (`:300`). |
| **Extend `toActivationDetailDTO` signature** | Add a `card: ActivationCardChainJoin` param and a `timing` param; widen the `activation` param to carry `activationStat`, `requestedAt`, `takenAt`, `completedAt`, `activationEmail`. |
| **Reuse `durationSeconds()`** (`:95-98`) | Already exists and already rounds. Do **not** write a second one. |
| **New exported join type** | `ActivationCardChainJoin = { key: string; set: { setNumber: string }; lot: { lotNumber: string } \| null; subscriptionPlan: ActivationPlanJoin }`, next to the other `*Join` types at `:53-73`. |

`toActivationDetailDTO` still ends with `ActivationDetailResponseSchema.parse(dto)` — that
outgoing-response validation (`back-end-rules.md` §12.1) is what will catch a missed field.

### 4.2 `activation.service.ts` — `getById()`

**The current query is already a single `findUnique` with nested includes — one round trip, no
N+1.** ([activation.service.ts:1093-1121](Apps/api/src/modules/api/../modules/activation/activation.service.ts#L1093-L1121)).
Everything this set adds is **already inside that include tree**:

| DTO addition | Already loaded? | Action |
|---|---|---|
| `card.key` | ✅ `activation.card.key` | read it |
| `card.setNumber` | ✅ `card.include.set: true` | narrow `set: true` → `set: { select: { setNumber: true, createdAt: true, printedAt: true } }` |
| `card.lotNumber` | ✅ `card.include.lot` | add `lotNumber` to the lot selection |
| `card.subscriptionLabel` | ✅ `card.include.subscriptionPlan` | read it |
| `state`, `requestedAt`, `takenAt`, `completedAt`, `activationEmail` | ✅ scalars on the root row | read them |

**Include/select plan — the exact shape, one query:**

```
activation.findUnique({ where: { id }, include: {
  card: { include: {
    set:  { select: { setNumber: true, createdAt: true, printedAt: true } },
    lot:  { select: { lotNumber: true, createdAt: true,
            orderLots: { take: 1, select: { order: { select: { completedAt: true } } } } } },
    subscriptionPlan: { include: { commissions: { include: { commissionDuration: true } } } },
    distributor: { include: { wilaya: true, commune: true } },
  }},
  activator: { select: { id: true, fullName: true } },
  information: true,
  steps: { orderBy: { createdAt: 'desc' }, include: { wrongInformation: true, additionalInformation: true } },
}})
```

**N+1 rules for this endpoint, to be checked in review:**
1. **One `findUnique`, zero follow-up queries.** No `await` inside any `.map()` in `getById`.
2. `set` and `lot` move from bare `true` to explicit `select` — `buildCardHistory()`
   ([:214-243](Apps/api/src/modules/activation/activation.service.ts#L214-L243)) reads
   `set.createdAt`, `set.printedAt`, `lot.createdAt` and `lot.orderLots[0].order.completedAt`,
   so those four **must** stay in the select or card history silently empties. This is the one
   real regression risk in the whole set.
3. `steps.orderBy: createdAt desc` is what the timeline order depends on **and** what
   `resolveLatestWinsInfo`'s `[...steps].reverse()` depends on. Do not change it.
4. `commissions.commissionDuration` stays — `computeCommission()` needs it for
   `commissionTierLabel`.

Everything else in `getById` (the `resolveLatestWinsInfo` call, `buildDistributorJoin`,
`buildCardHistory`, `computeCommission`) is unchanged; only the mapper call site grows arguments.

### 4.3 The ADMIN guard

**Already correct, no change:**
[activation.routes.ts:96-101](Apps/api/src/modules/activation/activation.routes.ts#L96-L101) —
`GET_BY_ID` is `adminOnly = requireAuth({ roles: [UserRole.ADMIN] })` with
`validateRequest({ params: ActivationActionParamsSchema })`. An activator gets `403 AUTH_FORBIDDEN`
from `requireAuth` before the controller runs (manual test 4).

Two things to **verify, not change**, since this set widens what the endpoint returns:
- `GET_BY_ID` is registered **after** the static GETs (`:75-93`) so `/pending`, `/active`,
  `/my-history`, `/recent` aren't swallowed by `/:id`. Adding fields doesn't move it — just
  don't reorder.
- `activatorOrAdmin` (`:34`) is used by `GET_PENDING`/`GET_RECENT` only. It must **not** spread
  to `GET_BY_ID`.

### 4.4 Statistics / activator — round to integer seconds

| File | Line | Change |
|---|---|---|
| [statistics.service.ts:41](Apps/api/src/modules/statistics/statistics.service.ts#L41) | `avgSeconds()` | `return Math.round(total / valid.length / 1000)` |
| [statistics.service.ts:262](Apps/api/src/modules/statistics/statistics.service.ts#L262) | trend accumulator | keep the float in the accumulator; round at `:298` where the bucket average is emitted |
| [statistics.service.ts:382,403](Apps/api/src/modules/statistics/statistics.service.ts#L382) | wilaya `avgActivationTimeSeconds` | `Math.round` the emitted average |
| [activator.service.ts:48](Apps/api/src/modules/activator/activator.service.ts#L48) | `computeAvgSeconds()` | `return Math.round(totalMs / completed.length / 1000)` |

**Round once, at emission** — never round each sample then average, which drifts. Null stays null
(`computeAvgSeconds` returns `null` for an empty set; keep that).

### 4.5 Password / OTP containment

Unmasking is scoped to `toActivationDetailDTO` and **nothing else**. Explicitly:
- No password or OTP value in any `Log.actionDescription` — this set writes no log rows at all.
- No password or OTP in a Pino line. The logger's `redact` list
  ([logger.ts](Apps/api/src/common/config/logger.ts)) covers `req.body.password`; nothing in this
  set logs a response body.
- `AdminActivationDTO`, `RecentActivationDTO`, `ActivatorHistoryItemDTO`, `PendingActivationDTO`
  gain no information fields.
- `schema.prisma`: update the three `// SENSITIVE: … activator-only exposure` comments on
  `ActivationInformation.value`, `WrongInformation.value`, `AdditionalInformation.value` to say
  "activator, client (key-gated) and **admin** exposure — see D3". **Comment-only, no migration.**

---

## 5. Frontend changes

### 5.1 `lib/duration.ts` — the new module

Exports `DURATION_EMPTY` and `formatDuration(seconds)`. Implements §1's table exactly.
Sole owner of duration→string in the app. `lib/utils.ts` loses `formatTime` entirely.

### 5.2 `LiveTimer` — consume the formatter

[LiveTimer.tsx](Apps/web/src/components/shared/LiveTimer.tsx): keep the 1 s interval, keep
`toneClass(total / 60, mode)`, keep the `Clock` icon and `font-mono`. Replace the four lines that
build `text` with `formatDuration(total)`. This is v2-decisions R17 — if this one component is
missed, sites 1, 6, 12–16 keep the old format and the "one spec" goal fails immediately.

### 5.3 Admin activation detail — structure

[ActivationDetailPage.tsx](Apps/web/src/pages/admin/activations/ActivationDetailPage.tsx) keeps its
shape: one `useActivationDetail(id)` query drives the page, one skeleton region, one
`<NotFoundState/>`. Layout must survive loading and error (`front-end-rules.md` §4) — the skeleton
grid grows from 4 to 6 tiles.

```
PageHeader  ── title + StatusBadge(detail.state)          ← state now comes from the DTO,
                                                             not timeline.at(-1)
grid lg:grid-cols-2
  ClientBlock          (unchanged)
  DistributorBlock     (unchanged)
  ActivatorBlock       (unchanged)
  CardChainBlock       NEW — key · setNumber · lotNumber · subscriptionLabel
  TimingBlock          NEW — requestedAt · takenAt · completedAt · duration · activationEmail
  FinancialBlock       (unchanged) + SetActivatorPriceModal trigger

SubmittedInformationList   ← values now raw; PASSWORD/OTP visible
ActivationTimeline         ← wrongFields/additionalFields values now raw
CardHistoryTimeline        (unchanged)
```

- **`SubmittedInformationList`** keys its `<div>` on `field.fieldLabel`. Values are now raw, so
  render `field.value` directly and use `font-mono` for it (a password with spaces or lookalike
  characters must be readable/selectable). **No reveal toggle, no blur, no copy-gate** — the prompt
  forbids a reveal gate. An empty value renders as `DURATION_EMPTY`'s sibling: an em dash from a
  local `EMPTY_VALUE` constant, not an inline literal.
- **`ActivationTimeline`** needs no structural change — its `{f.fieldLabel}: {f.value}` lines just
  stop saying `****`.
- **`CardChainBlock`** and **`TimingBlock`** are new files under
  `pages/admin/activations/components/`, matching the existing block components exactly
  (`rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]`, `<h3>` + `<dl>`).
- `canSetPrice` now reads `COMPLETED_STATES.has(detail.state)` instead of the
  `timeline.at(-1)?.stat` derivation. Delete the stale comment at
  [ActivationDetailPage.tsx:65-67](Apps/web/src/pages/admin/activations/ActivationDetailPage.tsx#L65-L67).

**Where the formatter applies on this page:** exactly one site — `TimingBlock`'s
`formatDuration(detail.timing.durationSeconds)`. `requestedAt`/`takenAt`/`completedAt` are
timestamps, so they keep `formatDateTime(iso, language)`.

### 5.4 Every call-site migration (the §0.3 table, resolved)

| Sites | Change |
|---|---|
| 2, 3, 4, 5, 7, 8, 9, 10, 11 | `formatTime(x)` → `formatDuration(x)`; drop the `? … : "—"` ternaries at sites 2 and 3 — `formatDuration(null)` already returns `DURATION_EMPTY` |
| 1, 6, 12, 13, 14, 15, 16 | no edit — they use `LiveTimer`, which is fixed once in §5.2 |
| 17 | `StatsRow.tsx:46`'s hardcoded `"3:24"` — see Open Question Q1 |
| — | `AvgTimeTrendChart` axis (site 10): a `dd:hh:mm:ss` tick is wide. Set `width={96}` on the `YAxis` so long ticks aren't clipped; the tooltip (site 11) is unconstrained |
| — | `ActivatorsTable` (site 8) and `StatsRevenueGrid` (site 9) keep `durationToneClass(...)` on the wrapper — colour is independent of text |

### 5.5 Translation keys

`Apps/web/src/config/translations.json` — flat `key → {en, fr, ar}`, `ar` present as `""`
(front-end-rules §6B). Existing `admin.activationDetail.*` keys (18 of them) are reused as-is.

| Key | en | fr |
|---|---|---|
| `admin.activationDetail.card.title` | Card | Carte |
| `admin.activationDetail.card.key` | Card Key | Clé de la carte |
| `admin.activationDetail.card.set` | Set | Lot d'impression |
| `admin.activationDetail.card.lot` | Lot | Lot |
| `admin.activationDetail.card.plan` | Subscription | Abonnement |
| `admin.activationDetail.timing.title` | Timing | Chronologie |
| `admin.activationDetail.timing.requestedAt` | Requested At | Demandé le |
| `admin.activationDetail.timing.takenAt` | Taken At | Pris en charge le |
| `admin.activationDetail.timing.completedAt` | Completed At | Terminé le |
| `admin.activationDetail.timing.duration` | Duration | Durée |
| `admin.activationDetail.timing.activationEmail` | Activation Email | E-mail d'activation |
| `admin.activationDetail.timing.inProgress` | In progress | En cours |
| `admin.activationDetail.state` | Status | Statut |

`fr` for `card.set` is deliberately *not* "Set" — the domain word for a printed batch is
"lot d'impression", and plain "Lot" is already taken by `Lot`. Confirm this wording with the
user before shipping (Open Question Q2).

No key is needed for the duration string itself, the em dash, or any field label inside
`submittedInformation` / `timeline` — those labels come from the backend's `FIELD_LABEL` map
([mapper:29-36](Apps/api/src/modules/activation/activation.mapper.ts#L29-L36)) and are English-only
today (a pre-existing gap, not this set's to fix).

### 5.6 Frontend architecture compliance

- No new service, hook or query key. `useActivationDetail(id)` and
  `qk.activations.detail(id)` already exist; the response just gets wider.
- Read-only set → no mutation, no invalidation change.
- No `useEffect` fetching. `LiveTimer`'s existing `useEffect` is a timer, not a fetch — it stays.
- No new library.

---

## 6. Endpoints changing their return unit, and every UI site that must change

### 6.1 Endpoints changing **unit**: none

Every duration-bearing endpoint already returns seconds (§0.4). There is no minutes→seconds or
ms→seconds conversion anywhere in this set.

### 6.2 Endpoints changing **type** — float seconds → integer seconds (5 fields, 4 endpoints)

| Endpoint | Field | Contract | Backend |
|---|---|---|---|
| `STATISTICS_ROUTES.ACTIVATIONS_SUMMARY` | `avgDurationSeconds` | `.int()` | `statistics.service.ts:41` |
| `STATISTICS_ROUTES.OVERVIEW` | `avgTimeTrend[].avgSeconds` | `.int()` | `statistics.service.ts:298` |
| `STATISTICS_ROUTES.WILAYA_HEATMAP` | `avgActivationTimeSeconds` | `.int()` | `statistics.service.ts:403` |
| `ACTIVATOR_ROUTES.GET_ALL` / `GET_BY_ID` | `avgActivationTimeSeconds` | `.int()` | `activator.service.ts:48` |
| `ACTIVATOR_ROUTES.MY_STATS` | `avgActivationTimeSeconds` | `.int()` | `activator.service.ts:441` (same helper) |

**Contract and backend must land together** — the DTO schemas are `.parse()`d on the way out, so
adding `.int()` without the `Math.round` throws a 500 on the next dashboard load.

### 6.3 Endpoint changing **shape**: one

`ACTIVATION_ROUTES.GET_BY_ID` gains `state`, `card`, `timing`, `activationEmail`, and stops masking
`submittedInformation` / `timeline[].wrongFields` / `timeline[].additionalFields`.

### 6.4 Every UI site that must change

Sites **2, 3, 4, 5, 7, 8, 9, 10, 11** (direct `formatTime` calls) · **1** (`LiveTimer`, which
transitively fixes 6, 12, 13, 14, 15, 16) · **17** (pending Q1) · plus
`ActivationDetailPage.tsx` + two new block components + `SubmittedInformationList.tsx`
(font-mono) + `lib/utils.ts` (`formatTime` deleted).

---

## 7. Open questions

**Q1 — `StatsRow.tsx:46` hardcodes `"3:24"` as the public landing page's "average activation
time".** It is marketing copy, not live data. Options: (a) leave it exactly as is — out of scope;
(b) move the literal into `translations.json` so it stops being an inline string in JSX; (c) wire
it to a real public statistic (new public endpoint — clearly out of scope). **Recommend (b)** — it
costs one key, removes a genuine rules violation, and doesn't pretend the number is real.

**Q2 — French wording for `card.set`.** `Set` and `Lot` are distinct domain objects with
near-identical French translations. This plan proposes "Lot d'impression" / "Lot". Please confirm,
or give the wording you actually use with distributors.

**Q3 — `FIELD_LABEL` is English-only and lives on the backend**
([mapper:29-36](Apps/api/src/modules/activation/activation.mapper.ts#L29-L36)). So
`submittedInformation[].fieldLabel` renders as "Password"/"Username" even in FR, on both the admin
detail and the activator card. Pre-existing, not created by this set. Fix it by returning the
`AccountInformation` **enum** alongside the label (the client-facing `SubmittedFieldSchema` already
does exactly that) and translating on the frontend. **Recommend: note it, do not fix it here** —
it touches `ActiveRequestDTO` and the activator card, which this set otherwise leaves alone.

**Q4 — days field width in a table cell.** A 3-digit day count (`100:00:00:00`, 13 chars) is wider
than the current duration columns allow. Sites 5 and 2/3 are table cells. Confirm truncation is
**not** acceptable (this plan assumes it is not, per §1 row 23) and accept a wider column /
horizontal scroll on admin tables, which `front-end-rules.md` §6C already permits.

**Q5 — frozen tests.** `Apps/web/tests/unit/lib/utils.spec.ts` tests `formatTime`, which this set
deletes; the two conformance suites break on the `ActivationDetailDTO` change; the statistics and
activator unit tests assert float averages. All four are expected breakages under CLAUDE.md's test
freeze — **do not touch them.** Verify with `git status` that no test file changed.

---

## 8. Manual test checklist

1. **`< 1 h`** — open an activation whose duration is under an hour → Timing block shows `mm:ss`
   (e.g. `07:32`), no hour segment.
2. **`~3 h`** — an activation taken ~3 h before completion → `03:0x:xx` in `hh:mm:ss`, three
   segments.
3. **`> 24 h`** — an activation spanning more than a day → `dd:hh:mm:ss`, four segments.
4. **Hour boundary** — an activation of exactly 3600 s renders `01:00:00`, **not** `60:00`.
5. **Day boundary** — exactly 86400 s renders `01:00:00:00`, **not** `24:00:00`.
6. **In-progress / null** — open an activation that is `PENDING` or `PROCESSING` (no
   `completedAt`): Duration shows `—`. **No `NaN:NaN`, no `00:NaN`, no crash, no blank card.**
7. **Password visible** — an activation where the client submitted a PASSWORD: Submitted
   Information shows the real password in monospace, not `****`. Select it and copy it — the full
   value is selectable.
8. **OTP visible** — an activation that went through `ADDITIONAL_INFORMATION`: the OTP value is
   readable in the timeline entry and in Submitted Information, not `****`.
9. **403 for activator** — log in as an activator, hit `/admin/activations/<id>` directly →
   `AdminGuard` bounces to `/dashboard`; hit the API route with the activator's token →
   `403 AUTH_FORBIDDEN`.
10. **Timeline order** — the timeline entries are ordered by `ActivationStep.createdAt` descending
    and match the DB rows for that activation exactly.
11. **Card chain** — the Card block shows the raw card key, the correct set number, the correct lot
    number (or `—` for a card never assigned to a lot), and the right subscription label.
12. **Card history did not regress** — the Card History timeline still renders IN_SET → PRINTED →
    IN_LOT → AT_DISTRIBUTOR → ACTIVATION_PROGRESS → terminal. (This is what the `set`/`lot`
    `select` narrowing in §4.2 could silently break.)
13. **Activator portal, same format** — activator History page duration column and Dashboard "avg
    time" card use the identical format as admin. Compare one activation side by side in both
    portals: byte-identical string.
14. **Live timers** — the pending pool timer (activator Requests page *and* admin dashboard) and
    the active-request elapsed timer tick every second and roll `59:59 → 01:00:00` correctly. Leave
    one open past the hour mark to confirm.
15. **Colour thresholds intact** — a fresh pending request is green, one past 5 min amber, past
    15 min red. Formatting changed; `duration-tone.ts` did not.
16. **Statistics integers** — admin Statistics page avg-time trend chart and the Activations page
    "avg duration" stat render clean values with no fractional artefacts; the Wilaya heatmap
    tooltip's avg time likewise.
17. **Set price still works** — the Set Activator Price modal still opens for a completed
    activation and is hidden for a live one (the `state` source changed in §5.3).
18. **Layout survives** — reload the detail page with the network throttled: the 6 skeleton tiles
    hold the layout; then load a bad id: `NotFoundState` renders *inside* the content area with the
    header still present.

---

## 9. Definition of done

- `npx tsc --noEmit` clean in `Apps/contract`, `Apps/api`, `Apps/web`
- eslint clean in all three
- `npx madge --circular src` clean in `Apps/contract`
- **No migration** (schema comments only)
- No test file created, modified, deleted or run — verify with `git status`
- No magic strings in changed files (`DURATION_EMPTY`, `EMPTY_VALUE`, translation keys, route
  constants)
- `formatTime` no longer exists anywhere in `Apps/web/src`
- Report: files changed grouped by package, open questions, and the §8 checklist, under
  `Docs/Stage-04-fix/results/set-2/`
- **Stop. Do not start Set 3.**
