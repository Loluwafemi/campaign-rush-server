# Setup Guide

## Prerequisites

- Node.js 20+
- Docker + Docker Compose (for Postgres/Redis, or the full containerized stack)
- npm (or swap commands for your preferred package manager)

## Option A — Local development (recommended while iterating)

Run Postgres and Redis in Docker, everything else on your host.

### 1. Clone and install

```bash
git clone <your-repo-url> referral-app
cd referral-app
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and set at minimum:

- `JWT_SECRET` — generate one with `openssl rand -hex 32`
- `PUBLIC_BASE_URL` — `http://localhost:3001` for local dev
- `CORS_ORIGIN` — the origin(s) your frontend runs on; defaults to
  `http://localhost:3000`, which matches step 6 below. See
  [CORS configuration](#cors-configuration) if the frontend runs anywhere else.

Everything else has a sane default for local development.

### 3. Start Postgres and Redis

```bash
docker compose up -d postgres redis
```

### 4. Run database migrations and seed data

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

The seed script creates a demo host (`demo@referralapp.dev` /
`demo-password-123`), a sample event, and a few referral links so you have
something to look at immediately.

### 5. Start the API and the click-log worker

In two separate terminals:

```bash
npm run dev              # Fastify API on :3001
npm run worker:clicklog  # background click-log worker
```

Both need to be running — the redirect route enqueues clicks, but nothing
persists them to Postgres unless the worker is also up.

### 6. Start the frontend

```bash
cd web
npm install
cp .env.local.example .env.local
npm run dev               # dashboards on :3000
```

- Host dashboard: `http://localhost:3000/host/dashboard/<eventId>`
- Participant mini-dashboard: `http://localhost:3000/p/<refCode>?token=<dashboardAccessToken>`
  (the `token` query param comes from the response of
  `POST /api/v1/participants/register` — see below)



### 7. Try the flow end-to-end

```bash
# 1. Log in as the seeded host to get a JWT
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@referralapp.dev","password":"demo-password-123"}'


  curl -i -X POST \
  https://campaign-rush-server-production.up.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@referralapp.dev","password":"demo-password-123"}'

# 2. Register a participant against the seeded event (use the eventId from the seed output)
curl -X POST http://localhost:3001/api/v1/participants/register \
  -H "Content-Type: application/json" \
  -d '{"eventId":"<eventId>","name":"Test User","phoneNumber":"+15551234567"}'

# 3. Visit the refCode from step 2 in a browser
open http://localhost:3001/chat/<refCode>
```

## CORS configuration

The API and the frontend run on different origins in every setup here —
`http://localhost:3001` vs. `http://localhost:3000` locally, and typically
an `api.yourdomain.com` vs. `app.yourdomain.com` split in production. A
browser will block requests across that boundary unless the API explicitly
allows it, which is what `@fastify/cors` is doing in `src/app.ts`.

**Where it's configured:** `src/app.ts`, registered as the very first plugin
after Helmet — deliberately before `@fastify/jwt` and rate limiting, so a
browser's CORS preflight (`OPTIONS`) request is answered before anything
else runs on it.

**How it's driven:** entirely by the `CORS_ORIGIN` env var — a
comma-separated allowlist of exact origins, checked in `app.ts`'s `origin`
callback:

```bash
# Local dev (default) — matches step 6 above
CORS_ORIGIN=http://localhost:3000

# Production — list every origin your frontend is actually served from
CORS_ORIGIN=https://app.yourdomain.com,https://yourdomain.com
```

A few things worth knowing so you don't fight this later:

- **Origins must match exactly** — scheme, host, and port. `localhost:3000`
  and `127.0.0.1:3000` are different origins as far as CORS is concerned,
  even though they resolve to the same place. If your frontend is somehow
  running on a different port (e.g. Next.js fell back to `:3001` because
  `:3000` was taken), the request will be blocked until `CORS_ORIGIN` matches
  wherever it's actually running.
- **No trailing slash** — `http://localhost:3000/` will not match
  `http://localhost:3000`.
- **`credentials: true` is deliberately not set.** The dashboards authenticate
  with a `Bearer <token>` header (read from `localStorage`), not cookies, so
  there's nothing that needs the credentialed-CORS mode — turning it on would
  only widen the attack surface for no benefit here. If you later add
  cookie-based sessions, you'll need to add `credentials: true` on both the
  server (`@fastify/cors` config) and the client (`fetch(..., { credentials:
  "include" })`), and `CORS_ORIGIN` can no longer contain a wildcard.
- **Requests with no `Origin` header (curl, server-to-server calls, the
  click-log worker) always pass through**, regardless of `CORS_ORIGIN` — CORS
  is a browser-enforced mechanism, not a server-side allowlist for API
  clients in general. Don't rely on it as your only access control; it's
  what stops an arbitrary website's JavaScript from calling your API on a
  logged-in user's behalf, not a substitute for the JWT/participant-token
  checks already on every protected route.

**If you're still seeing a CORS error after setting this:**
1. Confirm the API actually restarted after you changed `.env` — `env.ts` is
   only read once, at process start.
2. Open the browser's network tab and check the *exact* value of the
   request's `Origin` header against `CORS_ORIGIN` — a typo or mismatched
   port is the most common cause.
3. Check the API logs for `"Blocked CORS request from disallowed origin"` —
   `app.ts` logs the rejected origin specifically so you don't have to guess.

## Option B — Full Docker stack

Runs Postgres, Redis, the API, and the worker as containers.

```bash
cp .env.example .env
# edit JWT_SECRET at minimum
docker compose up -d --build
```

Run migrations once the `postgres` container is healthy:

```bash
docker compose exec api npx prisma migrate deploy
```

The API is available on `http://localhost:3001`; the worker has no exposed
port (it only consumes the Redis queue). The frontend (`web/`) isn't part of
this compose file yet — run it separately with `npm run dev` inside `web/`,
pointed at the containerized API via `NEXT_PUBLIC_API_BASE_URL`. Since the
frontend still runs on your host (not in a container) in this setup,
`CORS_ORIGIN` in `.env` should stay `http://localhost:3000` regardless —
only `DATABASE_URL`/`REDIS_URL` get overridden to the in-network container
hostnames (see `docker-compose.yml`).

## Common tasks

| Task | Command |
|---|---|
| Open Prisma Studio (inspect DB visually) | `npx prisma studio` |
| Reset the database | `npx prisma migrate reset` |
| Type-check without building | `npm run typecheck` |
| Build for production | `npm run build` |

## Troubleshooting

- **`Invalid environment configuration` on startup** — a required env var is
  missing or fails validation; the error message lists exactly which field.
- **Redirect returns 404 for a refCode that should exist** — check the
  click-log worker and API are both pointed at the same Redis instance;
  a mismatched `REDIS_URL` between processes is the most common cause.
- **Clicks aren't showing up in the host dashboard** — confirm
  `worker:clicklog` is actually running; the redirect route succeeds
  independently of the worker, so this failure mode is easy to miss.
- **Browser console shows a CORS error** (`No 'Access-Control-Allow-Origin'
  header...` or similar) — see [CORS configuration](#cors-configuration)
  above. Almost always either `CORS_ORIGIN` not matching the frontend's
  actual origin, or the API not having been restarted after `.env` changed.
