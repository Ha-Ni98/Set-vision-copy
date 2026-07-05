# Deploying SetVision on Free-Tier Hosting

This app is a monorepo with three pieces:

- **`Apps/contract`** — shared Zod types. Consumed directly from TypeScript source
  (`package.json` → `"exports": {".": "./src/index.ts"}`) by both other apps via a
  `file:../contract` dependency. It is never built or deployed on its own — it just needs to
  exist as a sibling folder wherever `api`/`web` are installed.
- **`Apps/api`** — Express 5 + Socket.IO + Prisma/PostgreSQL. Because it holds long-lived
  WebSocket connections (activator/admin/client realtime), it needs a real, always-running
  Node process — not a serverless/edge function platform.
- **`Apps/web`** — a Vite + React SPA. Purely static once built; any static host works.

## Recommended free-tier stack

| Piece | Service | Why |
|---|---|---|
| Database | **[Neon](https://neon.tech)** (serverless Postgres) | Real free tier, no forced sleep/expiry, plain `postgresql://` connection string — drop-in for `DATABASE_URL`. |
| API | **[Render](https://render.com)** (Web Service, free instance) | Supports a persistent Node process with WebSockets on the free tier, no credit card required. Trade-off: spins down after ~15 min idle and cold-starts on the next request (a few seconds). |
| Web | **[Vercel](https://vercel.com)** | Zero-config static/Vite hosting, generous free tier, automatic SPA fallback routing. |

Alternatives if you'd rather not use one of these: **Supabase** for Postgres, **Fly.io** for the
API (also supports WebSockets on its free allowance), **Netlify** or **Cloudflare Pages** for the
web app. The steps below use Render/Vercel/Neon; swapping in an alternative only changes *where*
you paste the same environment variables.

Redis is **not** needed — `Apps/api/.env.example`'s `REDIS_URL` is only for horizontal scaling
(multiple API instances). A single free-tier instance doesn't need it.

## Prerequisites

- The repo pushed to a GitHub (or GitLab) repository — all three platforms deploy from a git repo.
- Node 18+ locally (to run the one-off admin/seed scripts against the production database).

---

## Step 1 — Database (Neon)

1. Create a free account at neon.tech, create a new project (any region close to your users).
2. Copy the connection string it gives you (starts with `postgresql://...`). Make sure it
   includes `?sslmode=require` — Neon requires SSL.
3. Keep this value handy as `DATABASE_URL` for Step 2.

### Copying your local database into Neon

If you want Neon to start out with exactly what's in your local `setvision_dev` database (all
tables, schema, and data as-is — including anything seeded via `load_wilaya`/`load_mock_data`/
`create_admin_account`), do this now, before Step 2:

```bash
# 1. Dump the local database. --no-owner/--no-acl drop local-role-specific ownership/grants
#    (Neon uses its own role, not your local "user"); --clean --if-exists makes the restore
#    safe to run even if Neon already has an empty schema on it.
pg_dump -h localhost -p 5432 -U user -d setvision_dev \
  --no-owner --no-acl --clean --if-exists \
  -f setvision_dump.sql

# 2. Restore into Neon.
psql "<your neon connection string>" -f setvision_dump.sql
```

This carries over Prisma's own `_prisma_migrations` bookkeeping table too, so Neon ends up
looking fully up-to-date to Prisma — Step 2's build command still runs `npx prisma migrate
deploy` on every deploy, which is harmless here (it just sees there's nothing new to apply).
Because everything local already came along, you can skip the `load_wilaya` step in Step 2's
"One-time data seeding" — it would just be re-applying data that's already there (harmless since
it's idempotent, but redundant). Still run `create_admin_account` if you want a fresh admin login
separate from whatever accounts already exist in the dump.

**Local data includes test data.** Everything from `load_mock_data` (activator1–activator10,
fake clients, test activations, weak test passwords like `test123`) comes over as-is with a full
copy — there's no filtering. That's fine for a first deploy/staging use, but worth remembering
before you point real users at this environment: clean up or delete the test rows (and rotate any
test credentials) before it's actually public-facing.

## Step 2 — API (Render)

### Create the service

1. New → Web Service → connect your repo.
2. **Root Directory:** `Apps/api` (Render still checks out the whole repo, so the sibling
   `Apps/contract` folder is present — the `file:../contract` dependency resolves fine).
3. **Runtime:** Node.
4. **Build Command:**
   ```
   cd ../contract && npm install && cd ../api && npm install --include=dev && npx prisma generate && npx prisma migrate deploy
   ```
5. **Start Command:**
   ```
   npx tsx src/server.ts
   ```

   > **Why not `npm run build && npm start`?** `Apps/api/tsconfig.json` has `"noEmit": true`,
   > which makes `tsc --outDir dist` (the `build` script) silently compile nothing — no `dist/`
   > folder is produced, so `node dist/server.js` (the `start` script) has nothing to run. This
   > is a pre-existing gap in `package.json`, not something specific to Render. Running the
   > source directly through `tsx` (the same tool the `dev` script already uses, minus
   > `--watch`) is what actually works today. If you'd rather have a real compiled build, the
   > underlying fix is to drop `noEmit` from `tsconfig.json` (or add a dedicated build
   > tsconfig) — the deploy steps here just work around it as-is.
   >
   > **Why `--include=dev`?** `tsx` and the `prisma` CLI are both devDependencies. Render (like
   > most PaaS) can skip devDependencies once `NODE_ENV=production` is set, which would break
   > both the build command above and the start command. `--include=dev` forces them to install
   > regardless.
   >
   > **No `--require dotenv/config`:** that flag is only for reading a local `.env` file in
   > development. In production, set the variables directly in Render's dashboard (below) — they
   > land in `process.env` on their own.

### Environment variables

Set these under the service's "Environment" tab (values from `Apps/api/.env.example`):

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | leave unset — Render injects its own `PORT` and the app already reads `process.env.PORT` |
| `API_PREFIX` | `/api/v1` (or leave default) |
| `DATABASE_URL` | the Neon connection string from Step 1 |
| `CORS_ORIGIN` | your Vercel URL once you have it, e.g. `https://your-app.vercel.app` (single origin — the app passes this straight to the `cors` package, it doesn't split a comma-separated list) |
| `JWT_SECRET` | a real random secret, **32+ characters** — generate one with `openssl rand -base64 32` or `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Never reuse the placeholder from `.env.example`. |
| `JWT_EXPIRATION` | `15m` (default) |
| `REFRESH_TOKEN_EXPIRATION` | `7d` (default) |
| `LOG_LEVEL` | `info` |
| `WS_PATH` | `/socket.io` (default) |

Leave `REDIS_URL` unset (single instance).

Deploy. Render will run the build command (installs, `prisma generate`, `prisma migrate deploy`
— this applies your schema to the empty Neon database), then start the server. Check
`https://<your-service>.onrender.com/health` returns `{"success":true,"data":{"status":"ok"}}`.

### One-time data seeding

`Apps/api/scripts/load-wilayas.ts` and `Apps/api/scripts/create-admin.ts` are plain Node scripts
that connect straight to whatever `DATABASE_URL` is in the environment — they're not exposed as
API routes. Run them **from your own machine**, pointed at Neon, not on Render itself (Render's
free tier has no shell console anyway, and these are interactive/one-shot, not services).

**Prerequisites (one-time, on your machine):**

```bash
cd Apps/api
npm install          # if you haven't already
npx prisma generate  # generates the Prisma Client these scripts import
```

**1. Load wilayas/communes** (required reference data — distributors are addressed by wilaya/
commune, so this must exist before you create distributors). Safe to re-run — it's an upsert
keyed on each wilaya/commune's code:

```bash
DATABASE_URL="<your neon connection string>" npm run load_wilaya
```

Expected output: `✓ Loaded 69 wilayas and 1541 communes.`

**2. Create your admin login.** This one is interactive — it'll prompt you one field at a time:

```bash
DATABASE_URL="<your neon connection string>" npm run create_admin_account
```

```
Username: admin
Full name (blank = username): Admin
Password: ********        ← typed characters show as * on a real terminal, not echoed at all otherwise
Phone: 0555000000
✓ Admin "admin" created (adminId: ...).
```

All four fields are required except full name (blank falls back to the username). It fails
loudly if the username is already taken (`✗ create_admin_account failed: Username "admin" is
already taken.`) — re-run with a different username, or just log in with the existing one. You
can run this again anytime to add more admin accounts.

Skip `load_mock_data` — it's for local/demo seeding, not a production database.

> If you already restored a full local dump (previous section), both of these are optional:
> `load_wilaya` would just re-upsert data that's already there, and any admin accounts from your
> local `User`/`Admin` tables came along with the dump too. Still fine to run `create_admin_account`
> again if you want a dedicated production login separate from your local test accounts.

## Step 3 — Web (Vercel)

Deploy the API first — the frontend needs its live URL baked in at build time.

1. New Project → import the same repo.
2. **Root Directory:** `Apps/web`.
3. Framework preset: Vite (Vercel auto-detects this; it also auto-configures the SPA fallback
   so client-side routes like `/admin/activations/sets-lots` don't 404 on a direct refresh — if
   you use a different static host instead, add an explicit rewrite of all paths to
   `index.html`).
4. **Build Command:** `cd ../contract && npm install && cd ../web && npm install && npm run build`
5. **Output Directory:** `dist`

### Environment variables

| Key | Value |
|---|---|
| `VITE_API_URL` | `https://<your-render-service>.onrender.com/api/v1` |
| `VITE_WS_URL` | `https://<your-render-service>.onrender.com` (no `/api/v1` — Socket.IO attaches at `WS_PATH`, separate from the REST prefix) |

> Vite bakes `VITE_*` variables into the static bundle at build time — they are not read at
> runtime. If you change the API URL later, you must trigger a new Vercel build, not just
> restart anything.

Deploy. Once it's live, go back to Render and set `CORS_ORIGIN` to this Vercel URL (you couldn't
know it before this step), then redeploy the API so CORS actually allows the frontend's origin.

## Step 4 — Smoke test

1. Open the Vercel URL — the public client-activation landing page should load.
2. Go to `/login` and sign in with the admin account created in Step 2.
3. Open two tabs (e.g. an activator view and the client landing page for one of that
   activator's cards) and confirm a change on one side reflects on the other without a manual
   refresh — this exercises the Socket.IO connection end-to-end, the part most likely to be
   misconfigured (wrong `VITE_WS_URL`, wrong `CORS_ORIGIN`, or a `WS_PATH` mismatch).

## Known free-tier limitations

- **Render cold starts:** the free instance sleeps after ~15 minutes of no traffic; the first
  request after that takes several seconds while it wakes up (including a fresh socket
  handshake). A paid instance removes this; there's no free workaround beyond an external
  uptime-pinger, which Render's own terms discourage.
- **Neon compute suspend:** Neon's free tier also suspends the compute endpoint after inactivity;
  the first query after a gap has a similar short cold-start delay. Data itself is not affected.
- **Single instance only:** don't scale the Render service past 1 instance without also
  provisioning Redis and uncommenting `REDIS_URL` — the realtime layer's room-based broadcasts
  assume a single in-process Socket.IO server otherwise.


database url: postgresql://neondb_owner:npg_rOT6WVEuRq7P@ep-orange-credit-aspj3dtb.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require