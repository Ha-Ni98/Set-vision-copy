# Stage 02 · Sub-02 · Phase 01 — Module Implementation Plan

Planning for a **set of module**. Repeat this sub-stage once per set. **No code yet.**

---

## Objective

Analyze one module's contract + schema and map the **6-file architecture** (mapper, interface, service, optional listener, controller, routes) with manual DI.

---

## Context & Inputs

- **Target modules:** `[MODULE NAME]` (e.g. `User`).
- **Module spec:** `module-contracts/[module].md` (same folder used in Stage 01).
- **Contract:** `Apps/contract` (DTOs, Commands, Queries, route constants, enums, event types).
- **Rules:** `module-implementation-rules.md`.

---

## Steps

### Step 1 — Contract & Schema Analysis
- Compare the Prisma model with the contract DTO/Command/Query types.
- Plan the mapper: which fields to exclude (sensitive), which to convert (`Date → ISO string`), which enums to map (Prisma → contract).

### Step 2 — Component Definition
- **Interface:** `I[Name]Service` methods, derived from the routes the controller must serve. Methods return contract DTOs.
- **Events (in):** does the spec say this module *listens*? → plan `[name].listener.ts`.
- **Events (out):** does it *emit*? → plan `eventBus.emit(...)` calls in the service.

### Step 3 — Test Strategy
- Factories needed in `test/data`.
- Unit tests: service (mock Prisma) and mapper.
- Integration tests: endpoints via Supertest against the test DB.
- Conformance: responses parse against the contract DTO schema.

### Step 4 — Generate the Plan
Output `/docs/stage-02-backend/sub-02-module/results/plan-[module]-[setnumber].md` — a checklist of files to create (only those the modules needs):
1. `[name].mapper.ts`
2. `[name].interface.ts`
3. `[name].service.ts`
4. `[name].listener.ts` (optional)
5. `[name].controller.ts`
6. `[name].routes.ts` (composition root)

---

## Expected Outputs

- **`docs/stage-02-backend/sub-02-module/results/plan-[module]-[setnumber].md`** and a clear "vertical slice" for the modules.
