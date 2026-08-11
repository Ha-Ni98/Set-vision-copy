# Set 8 — Lot creation card picker: available cards grouped by set, searchable, bulk-selectable

**Depends on:** nothing hard · **Touches:** contract, api, web
**Schema change:** none · **Migration:** none · **Contract change:** yes (card DTOs + query, lot command)
**Date:** 2026-08-10 · **Branch:** `version-02-01`

**Confirmed decision (this session):** there is **no lot-capacity concept** and none is being
introduced. The counter reads *selected / available*. See §4.3.

---

## 1. Audit — the lot creation flow as it exists today

### 1.1 End to end

| Layer | File | What it does |
|---|---|---|
| Contract — command | [lot.command.ts:3-7](Apps/contract/src/modules/lot/lot.command.ts#L3-L7) | `CreateLotSchema = { subscriptionPlanId: z.uuid(), cardIds: z.array(z.uuid()).nonempty() }`. **No duplicate guard** — see §5.4. |
| Contract — read | [card.query.ts:17-20](Apps/contract/src/modules/card/card.query.ts#L17-L20) | `GetAvailableCardsQuerySchema = { subscriptionPlanId: z.uuid() }` — one field, no paging, no search |
| Contract — DTO | [card.dtos.ts:31-36](Apps/contract/src/modules/card/card.dtos.ts#L31-L36) | `AvailableCardDTO = { id, key, subscriptionLabel }` |
| Contract — route | [card.routes.ts:4](Apps/contract/src/modules/card/card.routes.ts#L4) | `CARD_ROUTES.GET_AVAILABLE_FOR_LOT = '/available-for-lot'` |
| Backend — read | [card.service.ts:109-125](Apps/api/src/modules/card/card.service.ts#L109-L125) | `getAvailableForLot()` — flat, **unpaged**, `orderBy createdAt asc`, returns the entire pool in one array |
| Backend — write | [lot.service.ts:72-123](Apps/api/src/modules/lot/lot.service.ts#L72-L123) | `create()` — plan check, card fetch, per-card validation loop, then `$transaction { lot.create + card.updateMany }` |
| Web — service | [cards.service.ts:42-52](Apps/web/src/services/cards.service.ts#L42-L52) | `getAvailableForLot(query)` |
| Web — hook | [useCards.ts:15-22](Apps/web/src/hooks/useCards.ts#L15-L22) | `useAvailableCardsForLot(planId)`, `enabled: !!planId` |
| Web — UI | [CreateLotModal.tsx](Apps/web/src/pages/admin/activations/components/CreateLotModal.tsx) | Plan `<Select>` → flat scroll list of checkboxes in a `max-h-64` div, global Select-all / Deselect-all, `{count} of {total} selected` |

`GET_AVAILABLE_FOR_LOT` and `AvailableCardDTO` have **exactly one consumer each** —
`CreateLotModal` via `useAvailableCardsForLot`. Nothing else in `Apps/web` or `Apps/api` reads
either. That is what makes replacing the shape in place (rather than adding a parallel endpoint)
the clean option under CLAUDE.md's "prefer a clean schema over a backward-compatible one".

### 1.2 Everything wrong with it today

1. **No grouping.** A flat list of 8-character keys with no set, no date, no structure.
2. **No paging and no server-side cap.** Every eligible card for the plan is serialised into one
   JSON array on every open. A plan with 20 outstanding sets of 100 is 2 000 objects.
3. **No search.** The only way to find a key is to scroll.
4. **`cardIds.includes(id)` per row** ([CreateLotModal.tsx:163](Apps/web/src/pages/admin/activations/components/CreateLotModal.tsx#L163)) —
   O(n) membership inside an O(n) map, i.e. **O(n²) per render**. At 2 000 cards each keystroke or
   checkbox click costs ~4 000 000 string comparisons. This, not the DOM size, is the actual lag
   source, and it is fixed by a data-structure change, not a library (§6).
5. **`Select all` selects the whole pool**, because the pool is all there is. There is no
   per-set semantic.
6. **The read predicate and the write validator disagree** — see §2.2. The read excludes disabled
   and soft-deleted cards; `create()` does not check either. A disabled card cannot be picked in
   the UI but *can* be submitted directly and will be assigned to a lot.
7. **The conflict error names a UUID and stops at the first failure**
   ([lot.service.ts:89-99](Apps/api/src/modules/lot/lot.service.ts#L89-L99)):
   `Card 3f2b…-…-… is already assigned to a lot`. Useless to a human, and it hides the other 11
   cards that also failed.
8. **Check-then-write race.** The validation loop reads outside the transaction
   ([:80](Apps/api/src/modules/lot/lot.service.ts#L80)); the `updateMany` inside the transaction
   ([:114](Apps/api/src/modules/lot/lot.service.ts#L114)) is keyed on `id` alone and re-asserts
   nothing. Two admins submitting overlapping selections both succeed, and the second silently
   steals the cards out of the first lot — `Lot.nbOfCards` then lies for the first lot.

### 1.3 Existing card query/filter schemas in the contract

| Schema | Fields | Reused by Set 8? |
|---|---|---|
| `GetCardsQuerySchema` | `page`, `limit`, `search`, `state`, `setNumber`, `lotNumber`, `distributorId`, `subscriptionPlanId`, `flag` | **No** — admin card browser, `contains` search, ungrouped. Its `page`/`limit`/`search` *conventions* are mirrored. |
| `GetAvailableCardsQuerySchema` | `subscriptionPlanId` | **Yes — extended** (§2.4) |
| `GetDistributorCardsQuerySchema` | `page`, `limit`, `search`, `cardStat`, `subscriptionPlanId`, `flag` | No |
| `CardIdParamsSchema` | `id` | No |

Convention to follow, taken from all three list schemas:
`page: z.coerce.number().int().min(1).max(100).default(1).optional()`,
`limit: z.coerce.number().int().min(1).max(100).default(10).optional()`.

### 1.4 Reference points already in the codebase

- **`ConflictError(message, details)`** ([errors/index.ts:86-90](Apps/api/src/common/errors/index.ts#L86-L90))
  carries an arbitrary `details` payload straight through `globalErrorHandler` into
  `ApiResponse.error.details`. `SetService.create()` already uses it for `{ takenKeys }`
  ([set.service.ts:66-68](Apps/api/src/modules/set/set.service.ts#L66-L68)), and
  `CreateSetModal` already parses it ([CreateSetModal.tsx:39-49](Apps/web/src/pages/admin/activations/components/CreateSetModal.tsx#L39-L49)).
  **§5 is that pattern, typed.**
- **`CreateSetModal`** already renders up to `MAX_KEYS_PER_SET = 1000` rows of *three* interactive
  controls each, with no virtualization, and is acceptable in practice. Our rows are one checkbox
  and one `<span>`. That is the empirical bound for §6.
- **`generateCardKey()`** ([set.util.ts:45-48](Apps/api/src/modules/set/set.util.ts#L45-L48)) and
  `CARD_KEY_PATTERN = /^[A-Z0-9]{8}$/` ([set.command.ts:8](Apps/contract/src/modules/set/set.command.ts#L8)) —
  keys are **always 8 uppercase alphanumerics**. This is what makes §3 tractable.
- **Module → module imports are established**: `card.mapper.ts` imports `composeSubscriptionLabel`
  from `@modules/set/set.mapper`, and `revokeCardWithin` is exported from `card.service.ts` for the
  revocation-request module. Only `common/ → modules/` is forbidden (back-end-rules §13.1).

---

## 2. The eligibility predicate

### 2.1 Exactly as it will appear in the Prisma where clause

New file **`Apps/api/src/modules/card/card.eligibility.ts`**:

```ts
import { CardStat as PrismaCardStat, type Prisma } from '@prisma/client';

/**
 * THE definition of "this card may be put into a lot". One expression, two callers:
 * CardService.getAvailableForLot() (what the picker is allowed to show) and
 * LotService.create() (what the server is willing to assign). They were allowed to drift
 * before this set — the read excluded isDisabled/deletedAt and the write did not — so a
 * disabled card could not be picked but could be submitted. Never inline any part of this.
 */
export const lotEligibleCardWhere = (subscriptionPlanId: string): Prisma.CardWhereInput => ({
  subscriptionPlanId,
  cardStat: PrismaCardStat.PRINTED,
  lotId: null,
  isDisabled: false,
  isRevoked: false,
  deletedAt: null,
});
```

Read in English: *a card belongs to the requested plan, has been printed, is not already in a
lot, is not disabled, is not revoked, and is not soft-deleted.*

### 2.2 Why each clause, and what changes

| Clause | Source | Change vs today |
|---|---|---|
| `subscriptionPlanId` | required by both read and write today | none |
| `cardStat: PRINTED` | both | none. `Set.transition(→PRINTED)` is the only producer ([set.service.ts:121-124](Apps/api/src/modules/set/set.service.ts#L121-L124)), so there is no need to also filter on `set.setStat`. |
| `lotId: null` | both | none |
| `isDisabled: false` | **read only** today | **`create()` now enforces it.** Behaviour change: a disabled card can no longer be assigned to a lot by a direct API call. |
| `isRevoked: false` | **neither** today | **New, and deliberately redundant.** `revokeCardWithin()` sets `cardStat: AT_DISTRIBUTOR` ([card.service.ts:55](Apps/api/src/modules/card/card.service.ts#L55)), so `PRINTED` already excludes every revoked card. It is written anyway for default-deny by construction — the same reasoning as `distributorVisibleKey`'s fall-through-to-null ([card.mapper.ts:29-42](Apps/api/src/modules/card/card.mapper.ts#L29-L42)). If a future path ever revokes without moving `cardStat`, this line is what stops the leak. |
| `deletedAt: null` | **read only** today | **`create()` now enforces it.** Behaviour change, same shape as `isDisabled`. |

Both behaviour changes are tightenings, they only affect requests the UI could never produce, and
they close a real gap. They are called out in §8 for your sign-off.

### 2.3 Indexes it uses

Already on `Card` ([schema.prisma:500-505](Apps/api/prisma/schema.prisma#L500-L505)):
`@@index([cardStat])`, `@@index([lotId])`, `@@index([setId])`, `@@index([subscriptionPlanId])`.
The planner has `subscriptionPlanId` and `cardStat` to narrow on and the rest are cheap boolean
filters. **No new index for the predicate.** (Search is a separate question — §3.)

### 2.4 The query schema

`Apps/contract/src/modules/card/card.query.ts`:

```ts
// `page`/`limit` page over SETS, not cards — see set-8-plan §2.5. `limit` is capped low on
// purpose: one page carries every eligible card of every set on it.
export const GetAvailableCardsQuerySchema = z.object({
  subscriptionPlanId: z.uuid(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).max(100).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(5).optional(),
});
```

### 2.5 Where the predicate is NOT allowed to live

The UI must never re-implement any part of it. `CardPicker` renders what the endpoint returns and
disables nothing on its own. The execute prompt says this too; it is restated here because the
current modal already half-breaks it by assuming everything returned is selectable.

---

## 3. The grouped response shape, and how paging works with grouping

### 3.1 Decision: **page the groups; every group carries all of its eligible cards**

Rejected alternatives and why:

| Option | Why not |
|---|---|
| **Page within a group** | Two page cursors on screen at once (which set, which page inside it). The admin's mental model is "I'm working through set SET-20260714-A31C", not "page 3 of set 4". |
| **Cap per group** (e.g. 50 cards, "show more") | **Kills select-all-in-set.** The button either lies (selects 50 of 180 while claiming "all") or needs a second round trip that the user did not ask for. Manual test 4 exists precisely to catch this. |
| **Page the groups, groups are complete** ✅ | Select-all-in-set is honest and purely local. Paging is one control. |

**Why it is safe at realistic volume.** A group is hard-bounded by
`MAX_KEYS_PER_SET = 1000` ([set.command.ts:9](Apps/contract/src/modules/set/set.command.ts#L9)),
and the create-set modal defaults to `DEFAULT_COUNT = 100`. With `limit` capped at 20 sets per
page and defaulting to 5:

| Scenario | Sets on page | Cards in payload |
|---|---|---|
| Typical (100-card sets, default limit 5) | 5 | ~500 |
| Heavy (500-card sets, default limit 5) | 5 | ~2 500 |
| Absolute worst case (`limit=20`, 1000-card sets) | 20 | 20 000 |

A card item is `{ id: uuid, key: 8 chars }` ≈ 70 bytes of JSON. The typical page is ~35 KB, the
heavy page ~175 KB, the pathological page ~1.4 MB — and the pathological page requires the admin
to deliberately raise `limit` to 20 *and* have twenty simultaneously-outstanding 1000-card sets on
one plan, which the create-set default makes very unlikely. The `limit` cap of 20 exists to bound
exactly this; it is not the `.max(100)` the other list schemas use.

### 3.2 The shape

`Apps/contract/src/modules/card/card.dtos.ts` — **replaces** `AvailableCardResponseSchema` /
`AvailableCardDTO` (single consumer, §1.1; no compatibility shim, per CLAUDE.md):

```ts
// Built field-by-field, not derived from CardResponseSchema (contract-rules §3.5). The plan is
// fixed by the query, so no subscriptionLabel per card — the modal already knows it.
export const AvailableCardItemSchema = z.object({
  id: z.uuid(),
  key: z.string(),
});
export type AvailableCardItemDTO = z.infer<typeof AvailableCardItemSchema>;

export const AvailableCardSetGroupSchema = z.object({
  setId: z.uuid(),
  setNumber: z.string(),
  setCreatedAt: z.iso.datetime(),
  // Always === cards.length. Explicit so the UI never has to infer "is this group complete?" —
  // it always is (set-8-plan §3.1), and select-all-in-set depends on that being unambiguous.
  availableCount: z.number().int(),
  cards: z.array(AvailableCardItemSchema),
});
export type AvailableCardSetGroupDTO = z.infer<typeof AvailableCardSetGroupSchema>;

// NOT built with paginated() — that factory is { items, meta } and this response pages over
// groups while also reporting a card-level total, which the factory cannot express.
export const AvailableCardsBySetSchema = z.object({
  groups: z.array(AvailableCardSetGroupSchema),
  // meta.total / meta.totalPages count SETS. meta.limit is sets per page.
  meta: PaginationMetaSchema,
  // Every eligible card for this plan under the current search, across all pages. This is the
  // denominator of the selection counter (§4.3) — never groups.length or a page sum.
  totalAvailableCards: z.number().int(),
});
export type AvailableCardsBySetDTO = z.infer<typeof AvailableCardsBySetSchema>;
```

### 3.3 Ordering

- **Groups: `Set.createdAt asc`, tie-broken by `Set.id asc`.** Oldest set first — FIFO stock
  rotation, and it preserves the intent of today's `orderBy: { createdAt: 'asc' }` on the flat
  list ([card.service.ts:119](Apps/api/src/modules/card/card.service.ts#L119)). The `id`
  tie-break matters: sets created in the same second must not reshuffle between page 1 and
  page 2. (Note this is the *opposite* of `SetsTable`'s newest-first — that is a browse view,
  this is a consumption view.)
- **Cards inside a group: `key asc`.** `Card.createdAt` is useless here — every card in a set is
  written by one `createMany` inside one transaction, so the timestamps are effectively identical
  and the order would be arbitrary. `key asc` is deterministic and scannable.

### 3.4 The service implementation

`CardService.getAvailableForLot(query)` — three queries, no N+1:

```ts
const where = lotEligibleCardWhere(query.subscriptionPlanId);
const cardWhere = { ...where, ...buildKeySearch(query.search) };   // §3.5 / §4 below

const [sets, totalSets, totalAvailableCards] = await Promise.all([
  this.prisma.set.findMany({
    where: { cards: { some: cardWhere } },
    include: { cards: { where: cardWhere, orderBy: { key: 'asc' }, select: { id: true, key: true } } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    ...toSkipTake({ page, limit }),
  }),
  this.prisma.set.count({ where: { cards: { some: cardWhere } } }),
  this.prisma.card.count({ where: cardWhere }),
]);
```

Notes:
- `cards: { some: cardWhere }` and the nested `include.where` use the **same** predicate, so a set
  whose only matching card was just taken cannot come back as an empty group. Any group returned
  has `cards.length >= 1`.
- Under an active search, `totalAvailableCards` is the **matching** total, not the whole pool.
  The UI labels it accordingly (§4.3).
- `buildPaginationMeta(page, limit, totalSets)` — meta is about sets.
- Mapping lives in `CardMapper.toAvailableCardsBySetDTO(sets, totalAvailableCards, meta)` and ends
  in `AvailableCardsBySetSchema.parse(dto)`, matching every other mapper's runtime backstop.

---

## 4. Search behaviour, selection UX, and the counter

### 4.1 Search: **prefix match on the uppercased input, with an exact-key fast path**

`Card.key` is `@unique` (btree) and always `/^[A-Z0-9]{8}$/`.

```ts
// card.service.ts — the only place search is interpreted.
function buildKeySearch(search?: string): Prisma.CardWhereInput {
  const term = search?.trim().toUpperCase();
  if (!term) return {};
  // A full 8-char key is an equality, not a pattern — this is the common case (the admin pastes
  // a key off a card) and equality is the one form that can use the @unique btree index.
  if (CARD_KEY_PATTERN.test(term)) return { key: term };
  return { key: { startsWith: term } };
}
```

**Why prefix, not contains.** Card keys are opaque serials with no internal structure — nobody
searches for the middle four characters of one. Prefix answers the two real questions ("is *this*
key here?" and "show me the ABC… block") and is the only pattern form a btree could ever serve.
`contains` would be `ILIKE '%…%'`, which no btree can serve under any configuration.

**Case.** Keys are uppercase by construction, so uppercasing the input and comparing
case-sensitively is both correct and faster than `mode: 'insensitive'` (which forces `ILIKE` and
kills the exact-key fast path). The picker's input also uppercases as you type, mirroring
[LandingPage.tsx:217](Apps/web/src/pages/LandingPage.tsx#L217) and
[CreateSetModal.tsx:100](Apps/web/src/pages/admin/activations/components/CreateSetModal.tsx#L100).

**Is another index needed? No.** Explicitly:

- The **exact-key path** is an equality on `Card.key`, served by the existing `@unique` btree.
- The **prefix path** emits `LIKE 'ABC%'`. A default-collation (`en_US.UTF-8`) btree **cannot**
  serve that — Postgres only uses an index for `LIKE 'x%'` when the index is built with
  `text_pattern_ops` or the database collation is `C`. So the prefix path is a filtered scan.
  It is a scan **already narrowed by `subscriptionPlanId` + `cardStat = PRINTED` + `lotId IS NULL`**,
  every one of which is indexed, so the scan runs over the eligible pool (hundreds to low
  thousands of rows), not the whole `Card` table. That is sub-millisecond and does not justify a
  second index on an 8-character column.
- **The threshold to revisit:** if the *eligible* pool for a single plan routinely exceeds ~100 000
  rows, add `@@index([key(ops: raw("text_pattern_ops"))])` and re-measure. Do not add it
  speculatively in this set — it would be an index with no measured beneficiary, and it costs a
  migration.

**Search resets `page` to 1** and is debounced through the existing
[`useDebouncedValue`](Apps/web/src/hooks/useDebouncedValue.ts).

### 4.2 Selection UX — state shape

The modal drops React Hook Form, mirroring `CreateSetModal`, which abandoned it for the same
reason: the selection is not a form field, it is a collection that has to outlive paging and
search.

```ts
// CreateLotModal.tsx
// Map, not string[]: membership is O(1) instead of the current O(n) `cardIds.includes(id)` per
// row (§1.2 #4), and the value carries the key + set so a card selected on page 1 can still be
// NAMED on page 3 and in the §5 error list, where the server response only returns ids.
type SelectedCard = { key: string; setId: string; setNumber: string };
const [selected, setSelected] = useState<Map<string, SelectedCard>>(new Map());
```

- `cardIds` for submit = `[...selected.keys()]`. Insertion-ordered and duplicate-free by
  construction — which is half of §5.4.
- **Changing the plan clears the selection** (existing behaviour, kept: cards from another plan
  can never be eligible).
- **Paging and searching never touch `selected`.** That is the whole reason for the value payload.
- Validation on submit is `createLotSchema(t).safeParse({...})`, exactly as `CreateSetModal` does
  ([CreateSetModal.tsx:104-113](Apps/web/src/pages/admin/activations/components/CreateSetModal.tsx#L104-L113)).

### 4.3 Select-all-in-set semantics, and the counter

Because a group always carries **all** of its eligible cards (§3.1), select-all-in-set is purely
local and unambiguous:

| Control | Semantics |
|---|---|
| Group header checkbox | Tri-state over `group.cards`: `all` / `none` / `indeterminate`. Clicking when `all` deselects the group; otherwise selects the whole group. |
| Group header label | `SET-20260714-A31C · 14 Jul 2026 · {selectedInGroup}/{availableCount}` |
| **Under an active search** | The group carries only matching cards, so the checkbox selects **only the matches**, and the label reads `{n} matching` instead of `{n} available`. Different key, so the button can never claim "all" while meaning "all matching". |
| Footer counter | `{selected} of {totalAvailableCards} available cards selected` — the denominator is the whole eligible pool for the plan, **not** this page. Under search it switches to the `…matching…` key. |
| `Clear selection` | `setSelected(new Map())`. Always visible once `selected.size > 0`, with the count next to it. |
| Submit | Disabled when `selected.size === 0`; label carries the count. |

**There is no capacity ceiling** — confirmed this session. Nothing caps `Lot.nbOfCards`, nothing
in the schema expresses a lot size, and none is being invented. If a physical lot size ever
exists, it becomes a `MAX_CARDS_PER_LOT` constant in `lot.command.ts` enforced in
`CreateLotSchema` and re-checked in `create()`; that is a later set.

### 4.4 Layout

```
┌ Create Lot ──────────────────────────────────────────────┐
│ Plan  [ Snapchat · 12 months          ▾ ]                │
│ Search key  [ A1B2____              ]  (debounced)        │
│                                                           │
│ ▸ ☐ SET-20260712-9F0A · 12 Jul 2026 · 0/100              │
│ ▾ ▣ SET-20260714-A31C · 14 Jul 2026 · 37/180             │
│      ☑ A1B2C3D4   ☑ A1B2C3D5   ☐ A1B2C3D6  …             │
│ ▸ ☐ SET-20260715-C2E1 · 15 Jul 2026 · 0/60               │
│                                                           │
│ ‹ 1 2 3 ›  (pages of sets)                                │
├───────────────────────────────────────────────────────────┤
│ 37 of 340 available cards selected   [Clear] [Cancel] [Create lot (37)] │
└───────────────────────────────────────────────────────────┘
```

- **Groups start collapsed** (§6). A group auto-expands when a search is active and it has
  matches — otherwise search results would be invisible behind a collapsed header.
- Dialog widens to `max-w-2xl`; the group area is `max-h-[55vh] overflow-y-auto`.
- The footer counter and actions sit outside that scroll area so they are always visible.
- Loading = `Skeleton` rows in the group area only; the plan select, search and footer stay
  mounted (front-end-rules §4).
- Empty states: no plan chosen / no eligible cards for the plan / no key matches the search —
  three distinct messages, not one.

---

## 5. Server-side re-validation on submit, and the exact error shape

### 5.1 The error contract

`Apps/contract/src/modules/card/card.enums.ts`:

```ts
// Why a specific selected card could not be put into a lot. Ordered most-likely-first; the
// service reports the FIRST reason that applies to a card, not all of them.
export enum CardUnavailableReason {
  NOT_FOUND = 'NOT_FOUND',       // id does not exist, or is soft-deleted
  ALREADY_IN_LOT = 'ALREADY_IN_LOT',
  NOT_PRINTED = 'NOT_PRINTED',
  WRONG_PLAN = 'WRONG_PLAN',
  DISABLED = 'DISABLED',
  REVOKED = 'REVOKED',
}
```

`Apps/contract/src/modules/card/card.dtos.ts`:

```ts
// The shape of ApiResponse.error.details on a 409 from LOT_ROUTES.CREATE. AppError.details is
// `unknown` by design, so this is the contract's description of one specific error body — the
// same job CreateSetModal's ad-hoc `{ takenKeys }` parse does today, typed instead of guessed.
export const UnavailableCardSchema = z.object({
  cardId: z.uuid(),
  // null ONLY for NOT_FOUND — there is no row to read a key from. Every other reason names it.
  key: z.string().nullable(),
  reason: z.enum(CardUnavailableReason),
});
export type UnavailableCardDTO = z.infer<typeof UnavailableCardSchema>;

export const LotCreationConflictDetailsSchema = z.object({
  unavailableCards: z.array(UnavailableCardSchema).nonempty(),
});
export type LotCreationConflictDetails = z.infer<typeof LotCreationConflictDetailsSchema>;
```

**No contract cycle.** Both live in the `card` module; `lot` does not import them (the backend
builds the object structurally, the frontend imports from the root barrel). `madge --circular src`
stays clean — R13 avoided by construction.

### 5.2 The wire body

```jsonc
// 409 Conflict
{
  "success": false,
  "error": {
    "code": "RESOURCE_CONFLICT",
    "message": "3 of the 42 selected cards are no longer available",
    "details": {
      "unavailableCards": [
        { "cardId": "…", "key": "A1B2C3D4", "reason": "ALREADY_IN_LOT" },
        { "cardId": "…", "key": "K9M2P7Q1", "reason": "DISABLED" },
        { "cardId": "…", "key": null,       "reason": "NOT_FOUND" }
      ]
    }
  }
}
```

**One status for all reasons — 409, not a 400/409 mix.** Today `create()` splits them
(`ConflictError` for already-in-a-lot, `BadRequestError` for everything else), which forces the
client to handle two shapes for one user-visible situation. From the admin's side every entry
means the same thing: *your selection is stale, here is what to drop*. One status, one details
shape, one UI treatment.

### 5.3 `LotService.create()` — rewritten

```ts
async create(cmd: CreateLotCommand, _actorId: string): Promise<LotDTO> {
  const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: cmd.subscriptionPlanId } });
  if (!plan || !plan.isActive) throw new BadRequestError('Subscription plan not found or inactive');

  const lotNumber = await this.uniqueLotNumber();

  const lot = await this.prisma.$transaction(async (tx) => {
    // (a) DIAGNOSTIC read — inside the transaction, so it sees a consistent snapshot. Its only
    //     job is to produce a human-readable failure list; correctness comes from (c).
    const rows = await tx.card.findMany({
      where: { id: { in: cmd.cardIds } },
      select: { id: true, key: true, cardStat: true, subscriptionPlanId: true,
                lotId: true, isDisabled: true, isRevoked: true, deletedAt: true },
    });
    const byId = new Map(rows.map((c) => [c.id, c]));

    const unavailableCards = cmd.cardIds
      .map((id) => classifyCard(id, byId.get(id), cmd.subscriptionPlanId))  // → UnavailableCardDTO | null
      .filter((x): x is UnavailableCardDTO => x !== null);

    if (unavailableCards.length > 0) {
      throw new ConflictError(
        `${unavailableCards.length} of the ${cmd.cardIds.length} selected cards are no longer available`,
        { unavailableCards },
      );
    }

    // (b) The lot.
    const created = await tx.lot.create({
      data: { lotNumber, subscriptionPlanId: cmd.subscriptionPlanId,
              lotStat: PrismaLotStat.PENDING, nbOfCards: cmd.cardIds.length },
      include: { subscriptionPlan: true },
    });

    // (c) THE CORRECTNESS GUARD. The where clause re-asserts eligibility AT WRITE TIME, so at
    //     READ COMMITTED a concurrent transaction that took one of these cards between (a) and
    //     here loses it from the match set and the count assertion rolls us back. Without this,
    //     (a) alone is a check-then-act race: findMany takes no row locks.
    const assigned = await tx.card.updateMany({
      where: { id: { in: cmd.cardIds }, ...lotEligibleCardWhere(cmd.subscriptionPlanId) },
      data: { cardStat: CardStat.IN_LOT, lotId: created.id },
    });

    if (assigned.count !== cmd.cardIds.length) {
      // Reachable only in the (a)→(c) window. Rare, so it does not get a per-card breakdown —
      // the client refetches and retries, and the second attempt gets the precise list from (a).
      throw new ConflictError('Some selected cards were taken by another lot — refresh and retry');
    }

    return created;
  });

  return LotMapper.toDTO(lot, lot.subscriptionPlan, 0);
}
```

`classifyCard` is a small pure helper in `lot.service.ts`, ordered to match
`CardUnavailableReason`: missing-or-soft-deleted → `NOT_FOUND`; `lotId !== null` →
`ALREADY_IN_LOT`; `cardStat !== PRINTED` → `NOT_PRINTED`; plan mismatch → `WRONG_PLAN`;
`isDisabled` → `DISABLED`; `isRevoked` → `REVOKED`.

**Either the lot is created with exactly the requested cards, or nothing is written.** Both
throws are inside the transaction, so the `lot.create` in (b) rolls back with them. There is no
partial success and no orphan lot.

### 5.4 Duplicate `cardIds`

`CreateLotSchema` accepts `["A","A"]` today. That would make `assigned.count (1) !== cardIds.length (2)`
and produce a spurious, unexplainable conflict. Fix at the contract, mirroring `CreateSetSchema`:

```ts
export const CreateLotSchema = z.object({
  subscriptionPlanId: z.uuid(),
  cardIds: z
    .array(z.uuid())
    .nonempty()
    .refine((ids) => new Set(ids).size === ids.length, { message: 'Duplicate card IDs are not allowed' }),
});
```

The frontend cannot produce duplicates anyway (the `Map` in §4.2), and `create-lot.schema.ts`
mirrors the refine so the compile-time `AssertAssignable` guard still holds.

### 5.5 What the UI does with the error

`CreateLotModal` parses `error.response.data.error.details` with
`LotCreationConflictDetailsSchema.safeParse` (not a hand-rolled `Array.isArray` walk — the schema
exists now), then:

1. **Removes** the failed ids from `selected` — the stale ones are gone, the good selection
   survives, so the admin can hit Create again without redoing 40 checkboxes.
2. Renders a destructive block above the footer listing **`key` — reason label** per card, using
   the key from `selected` (which is why §4.2's `Map` carries it), falling back to the response's
   `key`, and to a `cardUnknown` translation key when both are null.
3. Invalidates `qk.cards.all()` so the groups refetch and the stale cards visibly disappear.

---

## 6. Expected card volume, and what keeps the UI responsive — no virtualization library

### 6.1 Volume

| Quantity | Value | Source |
|---|---|---|
| Cards per set — hard cap | 1 000 | `MAX_KEYS_PER_SET` |
| Cards per set — default | 100 | `CreateSetModal`'s `DEFAULT_COUNT` |
| Eligible cards per plan — realistic | 500 – 3 000 | a handful of printed, unassigned sets |
| Cards in one page payload — default | ~500 | 5 groups × ~100 |
| Rows in the DOM at rest | **≤ 20** | groups start collapsed |
| Rows in the DOM, one group expanded | ~100, worst case 1 000 | one set |

The design target is therefore **~1 000 simultaneously-mounted checkbox rows**, and the empirical
proof that this is fine is already in the repo: `CreateSetModal` mounts up to 1 000 rows of *an
input plus two icon buttons* each and is acceptable today. A `<label>` + `<Checkbox>` + `<span>`
is materially lighter.

### 6.2 The six things that keep it responsive

1. **`Map` membership, not `array.includes` (§4.2).** This is the single biggest win and it is a
   data-structure change, not an optimisation. Today the modal is O(n²) per render; this makes it
   O(n). At 1 000 rows that is 1 000 lookups instead of 1 000 000 comparisons.
2. **Collapsed-by-default groups.** The steady state is ≤20 header rows. The admin opts into
   mounting a set's rows, and they usually open one.
3. **Server-side paging over groups (§3.1).** Caps how much can *ever* be expanded on one screen,
   and caps the JSON.
4. **A memoized row.** `const CardRow = React.memo(...)` keyed on `{ id, cardKey, selected, onToggle }`,
   with `onToggle` stabilised by `useCallback`. Toggling one card then re-renders one row instead
   of the whole group. front-end-rules §5 says not to memoize unless a component re-renders hot —
   a 1 000-instance row inside a list that re-renders on every click is exactly the sanctioned
   case, and the reason goes in a code comment so it does not read as cargo-cult.
5. **Debounced search** via the existing `useDebouncedValue`, plus `placeholderData: keepPreviousData`
   on the query so paging and typing do not flash the list back to skeletons.
6. **`[content-visibility:auto]` on each expanded group body.** A Tailwind arbitrary value, zero
   dependencies — the browser skips layout and paint for off-screen groups. This is native
   windowing, not a library, and it is the only "virtualization" this set uses.

**No `react-window`, no `react-virtual`, no new dependency of any kind** (CLAUDE.md; front-end-rules §6.A).

---

## 7. Files to change

**`Apps/contract`**
- `src/modules/card/card.enums.ts` — **new** `CardUnavailableReason`
- `src/modules/card/card.dtos.ts` — **remove** `AvailableCardResponseSchema` / `AvailableCardDTO`; **add** `AvailableCardItemSchema`, `AvailableCardSetGroupSchema`, `AvailableCardsBySetSchema`, `UnavailableCardSchema`, `LotCreationConflictDetailsSchema`
- `src/modules/card/card.query.ts` — extend `GetAvailableCardsQuerySchema`
- `src/modules/lot/lot.command.ts` — duplicate refine on `CreateLotSchema`
- No route constant changes. No new module, no barrel change.

**`Apps/api`**
- `src/modules/card/card.eligibility.ts` — **new**, the predicate (§2.1)
- `src/modules/card/card.service.ts` — `getAvailableForLot()` rewritten (§3.4), `buildKeySearch()` (§4.1)
- `src/modules/card/card.mapper.ts` — `toAvailableDTO` → `toAvailableCardsBySetDTO`
- `src/modules/card/card.interface.ts` — signature
- `src/modules/lot/lot.service.ts` — `create()` rewritten + `classifyCard()` (§5.3)
- `prisma/schema.prisma` — **untouched. No migration.**

**`Apps/web`**
- `src/services/cards.service.ts` — `getAvailableForLot` return type + full query
- `src/hooks/useCards.ts` — `useAvailableCardsForLot(planId, { search, page, limit })`, `keepPreviousData`
- `src/lib/query-keys.ts` — `cards.availableForLot(query)` takes the whole query
- `src/pages/admin/activations/components/CardPicker.tsx` — **new** (search + groups + paging + counter)
- `src/pages/admin/activations/components/CardPickerGroup.tsx` — **new** (collapsible group, tri-state checkbox)
- `src/pages/admin/activations/components/CardPickerRow.tsx` — **new**, `React.memo`
- `src/pages/admin/activations/components/CreateLotModal.tsx` — rewritten around `CardPicker`
- `src/pages/admin/activations/components/create-lot.schema.ts` — mirror the duplicate refine
- `src/pages/admin/activations/SetsLotsPage.tsx` — pass `createLot.error` into the modal (mirrors how `CreateSetModal` already receives `createError`)
- `src/config/translations.json` — new `admin.setsLots.lots.create.*` keys (group header, counters, search placeholder, three empty states, six reason labels, the conflict heading), `en`/`fr` filled, `ar: ""`

**Migration: none.**

---

## 8. Open questions

**Q1 — the two predicate tightenings (§2.2).** After this set, `LotService.create()` rejects
disabled and soft-deleted cards, which it silently accepted before. The UI could never send one,
so nothing user-facing changes; a script or a direct API call could. **Recommend accepting** —
it is the whole point of having one predicate. Flagging it because it is a behaviour change to an
existing endpoint, not a new feature.

**Q2 — `AvailableCardDTO` is deleted, not deprecated.** One consumer, replaced in the same set
(§1.1), and CLAUDE.md forbids compatibility shims. Confirming rather than assuming.

**Q3 — group ordering is oldest-set-first (§3.3), the opposite of the sets table.** Deliberate:
this is a stock-consumption view, so FIFO rotation, and it matches today's `createdAt asc` on the
flat card list. Say if you would rather see the newest set at the top.

**Q4 — `limit` caps at 20 sets per page, not 100.** Diverges from every other list schema, on
purpose (§3.1): one page carries every card of every set on it, so the cap is a payload bound, not
a UI preference. Confirming the divergence is wanted.

**Q5 — frozen tests that will break.** `Apps/api/test/unit/modules/card*.spec.ts`,
`lot*.spec.ts`, `test/integration/card.spec.ts`, `test/integration/lot.spec.ts`,
`Apps/web/tests/**/sets-lots/*`, `tests/integration/{hooks,services}/*cards*`, plus both
conformance suites. Expected under the freeze — **not touched, not run**; verified with
`git status`.

**Q6 — seed scripts.** `scripts/load-mock-data.ts` writes cards and lots through Prisma directly
and never calls `LotService.create()`, so nothing in it depends on the changed shapes. **No seed
change needed.** Stated so it is a checked fact, not an omission.

**Q7 — the search index threshold (§4.1).** No index is added. If you expect a single plan's
eligible pool to exceed ~100 000 cards, say so now and the set adds
`@@index([key(ops: raw("text_pattern_ops"))])` plus a migration instead of deferring it.

---

## 9. Manual test checklist

1. **Grouping renders.** Open Sets & Lots → Create Lot → pick a plan with several printed sets.
   Cards appear grouped under `SET-… · <creation date> · 0/<n>`, **oldest set first**, groups
   collapsed.
2. **Only eligible cards appear.** Pick a card visible in the picker; disable it from the Cards
   page; reopen the picker → it is gone, and its group's `availableCount` dropped by one.
   Repeat with a card already in a lot, and with an `IN_SET` (unprinted) card — neither appears.
3. **Wrong-plan isolation.** A card belonging to plan B never appears under plan A, in any group,
   with or without a search term.
4. **Exact-key search.** Paste a full 8-character key → exactly one card in exactly one group,
   and that group is auto-expanded.
5. **Prefix search.** Type the first 3 characters of that key → the card is still listed, together
   with every other key sharing the prefix. Type a middle fragment (characters 4–6) → **no
   results** (prefix, not contains, per §4.1). Lowercase input finds the same cards as uppercase.
6. **Search + counter.** With a search active, the footer reads *"… of N matching cards"*, not
   *"available"*, and N equals the sum of the visible groups' counts across all pages.
7. **Select-all-in-set.** Expand a group of ≥20 cards, click its header checkbox → all its cards
   check, the header goes solid, the footer count rises by exactly `availableCount`. Uncheck 3
   individually → header goes **indeterminate**, count drops by exactly 3. Click the header again
   → the remaining ones deselect (not "select all again").
8. **Select-all-in-set under search.** With a search matching 5 of a group's 180 cards, the header
   checkbox selects **5**, and its label says *matching*, not *available*.
9. **Selection survives paging.** Select 10 cards in a group on page 1 → go to page 2 → select 5
   more → return to page 1. The original 10 are still checked and the footer reads 15.
10. **Selection survives search.** With 15 selected, type a search that matches none of them → the
    footer still reads 15 → clear the search → all 15 are still checked.
11. **Plan change clears.** With cards selected, change the plan → the selection empties and the
    footer resets to 0.
12. **Clear selection.** Select across two groups, hit Clear → count 0, every checkbox clears,
    Create is disabled.
13. **200+ cards, no lag.** Create a 500-card set, print it, open the picker, expand it, click
    select-all → the UI stays responsive (no multi-second freeze), the request succeeds, and the
    lot's card count is 500.
14. **Stale-selection conflict names the cards.** Open the picker in two browser profiles (A and
    B) on the same plan. In A, select 5 cards and create the lot. In B (whose list is now stale),
    select those same 5 plus 3 fresh ones and submit. B gets a **409** listing the 5 **by key**
    with reason "already in a lot", the 5 are dropped from B's selection, the 3 fresh ones remain
    checked, and **no lot was created**. Hitting Create again immediately succeeds with 3 cards.
15. **No corrupt lot after a conflict.** Following test 14: the lots table shows exactly one new
    lot (A's, 5 cards), `nbOfCards = 5`, and every one of the 8 cards is in exactly one lot or
    none. No empty lot exists.
16. **Disabled card cannot be forced through.** With devtools, replay a create request containing
    a disabled card's id → 409 naming that key with reason "disabled" (§2.2's tightening), lot not
    created.
17. **Duplicate ids rejected.** Replay a create request with the same card id twice → 400
    validation error, not a confusing conflict (§5.4).
18. **Empty states.** No plan selected → prompt to pick one. Plan with zero eligible cards →
    "no printed cards available". Search matching nothing → "no key matches", **different copy**
    from the previous one.
19. **Loading and error survive layout.** Throttle the network and reopen → skeleton rows appear
    inside the group area while the plan select, search box and footer stay mounted. Kill the API
    and reopen → an inline error in the group area, not a blank or crashed dialog.
20. **Language toggle.** Every new label, counter, empty state and error reason renders in FR and
    EN; nothing shows a raw translation key.

---

## 10. Definition of done

- `npx tsc --noEmit` clean in `Apps/contract`, `Apps/api`, `Apps/web`
- eslint clean in all three
- `npx madge --circular src` clean in `Apps/contract`
- **No migration** — `schema.prisma` untouched
- No test file created, modified, deleted or run — verify with `git status`
- `lotEligibleCardWhere` is the **only** expression of eligibility in `Apps/api/src`; grepping for
  `cardStat: PrismaCardStat.PRINTED` finds it and nothing else on a lot path
- No magic strings: reasons from `CardUnavailableReason`, routes from `CARD_ROUTES` / `LOT_ROUTES`,
  every label from `translations.json` with `ar: ""`
- No new dependency in any `package.json`
- Report: files changed grouped by package, "migration: none", open questions, and the §9
  checklist, under `Docs/Stage-04-fix/results/set-8/`
- **Stop. Do not start Set 9.**
