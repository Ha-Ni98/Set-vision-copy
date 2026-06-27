# Workflow Overview

A contract-first, spec-driven pipeline for building a full-stack TypeScript app with an AI agent as the executor. Work flows in one direction — **Stage 0 (you) → Stage 1 Contract → Stage 2 Backend → Stage 3 Frontend** — and everything downstream is bound to a single shared contract.

This file is the entry point. Read it first; it states the conventions that hold everywhere so the per-stage files don't have to repeat them.

---

## 1. The Big Picture

```text
Stage 0  CONCEPTION (human)      → schema, module specs, page requirements
   │
Stage 1  CONTRACT  (agent)       → packages/contract   (@my-app/contract)
   │                                the single source of truth
   ├──────────────┐
Stage 2 BACKEND    Stage 3 FRONTEND  (both consume the contract)
 apps/api          apps/web
```

The contract is the hub. The backend implements it; the frontend calls it; both import types and routes from `@my-app/contract` and never redefine them.

### Repository layout

```text
my-app/
├── packages/
│   └── contract/                 # Stage 1 output — @my-app/contract
├── apps/
│   ├── api/                      # Stage 2 — backend (has prisma/, src/, test/)
│   └── web/                      # Stage 3 — frontend (paths in the FE rules are relative to here: src/, tests/)
├── module-contracts/             # Stage 0 — one full-lifecycle spec per module (shared input)
└── docs/
    ├── requirements/pages/       # Stage 0 — one requirement file per page
    ├── stage-01-contract/
    ├── stage-02-backend/
    │   ├── sub-01-init/
    │   └── sub-02-module/
    └── stage-03-frontend/
        ├── sub-01-refactor/
        ├── sub-02-integration/
        └── sub-03-pages/[page]/
```

---

## 2. Global Conventions (the laws — true in every stage)

1. **The contract is absolute.** `@my-app/contract` owns every route constant, DTO, Command, Query, enum, error code, and event type. If it isn't in the contract, it doesn't exist; a missing type is a Stage 1 gap to fix upstream, never a local patch.
2. **One response envelope.** Every API response is `ApiResponse<T>` — a discriminated union: `{ success: true, data }` or `{ success: false, error: { code, message, details? } }`. The backend wraps via `sendSuccess`; the frontend unwraps to the inner `data`.
3. **One Zod major.** The whole monorepo uses **Zod 4**. A version split breaks shared schemas and `zodResolver`.
4. **Dates cross the wire as ISO strings** (`z.iso.datetime()`). Conversion to/from `Date` is a backend/frontend mapping concern, never the contract's.
5. **Types derive from schemas** (`z.infer`) — never declare a type and a schema separately.
6. **No magic strings / no `any`.** Routes and fixed values come from contract constants and enums; use `unknown` and narrow.
7. **Docs tree:** `/docs/stage-NN-.../...`. Plans, sprints, and per-sprint reports live there, not in code.
8. **Conformance is tested, not assumed.** Mock fixtures and outgoing responses are parsed through the contract's Zod schemas so drift fails loudly instead of reaching production.
9. **Naming vocabulary is fixed.** Inputs are *Commands* (writes) and *Queries* (reads); outputs are *DTOs*; route constants are `[MODULE]_ROUTES` with UPPERCASE keys.

---

## 3. The Repeating Rhythm (every stage works this way)

Each stage/substage runs three phases, gated by you:

- **Phase 01 — Plan:** the agent audits inputs and writes `plan.md`. No code.
- **Phase 02 — Sprints:** it decomposes the plan into dependency-ordered sprints in `sprints.md`. No code.
- **Phase 03 — Execute:** it runs the loop below, one sprint at a time.

**Execution loop:** select first sprint not ✅ → implement (+ tests) → validate (`tsc`, tests, lint, conformance) → **commit on green** → report to `results/` → mark ✅ → **pause and wait for `next`**.

