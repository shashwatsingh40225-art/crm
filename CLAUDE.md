# CLAUDE.md — Invictus CRM (Verena Self-Launch)

Every Claude Code session working in this repo reads this file. It is the shared contract
between the Foundation session and the three parallel feature agents. If something here
conflicts with what you think is right, **stop and ask Shashwat** — do not resolve it yourself.

**Also read:** `CONTEXT.md` (vocabulary — what a Company, Deal, Stage, StageEvent actually
mean here), `docs/AGENT_CONTRACT.md` (the interfaces Foundation built and you consume —
shared primitives, the audit helpers, the `<ActivityTimeline>` signature), and
`docs/adr/*.md` (decisions that would be expensive to reverse mid-build). Vocabulary is not
duplicated in this file. Use the words in `CONTEXT.md` in code, in identifiers, and in what
you write back to Shashwat.

---

## 1. What this is

The internal CRM Invictus uses to run Verena's go-to-market launch: capture prospects and
self-serve signups, move them through one pipeline, record what happened, and surface what
needs a human today.

Built in 48 hours as an assignment. Two constraints follow from that and shape every call
you make:

- **Scope discipline is being assessed.** Do not build things that aren't ticketed. If a
  ticket's acceptance criteria are met, stop — polish is not free here.
- **The Linear board is the primary deliverable.** Ticket status changes are made by
  Shashwat, by hand, as work actually happens. **Agents never touch Linear.** Even if a
  Linear MCP is available to you, do not create, update, comment on, or close issues.

---

## 2. Locked decisions (D1–D11)

Do not reopen any of these. If you find evidence that contradicts one, say so and stop.

| # | Decision |
|---|---|
| D1 | **Build custom.** Do not propose configuring HubSpot or any other CRM. Settled. |
| D2 | Stack: **Next.js 15 + TypeScript + Tailwind + shadcn/ui + Supabase Postgres + Prisma**, deployed on Vercel. One repo, one deploy. |
| D3 | **One pipeline serves both motions.** Outbound-scanned prospects enter at `Scanned`; inbound self-serve signups enter at `Engaged` with `source = inbound_signup`. There is no second pipeline. |
| D4 | **Lifecycle stage is a field on Company and Contact. There is no Lead object.** HubSpot's model, not Salesforce's — it avoids duplicate identity and split activity history at conversion. Do not introduce a `Lead` model, table, route, or type. |
| D5 | Three parallel agents split **by feature, not by layer**. See §7. |
| D6 | **The schema is frozen before the fork. Only Shashwat unfreezes it.** See §8. |
| D7 | Invictus Counsel — matters, documents, conflicts checking — is **out of scope entirely**. No such tables, routes, or fields. Not a gap; a deliberate boundary. |
| D8 | MUST scope first. Build beyond it only when the MUSTs are done. |
| D9 | Foundation and each feature agent run as a **separate Claude Code Desktop session**, one per git worktree. |
| D10 | Session names map 1:1 to the Linear Owner labels: `foundation`, `agent-a-records`, `agent-b-pipeline`, `agent-c-activity`. |
| D11 | Permission modes and the two `ask` rules. See §11. |

### Cut order if time runs short

Exhaust **every SHOULD before touching any MUST**, in this order: CSV import → company
dedupe → stalled-deals widget → lost-reason capture. Then the Stretch items. The funnel
dashboard is a **MUST** and is the artifact the brief names by hand — it is never cut, and
any earlier document that says otherwise is wrong.

---

## 3. Data model — frozen

Vocabulary and meaning live in `CONTEXT.md`. This is the shape.

