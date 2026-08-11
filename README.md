# YB Travel Platform

Internal travel operations platform for YB Travel — client intake through to ticketing, trip servicing and reconciliation.

**Status:** platform foundation scaffolded, plus a live WhatsApp inbox (Baileys, on a separate/test number). Phase 1/2 business logic is not built yet.

## Contents

```
CLAUDE.md                              Context and conventions — read first
CHANGELOG.md                           What changed and why, newest first
docs/
  01-technology-stack.md               Approved stack, v3
  02-design-system.md                  Design tokens, extracted from the approved UI
  03-deliverables.md                   105 deliverables across Phases 1–8
  05-open-decisions.md                 What's still unanswered, and what it blocks
  source-product-blueprint.docx        Client source document
  source-deliverables.xlsx             Client source workbook
design/
  requests-queue.approved.html         Client-approved UI, authoritative for styling
  prototypes/
    RequestsQueue.jsx                  Original standalone prototype (superseded by apps/web/src/routes/requests.tsx)
    Home.jsx                           Original standalone prototype (superseded by apps/web/src/routes/index.tsx)
apps/
  web/                                 React 19 + TypeScript + Vite, Tailwind v4, TanStack Router
  api/                                 NestJS, Postgres health check, module skeleton
packages/
  shared/                              Zod schemas / types shared by web and api
docker-compose.yml                     Local Postgres 17 for development
```

## Approved stack

React 19 + TypeScript + Vite · NestJS · PostgreSQL 17/18 · Redis + BullMQ · Auth0 · Socket.IO · S3-compatible storage. Modular monolith with every external system behind an adapter interface.

See `docs/01-technology-stack.md` for the reasoning and `CLAUDE.md` for the conventions that matter.

## Getting started

Requires **Node 20.19+** (TanStack Router and Tailwind's native engine both need it) and **Docker** for local Postgres. Use `nvm`/`fnm` if your default Node is older.

```bash
npm install
npm run db:up          # starts Postgres 17 in Docker, mapped to host port 5433
cp apps/api/.env.example apps/api/.env
npm run dev:api         # NestJS on :3001 — curl localhost:3001/health
npm run dev:web         # Vite on :5173
```

Postgres is mapped to **5433**, not 5432 — several dev machines already run a native Postgres on 5432, and colliding with it silently connects to the wrong server instead of failing loudly. Adjust `apps/api/.env` if your setup differs.

Then apply the schema and connect WhatsApp:

```bash
npm run db:migrate --workspace apps/api
```

Open `/inbox` in the browser and scan the QR code from a **separate/test WhatsApp number** (WhatsApp → Linked Devices → Link a Device) — not the live business number. See `docs/05-open-decisions.md` #9 for why. The session persists in `apps/api/.baileys-auth/` (gitignored) so restarts don't require re-scanning.

`npm run typecheck` runs `tsc --noEmit` across all workspaces.

## First release

Phases 1 and 2 — 41 deliverables, all Must Have — covering CRM and client intake, then the request → research → quote → payment → booking workflow. Plus Phase 0 security and architecture work, and the Yaalago replacement scope, neither of which is yet in the workbook.

## What's scaffolded vs. what's next

Done: monorepo structure, Tailwind theme tokens matching `docs/02-design-system.md`, the Home and Requests screens as real routed pages, a NestJS module skeleton (`clients`, `requests`, `auth`) with a working Postgres-backed health check.

Deliberately not done yet — each is a separately-gated decision in `docs/05-open-decisions.md`: ORM choice (Drizzle vs Prisma), real Auth0 wiring (approval pending), Redis/BullMQ jobs, the WebSocket gateway, and any actual domain schema or business logic.

## Prototypes

`design/prototypes/*.jsx` are the original standalone files the design was approved from — kept for reference. The versions actually running live in `apps/web/src/routes/`, ported onto Tailwind theme tokens per `CLAUDE.md`'s instruction to convert away from inline styles when scaffolding the real app.

## Conventions

Money as `NUMERIC` with explicit currency, never floating point. Flight times stored as local time plus airport, timezone, computed UTC and the offset used. Posted financial records append-only. Human approval required for all ticketing and financial actions. Full detail in `CLAUDE.md`.