**Context protocol:** run **one sprint per fresh session**, loading only that sprint's relevant files (rules + plan + sprints + the contract/spec for the current module/domain). State lives on disk, so a fresh agent always resumes cleanly.

**Precedence / conflict policy:** rules files govern **HOW**; phase files govern **WHAT/WHEN**; the contract and module specs govern **WHICH**; the prompt is the trigger. Resolve HOW conflicts toward the rules and note them; **stop and ask** only on a genuine WHICH conflict (e.g. a spec asks for a forbidden field).

---

## 4. Stage 0 — Conception (you do this by hand)

This is the only stage with no agent. It produces the artifacts every later stage reads. Do it carefully — the agent stages are only as good as these inputs.

### 0.1 Model the domain
Decide the app's modules (e.g. `Auth`, `User`, `Product`, `Order`) and how they relate, including which modules emit or listen to events.

### 0.2 Author the database schema
Write `apps/api/prisma/schema.prisma` — the source of truth for persisted data. Define models, relations, and enums (keep enum values identical to what the contract will declare, since both reference them).

### 0.3 Author one module spec per module → `module-contracts/[module].md`
Use a **full-lifecycle** template (one spec serves contract, backend, and frontend). **Tag each section by consumer** so each stage reads only its part:
- `## API Interface [CONTRACT]` — routes, access control, input validation, input/output DTOs.
- `## Events [CONTRACT]` — emits / listens, payload DTOs.
- `## Business Logic [BACKEND]` — service steps (hashing, DB calls, transactions).
- `## Data Mapping [BACKEND]` — mapper rules (exclude sensitive fields, Date → ISO).
- `## Technical Constraints [BACKEND]` — e.g. "hash with Argon2".
- `## Test Scenarios [BACKEND]` — status codes, edge cases.

Stage 1 reads only the `[CONTRACT]` sections; Stage 2 reads the `[BACKEND]` ones. Tagging is what keeps backend logic from leaking into the contract.

### 0.4 Author one requirement file per page → `docs/requirements/pages/[page].md`
Describe each page's UI, interactions, forms, data dependencies, and which layout it uses (Admin = desktop-first, Public = mobile-first). Stage 3 Sub-03 consumes one of these per page.

### 0.5 Scaffold and lock the stack
Create the monorepo (`packages/contract`, `apps/api`, `apps/web`), and pin one version of each shared tool — critically **Zod 4** across all three.

**Stage 0 outputs:** `schema.prisma`, `module-contracts/*.md` (tagged), `docs/requirements/pages/*.md`, and a scaffolded, version-locked monorepo.

---

## 5. Stage 1 — Contract (`@my-app/contract`)

**Goal:** a pure TypeScript + Zod package of types, schemas, route constants, error codes, and event types — zero business logic.

- **Rules:** `contract-rules.md`
- **Prompts:** `stage-01-prompts.md`
- **Phases:** `stage-01-phase-01-plan.md` → `stage-01-phase-02-sprints.md` → `stage-01-phase-03-execute.md`
- **Reads:** `module-contracts/*.md` (`[CONTRACT]` sections), `schema.prisma`
- **Outputs:** `packages/contract/` and `/docs/stage-01-contract/`

---

## 6. Stage 2 — Backend (`apps/api`)

Two substages.

### Sub-01 — Initialize the project (once)
The framework skeleton: env validation, Pino logging, the `prisma` singleton, the `ApiResponse` helper, a typed event bus, one `requireAuth` guard, the error handler, and the test harness — no feature modules.
- **Rules:** `back-end-rules.md`, `test-rules.md`, `env-template.md`
- **Prompts:** `stage-02-sub-01-prompts.md`
- **Phases:** `stage-02-sub-01-phase-01-plan.md` → `-02-sprints.md` → `-03-execute.md`
- **Outputs:** `apps/api/` skeleton, `/docs/stage-02-backend/sub-01-init/`