```
User        id, email, name, role, auth_user_id, created_at, updated_at
Company     id, name, domain, industry, size, source, icp_fit,
            lifecycle_stage, owner_id, created_at, updated_at
Contact     id, company_id, name, email, title, phone,
            lifecycle_stage, owner_id, created_at, updated_at
Deal        id, company_id, primary_contact_id, name, stage_id,
            source, last_outreach_at, verena_plan_interest,
            proposed_tier, proposed_mrr, next_action, next_action_due,
            outcome, lost_reason, closed_at, owner_id,
            created_at, updated_at
Pipeline    id, name, created_at
Stage       id, pipeline_id, key, name, position, probability
StageEvent  id, deal_id, from_stage_id, to_stage_id, changed_by, changed_at
Activity    id, type, subject, body, company_id?, contact_id?,
            deal_id?, occurred_at, created_by, created_at
Task        id, title, due_date, owner_id, completed_at,
            company_id?, contact_id?, deal_id?, created_at, updated_at
Finding     id, company_id, framework, observation, evidence_url,
            confidence, reviewed_by, reviewed_at, created_at
AuditEvent  id, entity_type, entity_id, action, actor_id,
            before, after, created_at
```

Prisma fields are camelCase (`deal.nextActionDue`); columns are the snake_case names above.
`Stage.key` is the stable handle the gate reads — never `Stage.name`, or renaming a stage in
the UI silently disables its entry criteria. The `Finding` **table** exists because the
stage-1 gate requires ≥1 finding; the Findings **feature** is still stretch.

**StageEvent is append-only.** Never update or delete a StageEvent row. A correction is a
new transition, not an edited history.

---

## 4. The pipeline — seven stages, gated

A stage is a **business state, not a dropdown value**. Advancing past a stage requires its
fields to be present; the check is enforced server-side in the API route, not only in the UI.
This is the single most differentiating thing in the build — neither Twenty nor Atomic CRM
enforces stage entry criteria, both just write the new stage unconditionally. Do not
regress it into a plain SELECT field.

| # | Stage | Entry criteria | Exit criteria | Required to advance |
|---|---|---|---|---|
| 1 | **Scanned** | Prospect site scanned, findings captured | ICP fit confirmed by a human | `icp_fit`, ≥1 finding |
| 2 | **Qualified** | Findings meet threshold and fit confirmed | Outreach sent | `owner`, `primary_contact` |
| 3 | **Contacted** | First outreach sent | Reply received | `last_outreach_at` |
| 4 | **Engaged** | Prospect replied or meeting booked | Trial or demo scheduled | `next_action`, `next_action_due` |
| 5 | **Evaluating** | Verena account created or demo held | Plan tier proposed | `verena_plan_interest` |
| 6 | **Proposal** | Tier and price presented | Decision made | `proposed_tier`, `proposed_mrr` |
| 7 | **Won / Lost** | Subscribed, or declined | — | `lost_reason` if Lost |

Rules:

- Failing the gate returns a **422 with the list of missing fields**, and the UI shows them
  inline. It does not silently refuse the drag.
- Every successful transition writes a **StageEvent** — including drags on the kanban board.
- Inbound signups are created directly at `Engaged` with `source = inbound_signup`. They
  skip `Scanned` and `Contacted`; that skip is not a gate violation.
- Backwards moves are allowed and are logged as StageEvents like any other transition.

Verena plan tiers, for `proposed_tier` / `proposed_mrr`:
Starter $99 / Professional $299 / Enterprise $999 per month.

---

## 5. Audit logging — the trap, read before writing any mutation

**`prisma.$use()` middleware was deprecated in Prisma 4.16 and removed in v6.14.0.** Most
pre-2025 tutorials use it. If you write it, it will not run, and every mutation will look
audited while writing nothing.

**Correct pattern:** a Prisma Client Extension on `$allOperations`, with `AsyncLocalStorage`
carrying the acting user's id. Reference: `prisma/prisma-client-extensions` →
`audit-log-context`.

- Built once in Foundation as `lib/audit.ts` and `lib/db.ts`. Feature agents **import it and
  never modify it**.
- **Every mutation writes an AuditEvent.** No exceptions.
- Keep audited routes on the **Node.js runtime** (`export const runtime = 'nodejs'`). ALS
  context is lost on Edge — an audited route on Edge fails silently.
