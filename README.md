# YB Travel Platform

Internal travel operations platform for YB Travel — client intake through to ticketing, trip servicing and reconciliation.

**Status:** pre-implementation. Architecture and design are approved; no application code yet.

## Contents

```
CLAUDE.md                              Context and conventions — read first
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
    RequestsQueue.jsx                  Working prototype — saved views, sort, live countdowns
    Home.jsx                           Working prototype — agent desk, WhatsApp intake demo
```

## Approved stack

React 19 + TypeScript + Vite · NestJS · PostgreSQL 17/18 · Redis + BullMQ · Auth0 · Socket.IO · S3-compatible storage. Modular monolith with every external system behind an adapter interface.

See `docs/01-technology-stack.md` for the reasoning and `CLAUDE.md` for the conventions that matter.

## First release

Phases 1 and 2 — 41 deliverables, all Must Have — covering CRM and client intake, then the request → research → quote → payment → booking workflow. Plus Phase 0 security and architecture work, and the Yaalago replacement scope, neither of which is yet in the workbook.

## Prototypes

The two files in `design/prototypes/` are React components with sample data, built to the approved design. Drop them into a Vite + React app to view. They are reference for look and behaviour, not production code.

## Conventions

Money as `NUMERIC` with explicit currency, never floating point. Flight times stored as local time plus airport, timezone, computed UTC and the offset used. Posted financial records append-only. Human approval required for all ticketing and financial actions. Full detail in `CLAUDE.md`.
