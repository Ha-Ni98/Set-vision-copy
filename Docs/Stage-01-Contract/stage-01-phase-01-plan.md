# Stage 01 · Phase 01 — Contract Architecture Planning

The foundational phase. We produce the blueprint for the `@my-app/contract` package from the per-module specs and the database schema. **No code yet.**

---

## Objective

Analyze every spec in `module-contracts/` and the Prisma schema to produce a detailed, typed blueprint for the contract package, with clear API boundaries and strict typing.

---

## Context & Inputs

- **Module specs:** `module-contracts/` (one file per module; read only the contract-relevant sections — see `contract-rules.md` §1).
- **Data source:** `prisma.schema` (the database source of truth).
- **Rules:** `contract-rules.md` (governs HOW; precedence policy in §0).
- **Constraint:** The frontend and backend do not exist yet. Rely solely on the specs and schema.

---

## Steps

### Step 1 — Module & Type Analysis
- **Ingest specs:** Read every file in `module-contracts/` and list all modules (e.g. `User`, `Order`, `Product`). For each, extract only routes, access control, input validation, output DTOs, and events.
- **Identify shared types:** Determine the common types used across modules (`ApiResponse`, `PaginatedResult`, the `paginated()` factory, shared enums) destined for `src/common`.
- **Security check:** Cross-reference `prisma.schema` against each spec's output DTO and confirm sensitive fields (passwords, tokens, internal flags) are explicitly excluded. Flag any spec that requests a sensitive field in an output (this is a §0 "WHICH conflict" — stop and ask).

### Step 2 — Module Specifications
- **Route validation:** Confirm the routes in each spec are RESTful and map cleanly to uppercase route constants.
- **Input mapping:** Map writes → `Create/Update[Name]Command`; reads → `Get[Name]sQuery`; path params → `[Route]ParamsSchema`.
- **Output mapping:** Map each response to a `[Name]ResponseSchema` / `[Name]DTO`, with dates as ISO strings.
- **Events:** For any spec with an Emits/Listens section, note the event names and payload DTOs.

### Step 3 — Generate the Action Plan
- **Create:** `/docs/stage-01-contract/plan.md`.
- **Structure:**
  1. **Part 1 — Common & Global:** global types, the `paginated()` factory, and the full `ErrorCode` list to define first.
  2. **Part 2 — Module Blueprints:** one detailed entry per module.

     **Example entry:**
     - **Module:** `User` (source: `module-contracts/user.md`)
     - **Routes:** `GET /users`, `GET /users/:id`, `PUT /users/:id`
     - **Commands:** `CreateUserCommand`, `UpdateUserCommand`
     - **Queries / Params:** `GetUsersQuery`, `UserIdParams`
     - **DTOs:** `UserDTO`
     - **Events:** `user:registered`
     - **Excluded sensitive fields:** `password`

---

## Expected Output

- A detailed plan file: **`/docs/stage-01-contract/results/plan.md`**.