- Wrap every mutating route in `withActor(user.id, async () => { ... })` or the AuditEvent
  writes with a **null actor**.

**The lazy-promise trap — Foundation hit this and fixed it.** Prisma promises are lazy:
`prisma.deal.update(...)` only builds a `PrismaPromise`, and the query — with the audit
extension — runs when something awaits it. A callback that *returns* the promise unawaited
lets it escape the `withActor` scope and log a null actor, even though the code looks
right. `withActor` now awaits internally so both forms work, but always write the explicit
form so it survives someone "simplifying" the helper:

```ts
await withActor(user.id, async () => {
  return await prisma.deal.update({ where, data });
});
```

A null `actorId` on an AuditEvent from a route is this bug until proven otherwise. Full
detail in `docs/AGENT_CONTRACT.md` §2.

---

## 6. API and UI contract every agent codes against

- Every list endpoint returns `{ data, total }`.
- Every mutation writes an AuditEvent through `lib/audit.ts`.
- Every detail page renders `<ActivityTimeline entityType="company" entityId={id} />` —
  Agent C's component, stubbed in Foundation so Agents A and B are never blocked on it.
- Server-side validation on every write. The UI is not the enforcement layer.
- Use the shared primitives in `components/ui/**`. Do not hand-roll a second data table.

---

## 7. File ownership

| Agent | Owns | May write | Never touches |
|---|---|---|---|
| **Foundation** | schema, auth, shared libs and UI, shell, seed | everything, pre-fork | — |
| **Agent A — Records** | Companies, Contacts | `app/(nav)/companies/**`, `app/(nav)/contacts/**`, `app/api/companies/**`, `app/api/contacts/**` | schema, shared paths, other agents' dirs |
| **Agent B — Pipeline** | Deals, stages, board | `app/(nav)/deals/**`, `app/api/deals/**`, `app/api/stages/**` | schema, shared paths, other agents' dirs |
| **Agent C — Activity & Dashboard** | Activities, tasks, timeline, funnel | `app/(nav)/activities/**`, `app/(nav)/tasks/**`, `app/(nav)/dashboard/**`, `app/api/activities/**`, `app/api/tasks/**` | schema, shared paths, other agents' dirs |

**Page routes live inside the `(nav)` route group** so they inherit the authenticated shell
(sidebar, header, breadcrumb, `requireUser()` gate) — `/login` must not inherit it, which is
why the group exists. **API routes are unaffected**: `app/api/<section>/**` as listed above.

**Shared, built in Foundation, read-only afterwards:**
`prisma/schema.prisma`, `lib/db.ts`, `lib/audit.ts`, `components/ui/**`, `app/layout.tsx`,
`app/(nav)/layout.tsx`.

If your work seems to require writing outside your directories: **stop and report it.** Do
not write the file "just this once" — that is exactly the collision the split exists to
prevent.

---

## 8. Schema freeze (D6)

The schema is committed and pushed by Foundation before any agent forks. After that:

- No agent edits `prisma/schema.prisma`.
- No agent runs `prisma migrate` — not `dev`, not `deploy`, not `reset`.
- If you genuinely need a field that doesn't exist: **stop, and tell Shashwat exactly which
  model, which field, which type, and why.** He makes the change in the Foundation session,
  pushes, and tells the other agents to pull. Two minutes. The failure mode this prevents is
  three agents each generating a conflicting migration.

---

## 9. Cross-agent reads — ADR 0002

**Agents read other agents' tables directly through the shared Prisma client. Agents never
call each other's API routes.**

Agent B's Deal-creation UI needs to search Companies and Contacts, which Agent A owns. Agent
B calls `prisma.company.findMany()` / `prisma.contact.findMany()` from its own route under
`app/api/deals/**`. It does not call `/api/companies`.

Why: the schema is shared and frozen, so any agent can safely read any table. Calling
another agent's route would make your feature untestable until that agent merges — which
defeats the point of splitting by feature.

