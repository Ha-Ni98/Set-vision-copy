# Environment Variables

Every variable listed here must also exist in the `src/env.ts` Zod schema — the validator is the superset of everything the code reads. The app crashes on boot if a required one is missing or invalid.

## Required
- **`NODE_ENV`** — `development` | `production` | `test`. Drives logging and perf.
- **`PORT`** — listen port (default `3000`).
- **`API_PREFIX`** — route mount prefix (default `/api/v1`). Tests and the frontend use this.
- **`DATABASE_URL`** — Postgres connection string for Prisma.
- **`CORS_ORIGIN`** — frontend URL, no trailing slash.
- **`JWT_SECRET`** — min 32 chars. Generate with `openssl rand -hex 32`.
- **`JWT_EXPIRATION`** — access-token lifetime (default `15m`). Read by `token.utils`.
- **`LOG_LEVEL`** — Pino level (default `info`). Read by `config/logger`.

## Project-specific add-ons (add to the schema when you adopt them)
- **`TEST_DATABASE_URL`** — separate disposable DB for integration tests.
- **`JWT_REFRESH_SECRET` / `JWT_REFRESH_EXPIRATION`** — if using refresh tokens.
- **`REDIS_URL`** — caching/queues.
- **`SMTP_*` / `AWS_*`** — email / file uploads.

## `.env.example` (commit this; never commit a real `.env`)

```bash
# Application
NODE_ENV="development"
PORT=3000
API_PREFIX="/api/v1"

# Frontend (no trailing slash)
CORS_ORIGIN="http://localhost:5173"

# Database (Prisma)
DATABASE_URL="postgresql://user:password@localhost:5432/myapp?schema=public"
TEST_DATABASE_URL="postgresql://user:password@localhost:5433/myapp_test?schema=public"

# Auth — generate with: openssl rand -hex 32  (must be >= 32 chars)
JWT_SECRET="replace-with-openssl-rand-hex-32-output-0000000000"
JWT_EXPIRATION="15m"

# Logging
LOG_LEVEL="debug"
```
