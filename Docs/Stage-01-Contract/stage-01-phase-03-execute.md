# Stage 01 · Phase 03 — Contract Sprint Execution

Execution phase for the Contract Architect. Build the `@my-app/contract` package sprint by sprint, pausing for confirmation between sprints.

---

## Objective

Execute the sprints and produce a pristine, compile-ready TypeScript package of contracts, Zod schemas, and route constants.

---

## Context & Inputs

- **Sprint plan:** `/docs/stage-01-contract/sprints.md`.
- **Action plan:** `/docs/stage-01-contract/plan.md`.
- **Module specs:** `module-contracts/` (read the relevant file for the module you are building; contract-relevant sections only — `contract-rules.md` §1).
- **Rules:** `contract-rules.md` (follow strictly; precedence in §0).

---

## Context Protocol (read this first)

Run **one sprint per fresh session.** At the start of each session, load exactly: `contract-rules.md`, `plan.md`, `sprints.md`, and the `module-contracts/` file(s) for the module(s) in this sprint — nothing else. This keeps attention sharp and prevents drift across a long execution run. State handoff happens through files, so a fresh agent can always resume from disk.

---

## The Execution Loop (per sprint)

### Step 1 — Select & Review
- Identify the **first sprint not marked ✅** in `sprints.md`.
- Read the `module-contracts/` file for each module in it; confirm exact fields, routes, access, and events.

### Step 2 — Implement
- **Strict isolation:** write only type definitions, Zod schemas, and constant objects.
- **Generate files:** for each module create only the files it needs (`contract-rules.md` §2 file-count rule); follow the canonical examples in §5.
- **Barrels:** update the module `index.ts` and the root `src/index.ts`.

### Step 3 — Validate
Run the full checklist from `contract-rules.md` §6: `tsc --noEmit`, `madge --circular src`, lint, schema/type sync, no sensitive fields, ISO dates, zero logic.

### Step 4 — Commit on Green
When validation passes, commit (e.g. `git commit -m "contract: sprint [N] — [name]"`). This is the rollback point if the next sprint goes wrong.

### Step 5 — Report & Mark
- Write a short summary to `/docs/stage-01-contract/results/report-sprint-[NN].md` (what was created, validation results, anything flagged).
- Mark the sprint **✅ Complete** in `sprints.md`.

### Step 6 — Pause
Wait for the user's **`next`** command before starting the next sprint.

---

## The Contract Commandments

1. **Zero logic** — no behaviour, no DB calls, no Express.
2. **Schemas are the source** — every type is `z.infer`'d.
3. **Strict types** — no `any`; use generics in `common/types.ts`.
4. **No magic strings** — enums and route constants only.
5. **No sensitive data** in any DTO.
6. **Dates are ISO strings** (`z.iso.datetime()`).
7. **Lint clean, `tsc` clean, no circular deps** (`madge --circular`).
8. **Everything exported** — if it is not in a barrel, it does not exist.
9. **Commit on green**, then report to `results/`.
10. **Always check `contract-rules.md`** when unsure.
11. **Wait for `next`.**

---

## Expected Outputs (when all sprints are ✅)

1. A fully compilable `@my-app/contract` package.
2. A complete set of Zod schemas mirroring `module-contracts/`.
3. A folder of per-sprint reports in `/docs/stage-01-contract/results/`.
4. A clean commit history, one commit per sprint.