**Writes stay inside your owned directories. Reads do not have to.**

---

## 10. Foundation pre-install list (Q6)

Foundation installs all of these **before the fork**, so no agent runs `npm install`
mid-build:

| Package | For |
|---|---|
| `@dnd-kit/core`, `@dnd-kit/sortable` | Kanban drag-and-drop (Agent B) |
| `@tanstack/react-table` (v8) | Data tables (all agents) |
| `papaparse` | CSV import (Agent A, SHOULD) |
| `@faker-js/faker` | Seed data |
| `nuqs` | URL-state for filters and search |
| shadcn Recharts chart block (`npx shadcn@latest add chart`) | Funnel dashboard (Agent C) |

If a feature agent believes it needs a package that isn't here: **stop and ask.** Do not
install it. A stray dependency in one worktree breaks the other three at merge.

---

## 11. Permission modes and the two `ask` rules (D11)

**`foundation` runs Manual.** Schema, auth and audit are the highest-stakes work in the build
and every action gets looked at.

**The three feature sessions run Auto mode**, plus two explicit `ask` rules in
`.claude/settings.json`. Auto mode's classifier approves routine work — including merges and
pushes to `main`, and edits to any file — without prompting Shashwat at all, which would
silently break both D6 and his review flow. Explicit `ask` rules are **never auto-approved in
any permission mode**, so this keeps Auto's speed on ordinary CRUD and forces a real human
stop at the two moments that matter.

```jsonc
// .claude/settings.json
{
  "permissions": {
    "ask": [
      "Edit(prisma/schema.prisma)",
      "Edit(lib/db.ts)",
      "Edit(lib/audit.ts)",
      "Edit(components/ui/**)",
      "Edit(app/layout.tsx)",
      "Edit(app/(nav)/layout.tsx)",
      "Bash(git merge:*)",
      "Bash(git push:*)",
      "Bash(npx prisma migrate:*)",
      "Bash(npm install:*)"
    ]
  }
}
```

**Auto mode confirmed available, 9 Sep** — it appears in the desktop Code tab's mode
selector next to the send button. Pick it there when creating each feature session; the app
remembers the pick per folder. One trap: `"defaultMode": "auto"` does **not** take effect
from `.claude/settings.json` or `.claude/settings.local.json` — set there, the session
silently starts in Manual. The `ask` rules above are unaffected and work from the project
settings file normally.

---

## 12. Checkpoints — goal-based, per slice

Checkpoints are tied to **logical ticket slices**, not to the clock. Slices below are derived
from the real Linear dependency graph.

A session only acts when given a task. Within a task, chain through the whole slice without
stopping unless you are blocked or an `ask` rule fires. **At the end of each slice:**

1. Stop.
2. Write a **plain-text summary** — what you built, checked against each ticket's acceptance
   criteria, one ticket at a time. Name anything you could not satisfy and why.
3. **End with a "Linear actions" section — required, every checkpoint.** Spell out, ticket
   by ticket, exactly what Shashwat should do in Linear: move `INV-NN` to **Done**, move
   `INV-NN` to **In Progress**, or move `INV-NN` to **Cancelled** with a one-line reason.
   Plain words, assuming zero Linear experience. Do not make him infer this from the
   acceptance-criteria table above — state it as its own separate list. If nothing changes
   status this checkpoint, say so explicitly ("No Linear action needed this checkpoint")
   rather than omitting the section. **You never make the change yourself — only name it.**
4. Flag anything you'd normally have decided silently: a field you wanted, a shared file you
   wanted to touch, an ambiguity in a ticket.
5. Wait. Shashwat reads the summary, pulls the diff only if something looks off, then tells
   you to merge and continue.

Do not merge to `main` on your own initiative.

### Agent A — Records (INV-15 → 23) — fully self-contained, no cross-agent dependency

