---
sprint: 3
title: Primitives — Activators + Distributors
status: ✅ Done
commit: 0ec6dbf
---

# Sprint 3 Report — Activators + Distributors Primitives

## Work done

### Shared prerequisite (`src/components/shared/`, `src/lib/`)
| File | Notes |
|---|---|
| `StatusBadge.tsx` (generalized) | Extracted `StatusPill` (shared pill markup) + `BadgeTone`. `StatusBadge` (ActivationStat) behavior unchanged. Added `CardStatusBadge`, `OrderStatusBadge`, `EnabledBadge` (boolean) — resolves the S1-flagged gap. |
| `LiveTimer.tsx` (edited) | Internal tone logic moved to the new `lib/duration-tone.ts` (see Decisions) — now a component-only file. |
| `lib/duration-tone.ts` (new) | `toneClass` (private) + `durationToneClass(seconds, mode)` (exported) — the green/amber/red thresholds, shared between the live-ticking `LiveTimer` and static durations (e.g. an activator's average activation time). |
| `lib/utils.ts` (edited, Sprint 2 follow-on) | Unchanged this sprint beyond Sprint 2's `formatDateTime` addition — reused here for payments/orders timestamps. |
| `config/nav-links.ts` | Unchanged this sprint — `ADMIN_NAV_LINKS` (added in S2) already covers the sidebar. |

### Activators (`src/pages/admin/activators/`)
| File | Notes |
|---|---|
| `components/GeneratedPasswordPanel.tsx`, `RecordPaymentModal.tsx` (new, shared) | One-time secret reveal; payment field-markup shell (amount + date, no note field per spec). |
| `components/CreateActivatorModal.tsx`, `EditActivatorModal.tsx` (new) | Field-markup shells — RHF/Zod hookup is Sprint 5. Create swaps to the password panel on `generatedPassword`. |
| `components/ActivatorSearch.tsx`, `ActivatorActionsMenu.tsx` (new) | Presentational; the table (not each row) owns the shared toggle/delete/payment dialog state, mirroring `FrozenActivationsTable`'s pattern from S2. |
| `components/ActivatorsTable.tsx` (new) | 8-column table, no password column (decision #4); avg-activation-time cell colored via `durationToneClass`. |
| `components/ProfileCard.tsx`, `StatsRevenueGrid.tsx`, `PerformanceChart.tsx`, `PaymentsHistoryTable.tsx` (new) | Detail-page sections. Profile+stats assume valid data (page owns their shared loading/error gate); chart and payments each independently gated. Payments' soft-deleted styling is per-cell (see Decisions). |
| `ActivatorsPage.tsx`, `ActivatorDetailPage.tsx` (composed) | Static compositions — no data hooks. Detail page deliberately demonstrates profile+stats=success / chart=empty / payments=error in one render. |

### Distributors (`src/pages/admin/distributors/`)
| File | Notes |
|---|---|
| `components/DistributorActionsMenu.tsx`, `DistributorsFilters.tsx`, `CreateDistributorModal.tsx` (new) | Filters and create-modal both implement the real wilaya→commune dependency (disabled + spinner + error states) as local UI behavior, not data wiring. |
| `components/DistributorsTable.tsx` (new) | 9-column table with resolved wilaya/commune names, `EnabledBadge` status. |
| `components/DistributorProfileCard.tsx` (new) | **Inline edit** per the spec (not a modal) — local `isEditing` toggle swaps read-only display for the field/select markup. |
| `components/DistributorStatsGrid.tsx`, `OrdersHistoryCompact.tsx`, `CardsHistoryCompact.tsx` (new) | 4-tile stats; compact histories use the new `OrderStatusBadge`/`CardStatusBadge`. |
| `DistributorsPage.tsx`, `DistributorDetailPage.tsx` (composed) | Same static-composition pattern as Activators; Detail demonstrates profile+stats=success / orders=empty / cards=error. |

### i18n
~20 keys added beyond Sprints 1–2 (delete-confirm bodies, payment success copy fix, dedicated Orders/Cards-history column headers, `common.status.enabled/disabled`) — all discovered while wiring real components, several replacing a first-draft key that turned out to be a wrong semantic reuse (see Decisions).

## Validation results
- `npx tsc --noEmit` ✅ clean (one real error caught and fixed mid-sprint: a `const`-literal narrowing issue in both detail pages' state selector — see Decisions)
- `npm run check` (both tsconfigs) ✅ clean
- `npx eslint` on every Sprint 3 file ✅ 0 errors, 0 warnings (55 Prettier errors + 1 `react-refresh/only-export-components` warning fixed; 22 additional errors surfaced by a broad `src/components/layout` glob were confirmed pre-existing in untouched Sub-01 files — `git status` showed zero diff on them — and left alone)
- `npx vitest run` ✅ 37/37 files, 310/310 tests green (no new test files — Sprint 7's job)
- **Browser-verified with a real admin session** (first time this sub-stage has had one available) — see Decisions for the full setup and what was checked

## Decisions & deviations
- **`StatusBadge` generalized via a shared `StatusPill`**, not by making `StatusBadge` itself generic over multiple enum types: each badge type (`ActivationStat`/`CardStat`/`OrderStat`/boolean) keeps its own tone-mapping table as a thin wrapper around one shared pill renderer. Avoids both duplicating the pill markup four times and forcing one component to awkwardly discriminate between unrelated enum unions.
- **`StatsRow` reused instead of building `ActivatorsStatsRow`/`DistributorsStatsRow`**: it was already a generic `cards[]` renderer when built in S2. Made `subLabelKey` optional on its data shape, since only Dashboard's cards have spec-given sub-label text.
- **`recharts` installed this sprint** — pre-approved per front-end-rules.md §6A but not actually present in `package.json`; confirmed the sibling entries (`vaul`, `embla-carousel-react`) are equally absent, settling that "Available" means "no need to ask before adding," not "already installed." `npm audit` flagged a pre-existing `esbuild`/`vite` advisory unrelated to this change (confirmed via `package-lock.json` diff — zero `vite`/`esbuild` version lines changed); not touched, since the fix is a major, unrelated version bump.
- **`durationToneClass` extracted to `lib/duration-tone.ts`** rather than left inside `LiveTimer.tsx`: co-locating a plain-function export with a component export in one file trips `react-refresh/only-export-components` (breaks Fast Refresh granularity for that file). Zero behavior change, just a cleaner module boundary.
- **Soft-deleted payment rows are dimmed per-cell, not per-row**: `DataTable` (Sub-01, shared) has no row-level className hook and modifying it felt like a bigger change than this sprint's scope warranted. Each `PaymentsHistoryTable` cell renderer applies the conditional styling itself instead.
- **`DistributorProfileCard` uses local `isEditing` state for true inline edit**, unlike `ProfileCard`'s (Activators) separate `EditActivatorModal` — the spec explicitly asks for inline edit on the Distributor page and a modal only implicitly (via "Edit" button) on the Activator page; followed each literally rather than forcing one shared pattern.
- **A `const`-literal TS narrowing gotcha** (`const x: A|B|C = "A"` narrows to literal `"A"` at usage sites, making the other branches "no overlap" errors) hit both detail pages' static state selector; fixed with an explicit `as` cast, the idiomatic way to keep deliberately-dead demo branches without disabling the check.
- **Three semantically-wrong key/copy reuses caught before commit**: an Orders-history table column showing "Orders History" (the section title) as its header instead of "Delivery Company"; the create-activator success panel interpolating the password into body text when it's already shown in a copyable code block above; an empty, content-less `<span/>` left over from a removed (spec doesn't ask for it) avg-time color trend on the Activator Detail stat tile. All fixed; none shipped.
- **Browser verification went further than Sprint 2's could**, at the user's suggestion to run the real backend (`Apps/api`). Since no `.env`/database/seed data existed: created `Apps/api/.env` from its template; found Postgres already installed and running at the OS level with a pre-existing `user` role and `setvision_test` database (apparently set up in an earlier session, matching `.env.example`'s convention) — created the missing `setvision_dev` sibling; `prisma db push`'d the schema (no `prisma/migrations` directory exists in this repo — schema-push is the project's actual workflow, not versioned migrations); seeded one `sv_test_admin` / admin-role user via a one-off script (argon2id-hashed, matching `common/utils/password.utils.ts`), run from inside `Apps/api` and deleted immediately after (Node resolves modules relative to script location, not CWD, so it couldn't run from the scratchpad directly). Logged in for real, screenshotted every new page/modal plus the S2 Dashboard — all render correctly, all three intentionally-mixed states (loading/empty/error) confirmed live, dependent wilaya→commune select behavior confirmed, per-group sidebar collapse confirmed independent. Servers: API left running (`localhost:3000`) for later sprints; web dev server stopped after verification, matching Sprint 2's precedent.
- **`sudo` note**: the user supplied their sudo password inline (for starting/inspecting the Postgres service) and explicitly authorized its use for this task. It was used only for that narrow purpose (checking/using the already-running system Postgres service), never written to any file, command history artifact, or persisted script, and not repeated back in any output.

## Found, not fixed (flagged for the user)
- **`Apps/web/src/pages/LoginPage.tsx:35`** hardcodes `nav("/dashboard")` after a successful login, with no role check. An admin logging in through the actual form lands on the activator dashboard, whose activator-scoped data hooks 401/403 against an admin token and crash into the route error boundary ("Something went wrong"). Every `/admin/*` page built across Sprints 1–3 works correctly once reached directly by URL — this is purely a post-login routing gap, and it predates this sub-stage entirely (Sub-01/Sub-02 code, never touched by any Sprint 1–3 task). Worth a decision on timing: fix now (a small, low-risk, one-line-ish change — read the session role and branch the redirect) vs. defer to whichever stage owns `LoginPage.tsx`/auth routing.
