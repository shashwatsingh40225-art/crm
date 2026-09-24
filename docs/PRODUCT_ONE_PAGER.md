# Invictus CRM — Verena Self-Launch

**One-pager for future CV / portfolio use.** Built solo by Shashwat Singh in ~3 days (9–11 Sep 2026), as a take-home assignment for an Operations Associate (GTM & AI Agent Operations) role — using Claude Code to execute a plan and file split Shashwat designed and directed.

---

## What it is

An internal CRM for running a single company's go-to-market launch: capture prospects from two different motions — outbound-scanned ICP targets and inbound self-serve signups — move them through one sales pipeline, log everything that happens to them, and surface what needs a human's attention today. Not a generic CRM clone; a system scoped tightly to one company's one launch, with the specific business rules that launch needs enforced in the software rather than left to convention.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Prisma 6 · Supabase Postgres · deployed on Vercel.

---

## What makes it stand out

### 1. Stage gates are enforced server-side, not decorative
The pipeline has 7 stages, and each one has real entry criteria — e.g. a deal can't leave `Scanned` without an ICP-fit verdict and at least one recorded finding; it can't leave `Contacted` without a recorded outreach timestamp. A stage is a **business state**, not a label on a dropdown. Every stage transition is validated in the API route with Zod; failing the check returns a structured `422` naming exactly which fields are missing, and the UI surfaces that inline instead of silently blocking the drag.

I checked this against two real open-source CRMs before building it:
- **[Twenty](https://twenty.com)** (44k+ GitHub stars) — kanban stages are values on a generic Select field; the backend accepts any transition unconditionally.
- **[Atomic CRM](https://github.com/marmelab/atomic-crm)** (Marmelab, MIT) — `onDragEnd` writes the new stage straight to the row, no validation layer.

Neither enforces stage entry criteria out of the box. Building that check was true from-scratch work, not something a platform or a template gave me for free.

### 2. One pipeline, two entry points — not two systems bolted together
Outbound-scanned prospects enter at `Scanned`; inbound self-serve signups enter at `Engaged` and skip straight past the stages that don't apply to them (`source = inbound_signup`). Same schema, same pipeline, same reporting — no duplicated "leads" table, no separate inbound funnel that has to be reconciled with the outbound one later.

### 3. Lifecycle stage as a field, not a second identity
Company and Contact carry `lifecycleStage` directly. There is no separate `Lead` object that gets "converted" into a Contact. This is HubSpot's model, deliberately chosen over Salesforce's — Salesforce's Lead→Contact conversion is a well-documented source of duplicate companies and split activity history when a lead syncs before it has an associated account. Modeling it as a field sidesteps that failure mode entirely rather than adding reconciliation logic to fix it after the fact.

### 4. Every mutation is audited, correctly — including the trap that catches most people
Every write anywhere in the system produces an immutable `AuditEvent` recording who did what, before/after state, and when. The obvious way to build this — `prisma.$use()` middleware — was deprecated in Prisma 4.16 and **fully removed in 6.14**, so most tutorials and most AI-generated code for this still describe a mechanism that silently does nothing on a current Prisma version. I built it correctly instead: a Prisma Client Extension on `$allOperations`, with `AsyncLocalStorage` carrying the acting user's ID across the async boundary — and caught a second, subtler bug in my own first version, where an unawaited Prisma promise could escape the tracking scope and log a write with no actor at all.

### 5. Nothing is ever deleted
Removing a Company, Contact, or Deal sets `archivedAt`; the row, its history, and every linked record stay intact. This wasn't the easy default — Postgres's cascading deletes made hard-delete the path of least resistance — but a hard delete would have taken every linked deal's append-only stage history down with it, silently, the first time someone fat-fingered a "remove" button on shared data. Soft-delete was the deliberate, harder-to-implement choice.

### 6. Built with parallel AI agents split by feature, not by layer
Once the schema was frozen, three (later four) Claude Code sessions worked the same codebase in parallel — one owning Companies/Contacts, one owning the pipeline/kanban, one owning activities/dashboard/tasks — each restricted to its own directories, reading each other's tables directly through one shared Prisma client but never writing outside its lane. The schema freeze and the file-ownership split were the two decisions that made four-way parallel AI work not collide with itself.

---

## Scope, stated honestly

What's **in**: companies, contacts, a 7-stage gated pipeline serving both outbound and inbound motions, activity logging, tasks, a funnel dashboard, CSV import, audit logging, soft-delete with archive/restore, and (phase 2) a review queue for automatically-ingested scan findings.

What's deliberately **out**: a second, affiliated line of business (legal case/matter management) was scoped out entirely and documented as a boundary decision, not an oversight — the affiliated firm's client data carries privileged-information and non-lawyer-ownership constraints that make pooling it into a commercial CRM a legal problem, not a feature request. Recognizing that and drawing the line was as much a part of the exercise as the code.

---

## Why this is worth a CV line

Most take-home CRM builds — and most tutorial CRMs — either configure an existing platform or clone a kanban board with a plain status field. This one:
- **enforces business rules a well-known open-source competitor with 40x the GitHub stars does not**,
- **avoids a real, named, widely-documented CRM integration failure mode** (Salesforce lead-conversion duplication) **by data-model choice, not by patching**,
- **catches an ORM footgun that ships broken in most AI-generated code today** (deprecated Prisma middleware, plus the unawaited-promise variant of the same bug),
- and does it in **three days, solo**, using AI pair-programming as an execution tool for a plan and architecture the author made every call on — schema, gating rules, cut order, and scope boundary included.

---

*Draft raw material for a CV bullet or portfolio blurb — not a submission document. Pull sentences from "What makes it stand out," not the whole page.*