| Slice | Tickets | Pts | Notes |
|---|---|---|---|
| A1 | INV-15, INV-17, INV-18 | 9 | Blocked only by Foundation — the true starting set |
| A2 | INV-16, INV-19 | 8 | Detail pages, unlocked by A1 |
| A3 | INV-20, INV-21, INV-22 | 9 | INV-21 is lifecycle-stage — D4 made real. Summarize it carefully |
| A4 | INV-23 | 3 | SHOULD — last, per the cut order |

### Agent B — Pipeline (INV-24 → 32) — a long sequential chain; **Agent C depends on it**

| Slice | Tickets | Pts | Notes |
|---|---|---|---|
| B1 | INV-24, INV-25 | 5 | Seed pipeline + deal list |
| B2 | INV-26, INV-27 | 8 | Deal detail + create/edit. **Unlocks Agent C's INV-36** |
| B3 | INV-28, INV-29, INV-30 | 13 | StageEvent, kanban, stage-gate enforcement — the pipeline-literacy core. **Unlocks Agent C's INV-38** |
| B4 | INV-31, INV-32 | 5 | SHOULD + stale indicator. **Unlocks Agent C's INV-37 and INV-41** |

**Agent B is the critical path.** When B merges a slice, Agent C's next slice unblocks —
so B's checkpoints get reviewed first.

### Agent C — Activity & Dashboard (INV-33 → 41) — two-phase, gated on Agent B

| Slice | Tickets | Pts | Gated on |
|---|---|---|---|
| C1 | INV-33, INV-34, INV-35 | 11 | Foundation only — start immediately |
| C2 | INV-36 | 3 | **B2 merged** (needs INV-26) |
| C3 | INV-38, INV-39, INV-40 | 11 | **B3 merged** (needs INV-28) |
| C4 | INV-37, INV-41 | 8 | **B4 merged** (needs INV-32); INV-41 is SHOULD |

**Agent C is given C1 only at kickoff.** C2–C4 are handed over by Shashwat as Agent B's
corresponding slices actually merge. Agent C must not start a gated slice early — the
failure mode is it reaching into `app/deals/**` to get at data whose route doesn't exist yet.

### INV-36 — scope clarification (confirmed by Shashwat, 9 Sep)

INV-36's ticket text says "inline edit on the deal page and on board cards". The deal page
and the board are **Agent B's files**, and INV-26 / INV-29 already carry equivalent inline
editing in their own acceptance criteria — redundant scope written by an earlier pass, not a
real need for Agent C to reach into Agent B's directories.

**INV-36 for Agent C is: consume the `next_action` / `next_action_due` fields — built by
Agent B in INV-26 — into the "My work today" queue.** A pure read through the shared Prisma
client, per §9. Agent C does not write to `app/deals/**` for this ticket; the inline edit on
the deal page stays Agent B's, delivered under INV-26.

---

## 13. Linear discipline

- **Agents never write to Linear.** Not status, not comments, not sub-issues.
- Every checkpoint ends with the **Linear actions** section required by §12 — plain
  language, ticket by ticket, telling Shashwat exactly what to move where. Narration only;
  even if a Linear MCP tool is reachable, the agent does not use it to make the change.
- Ticket numbers appear in commit messages (`INV-26: deal create/edit form`) so the trail is
  readable, and that is the only place an agent refers to a ticket outside its summaries.
- Read the ticket's Acceptance criteria before starting it and quote them back in your
  end-of-slice summary. That summary is what the review is made of.

---

## 14. Working style

- Direct and specific. If a ticket is underspecified, say exactly what's missing rather than
  guessing and building the wrong thing.
- No optimistic framing in summaries. "Built, but the stage-gate check isn't wired for the
  Won/Lost transition yet" is worth ten "successfully implemented"s.
- Don't over-ask. Inside your own directories, on a ticket you've been given, make the call
  and note it in the summary. The stopping points are the ones this file names: shared files,
  the schema, dependencies, merges, and cross-agent boundaries.