### Sub-02 — Implement a module (repeat per module)
The 6-file architecture (mapper, interface, service, optional listener, controller, routes) with manual DI; `routes.ts` is the composition root.
- **Rules:** `module-implementation-rules.md`
- **Prompts:** `stage-02-sub-02-prompts.md`
- **Phases:** `stage-02-sub-02-phase-01-plan.md` → `-02-sprints.md` → `-03-execute.md`
- **Reads:** `module-contracts/[module].md` (`[BACKEND]` sections), the contract
- **Outputs:** `apps/api/src/modules/[module]/`, `/docs/stage-02-backend/sub-02-module/`

---

## 7. Stage 3 — Frontend (`apps/web`)

Three substages. Rules shared across all: `front-end-rules.md`, `front-end-best-practices.md`, `front-end-test-rules.md`.

### Sub-01 — Refactor (once)
Audit the AI-generated MVP and align it to the rules; extract in-component fetching into lean Hooks/Services that return **typed empty defaults** until Sub-02 wires the real engine.
- **Prompts:** `stage-03-sub-01-prompts.md` · **Phases:** `stage-03-sub-01-phase-0{1,2,3}-*.md` · **Docs:** `/docs/stage-03-frontend/sub-01-refactor/`

### Sub-02 — Integration Engine (once)
The Axios singleton, the route builder, the Query Client, and per-domain Services + TanStack Query Hooks — all bound to the contract, with MSW integration tests.
- **Prompts:** `stage-03-sub-02-prompts.md` · **Phases:** `stage-03-sub-02-phase-0{1,2,3}-*.md` · **Docs:** `/docs/stage-03-frontend/sub-02-integration/`

### Sub-03 — Page Assembly (repeat per page)
Wire one page's UI to the real hooks with granular `isLoading`/`isError` states, RHF + Zod forms, i18n via `useTranslation`, and `vi.mock()`-based unit tests.
- **Prompts:** `stage-03-sub-03-prompts.md` · **Phases:** `stage-03-sub-03-phase-0{1,2,3}-*.md`
- **Reads:** `docs/requirements/pages/[page].md` · **Docs:** `/docs/stage-03-frontend/sub-03-pages/[page]/`

---

## 8. Full Mode vs Light Mode (right-sizing)

This pipeline is heavy on purpose, and it is overkill for small changes. Match the ceremony to the stakes:

- **Full mode** — new app, new module, or new page: run all three phases, the human gate, and the full test/conformance suite.
- **Light mode** — a small fix or tweak inside existing, contract-covered code: skip plan/sprints, make the change directly against the rules, and rely on `tsc` + the existing conformance tests. Don't write a sprint file for a one-line change.

The executable parts of this system (the contract schemas and the conformance tests) are the durable truth. The prose rules are scaffolding — keep them lean, and when the hand-wiring starts to feel like a tax, that's the signal to evaluate `ts-rest`/`tRPC` and delete some of it.

---

## 9. File Index

| Kind | Files |
| --- | --- |
| Overview | `workflow.md` (this file) |
| Stage 0 (you author) | `schema.prisma`, `module-contracts/*.md`, `docs/requirements/pages/*.md` |
| Stage 1 rules/prompts | `contract-rules.md`, `stage-01-prompts.md`, `stage-01-phase-0{1,2,3}-*.md` |
| Stage 2 rules/prompts | `back-end-rules.md`, `module-implementation-rules.md`, `test-rules.md`, `env-template.md`, `stage-02-sub-0{1,2}-prompts.md`, `stage-02-sub-0{1,2}-phase-0{1,2,3}-*.md` |
| Stage 3 rules/prompts | `front-end-rules.md`, `front-end-best-practices.md`, `front-end-test-rules.md`, `stage-03-sub-0{1,2,3}-prompts.md`, `stage-03-sub-0{1,2,3}-phase-0{1,2,3}-*.md` |
