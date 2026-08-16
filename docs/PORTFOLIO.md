# Referral App — Portfolio Write-up

**A high-concurrency referral tracking engine, built to stay fast under real
viral traffic without sacrificing correctness.**

## The problem

Referral growth campaigns — "share this link, get people to join our
WhatsApp group before the timer runs out, climb the leaderboard" — live or
die on one endpoint: the redirect link itself. That endpoint has three
competing requirements that most simple implementations get wrong:

1. It has to be **fast**, because every millisecond of latency is friction
   between a share and a join, and a viral link can spike traffic by orders
   of magnitude with no warning.
2. It has to be **correct under concurrency** — the same link, clicked from
   the same device, should never score twice, even when two requests for it
   arrive within microseconds of each other.
3. It has to **tell humans apart from link-preview crawlers** — WhatsApp,
   Telegram, and Twitter all fetch a URL once to build a rich preview card,
   and none of those fetches should count as a real referral.

This project is my answer to all three, built end-to-end: data model,
Redis-backed hot path, async persistence pipeline, host analytics API, and
both the host and participant-facing dashboards.

## What I built

- **A sub-20ms redirect engine** (Fastify + Redis) that never makes a
  synchronous database call once an event's data is cache-warm — link
  resolution, bot detection, fingerprint dedupe, and leaderboard scoring
  all happen against Redis alone.
- **A race-free duplicate-click guard.** The obvious implementation
  ("check if this fingerprint exists, then add it") has a race window under
  concurrent load — two simultaneous requests can both pass the check before
  either writes. I used a single atomic `SADD`, whose return value *is* the
  check, closing that window entirely.
- **A fully decoupled async logging pipeline.** Every click — valid,
  duplicate, or bot — is pushed onto a Redis list queue from a Fastify
  `onResponse` hook, which Fastify guarantees fires *after* the response has
  already been sent. A separate worker process drains that queue in batches
  and writes to Postgres, so database write throughput scales with worker
  capacity, not with raw redirect QPS.
- **Server-side rendered Open Graph previews** for known crawler user
  agents, with its own CSP and security headers, distinct from the redirect
  path a real click takes.
- **A host analytics API and dashboard** — real-time leaderboard read
  straight from a Redis sorted set, paginated/filterable click logs, and a
  fraud/duplicate-rate metric, all scoped so one host can never query
  another host's event data.
- **A participant mini-dashboard** with a live countdown, current
  rank/score, and a one-tap "copy my link and share message" action —
  authenticated by a narrowly scoped HMAC token rather than a full session,
  since a participant only ever needs to prove they own one `refCode`.
- **Rate limiting keyed to the actual attack surface** — not just per-IP,
  but per IP-and-refCode on the redirect route specifically, so a
  click-flood against one link gets throttled without collateral damage to
  someone browsing several different invites.

## Stack

Fastify, TypeScript, Redis, PostgreSQL (Prisma), Next.js (App Router),
Tailwind CSS, Pino.

## What I'd build next

An automated test suite around the fingerprint/dedupe logic and the
bot-detection heuristics (the highest-risk correctness surface in the whole
system), a scheduled sweep to flip expired events out of `ACTIVE` status
instead of checking expiry live on every read, and splitting the redirect
route into its own independently scalable service — the module boundaries
are already there for it.
