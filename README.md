# Referral App — High-Concurrency Referral Tracking Engine

A production-structured referral tracking system built for viral, time-boxed growth
campaigns — the canonical use case being "share this link, get your friends to join
our WhatsApp group before the event closes, climb the leaderboard."

The system is built around one constraint: the public redirect endpoint
(`GET /chat/:refCode`) has to stay fast under real concurrent load, correctly
tell a WhatsApp/Telegram link-preview crawler apart from a real human, and
never let a duplicate click from the same device inflate a referrer's score —
all without ever making the person clicking the link wait on a database write.

## How it works

```
                    ┌─────────────────────────┐
 Human / Crawler ──▶│  GET /chat/:refCode      │  target: <20ms
                    │  (Fastify redirect route)│
                    └────────────┬─────────────┘
                                 │
                 ┌───────────────┼────────────────┐
                 ▼                                 ▼
         ┌───────────────┐               ┌──────────────────┐
         │ Redis (hot)    │               │ queue:click_logs  │
         │ • event cache  │               │ (Redis list,       │
         │ • refCode →    │               │  pushed via an     │
         │   participant  │               │  onResponse hook — │
         │ • fingerprint  │               │  fires AFTER the   │
         │   dedupe set   │               │  redirect is sent) │
         │ • leaderboard  │               └─────────┬──────────┘
         │   (sorted set) │                          ▼
         └────────────────┘               ┌──────────────────┐
                                           │ click-log worker   │
                                           │ (separate process,│
                                           │  batches + drains) │
                                           └─────────┬──────────┘
                                                     ▼
                                           ┌──────────────────┐
                                           │ PostgreSQL         │
                                           │ click_logs          │
                                           │ event_audit_logs    │
                                           │ participants (score) │
                                           └──────────────────┘
```

**The redirect hot path never touches Postgres synchronously.** Once an event
and a `refCode` are cache-warm in Redis, a request is served from Redis alone;
click persistence is handed off to a background worker via a Redis list queue,
pushed from a Fastify `onResponse` hook that only runs *after* the redirect
has already gone out over the wire.

## Features

- **Bot & crawler detection** — WhatsApp, Telegram, Twitter, Facebook, and
  Googlebot get a server-rendered Open Graph preview page instead of a
  redirect, so link-unfurling never inflates a referrer's score.
- **Race-free duplicate detection** — a single atomic Redis `SADD` (not a
  separate exists-check-then-add) keeps the fingerprint dedupe correct even
  under many simultaneous requests for the same link.
- **Real-time leaderboard** — Redis sorted sets (`ZINCRBY`/`ZREVRANGE`), read
  straight from Redis on the dashboard, no polling a derived Postgres column.
- **Fully async click logging** — every click (valid, duplicate, or bot) is
  queued and flushed to Postgres in batches by a standalone worker process,
  decoupling database write volume from raw redirect QPS.
- **Host dashboard** — live metrics, leaderboard, and a searchable/filterable/
  paginated click log with CSV export.
- **Participant mini-dashboard** — mobile-first view of a referrer's own
  score, rank, countdown to event close, and a one-tap "copy my referral
  link + write-up" action.
- **Rate limiting tuned to the actual attack surface** — a global per-IP
  baseline, plus a tighter limit on the redirect route keyed on
  **IP + refCode together**, so flooding one link is throttled without
  penalizing someone legitimately clicking several different invites.

## Tech stack

| Layer | Choice |
|---|---|
| API framework | Fastify + TypeScript |
| Cache / real-time engine | Redis (strings, sets, sorted sets, lists) |
| Database | PostgreSQL via Prisma ORM |
| Background processing | Standalone worker process draining a Redis list queue |
| Frontend | Next.js (App Router) + Tailwind CSS |
| Auth | `@fastify/jwt` for hosts; a scoped HMAC token for participants |
| Logging | Pino |

## Project structure

```
referral-app/
├── prisma/schema.prisma       # Host, Event, Participant, ClickLog, EventAuditLog
├── src/
│   ├── app.ts / server.ts     # Fastify bootstrap + graceful shutdown
│   ├── config/env.ts          # zod-validated environment config
│   ├── lib/                   # redis.ts, prisma.ts, logger.ts
│   ├── middleware/            # rateLimiter.ts
│   ├── plugins/                # clickLogger.plugin.ts (async click logging)
│   ├── controllers/            # event, participant, redirect, analytics
│   ├── routes/                 # route registration per controller
│   ├── schemas/                 # zod input validation
│   ├── utils/                   # botDetector.ts, fingerprint.ts, hash.ts
│   └── workers/clickLogProcessor.ts   # batches Redis queue → Postgres
└── web/                        # Next.js host + participant dashboards
```

## API surface

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET`  | `/chat/:refCode`, `/i/:refCode` | none | The redirect engine |
| `POST` | `/api/v1/auth/register` | none | Create a host account |
| `POST` | `/api/v1/auth/login` | none | Log in as a host |
| `POST` | `/api/v1/events` | host JWT | Create a referral event |
| `GET`  | `/api/v1/events` | host JWT | List the authenticated host's events |
| `GET`  | `/api/v1/events/:id/public` | none | Public event summary (powers `/join/:eventId`) |
| `POST` | `/api/v1/participants/register` | none | Register as a referrer |
| `GET`  | `/api/v1/participants/me` | participant token | Own score/rank/countdown |
| `GET`  | `/api/v1/host/events/:id/dashboard` | host JWT | Metrics + leaderboard |
| `GET`  | `/api/v1/host/events/:id/logs` | host JWT | Paginated, filterable click logs |
| `GET`  | `/api/v1/host/events/:id/audit` | host JWT | Event audit trail |

All authenticated routes above (except the redirect engine and the two
public/no-auth ones) live under the `/api/v1` prefix — a request to
`/api/auth/register` (missing `v1`) will 404. If you're getting an
unexpected 404, check the path against this table first.

## Frontend pages (`web/`)

| Path | Purpose |
|---|---|
| `/` | Public landing page |
| `/login`, `/signup` | Host auth |
| `/host` | Host's event list (redirect target after login/signup) |
| `/host/events/new` | Create-event form |
| `/host/dashboard/:eventId` | Metrics, live leaderboard, click logs — includes a "copy join link" box |
| `/join/:eventId` | Public event page + participant registration form |
| `/p/:refCode` | Participant mini-dashboard (score, rank, countdown, share button) |

## Getting started

See [SETUP.md](./SETUP.md) for local development and Docker instructions.

## Known limitations

- The participant mini-dashboard's access token is a lightweight HMAC token,
  not a full JWT — deliberately scoped to just proving "I own this refCode,"
  not a general auth mechanism.
- No automated test suite yet (unit tests for the fingerprint/bot-detection
  logic and integration tests for the redirect race conditions are the
  highest-value next additions).
- CSV export on the host dashboard exports the currently loaded/filtered
  page, not a full unpaginated dataset.
- `GET /api/v1/events` returns every event for a host in one response, with
  no pagination — fine at small scale, but will need it eventually.

## License

MIT — see [LICENSE.md](./LICENSE.md).
