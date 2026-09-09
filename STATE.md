# STATE — Read this first

**Project:** Invictus CRM (Verena self-launch)
**Last updated:** 9 September 2026, 13:45 IST
**Phase:** Planning complete. Linear board built. Reuse research closed. **No code written yet.**

> **Clock:** the assignment was set on 9 Sep IST. 48 hours puts the deadline somewhere on **10–11 Sep**; the exact start hour is unconfirmed, so assume the earlier end of that range. Roughly **36–40 hours remain**, of which perhaps 25–30 are workable after sleep.
>
> Everything planning-side is finished. The next block should produce code, not another document.

---

## 1. How to use the docs in this project

| Doc | What it's for | Status |
|---|---|---|
| **`docs/STATE.md`** (this file) | Orientation. Current state, decisions, what's next. | **Current — start here** |
| `docs/CRM_BUILD_PLAN.md` | The execution spec: MVP scope, pipeline design, data model, agent split, 48h schedule, Linear structure | **Current — the working spec** |
| `docs/RESEARCH_DISCOVERY_REPORT.md` | Background research on Invictus, Verena, Counsel, CRM architecture patterns | Current as research. §15 and §20 superseded — see §8 below |
| `docs/PROJECT_MANDATE_AND_PLAN.md` | Earlier mandate draft | **Largely superseded** — see §8 |
| `handoff/*.md` (5 files) | Brief given to the separate CRM reuse research project | Closed — findings in §11 |

Also on disk in the session workspace: `linear_issues.csv` (the 41 issues; already created in Linear, kept as a backup).

---

## 2. The assignment

Shashwat is a candidate for **Operations Associate (GTM & AI Agent Operations)** at Invictus AI. He is shortlisted and past the recruiter screen.

**The interviewer is Nirbhay Bakshi**, VP of Operations at Invictus AI, whose stated focus is AI agents for legal workflows (invictus.ai/about). He conducted the round on 9 Sep 2026 and set this assignment during it.

`INFERENCE` That identity sharpens what the submission is read against. He is not a hiring manager scanning for keywords — he runs operations at a company whose thesis is that agents do the routine work and people direct them. He will look at whether the board reflects a real operating cadence and whether the human approval gates are genuine, and he will know immediately if they are decorative.

In that round he asked whether Shashwat had used a CRM or Linear. Shashwat said no. Bakshi said he can't afford to teach Linear because it takes too long. Shashwat said he thrives on high ownership and ambiguity. **Bakshi then set this assignment.**

**The brief, as relayed:** build a CRM for Verena's self-launch, create the plan, and ticket the project completely in Linear. Deadline **48 hours** from the 9 Sep round. Shashwat asked whether he should first evaluate build-vs-buy; Bakshi said he could think about it, but to build it.

**No channel exists to ask Invictus questions.** Work from public sources and state assumptions explicitly.

### What is actually being tested

The interviewer handed him the exact two gaps he admitted to. This is a rebuttal test, which sets the weighting:

- **The Linear workspace is the primary deliverable.** It will be opened first, and *how* Linear is used matters more than CRM sophistication.
- **The CRM demonstrates category literacy** — correct objects, correct vocabulary, a designed pipeline.
- **Ownership in ambiguity** shows up as stated assumptions and defended scope cuts.

---

## 3. Where things stand

**Done**
- Research pass on Invictus AI, Verena, Invictus Counsel (public sources only)
- Scope, pipeline design, data model and agent split decided
- Linear workspace fully built — see §6
- Open-source reuse research commissioned, run and closed — see §11

**Not started**
- Any code
- `CLAUDE.md` and the three agent kickoff prompts
- The written submission and screen recording
- The two manual Linear items (initiative, cycles) — see §6

**Immediate next step:** write `CLAUDE.md` plus three agent kickoff prompts (file ownership, shared contract, audit rule per §11.1, and the stop-don't-touch-schema instruction), then start Foundation (INV-5 → INV-14).

### Honest read on where the time has gone

Planning is not just done, it is **over-done**. Four planning documents, a 41-issue board, and a commissioned research project exist; zero lines of code exist. Every one of those artifacts is defensible on its own and the board genuinely is the primary deliverable — but the marginal value of more planning is now negative, and a submission with a beautiful board and a half-built app is weaker than one with a good board and a working app.

**Rule for the remainder: no new planning documents.** Update this file when state changes; write nothing else that is not code, the agent prompts, or the final written submission. If a future session is asked for another framework, register, or analysis, the right answer is to point at this section and ask whether it beats writing code with the same hour.

---

## 4. Locked decisions

| # | Decision | Why |
|---|---|---|
| D1 | **Build custom**, do not configure HubSpot | Interviewer said build. Settled — do not reopen. |
| D2 | Next.js 15 + TypeScript + Tailwind + shadcn/ui + Supabase Postgres + Prisma, deployed on Vercel | Fastest well-trodden path for Claude Code |
| D3 | **One pipeline**, both sources | Brief asks for one chain from first scan to signed engagement. Outbound enters at Scanned; inbound self-serve enters at Engaged with `source = inbound_signup` |
| D4 | **Lifecycle stage as a field** on Company and Contact — no separate Lead object | HubSpot's model, not Salesforce's. Avoids duplicate identity and split history at conversion |
| D5 | Three parallel Claude Code agents split **by feature, not by layer** | Feature-owned agents touch different tables, routes and pages. Layer splits collide on the schema |
| D6 | **Schema frozen before the fork.** Only Shashwat unfreezes it | The single highest-risk collision in parallel agent work |
| D7 | Counsel matters, documents and conflicts **out of scope**, stated as a deliberate decision with reasoning | See §5 |
| D8 | Prototype/build is optional beyond the MUST scope; **plan + board come first** | The brief asked for a CRM, a plan and tickets |

---

## 5. The Counsel boundary — the strongest reasoning in the submission

`INFERENCE` Invictus Counsel is described as an **affiliated** law firm of Invictus AI Corporation, not a division. That is the standard structure where non-lawyer ownership and fee-sharing are prohibited (ABA Model Rule 5.4 and state analogues; Arizona ABS and the Utah sandbox are the exceptions).

If that reading holds: client data belongs to the firm, some is privileged, conflicts checking is a firm function with legal consequences, and pooling it into a commercial CRM is a problem rather than a feature.

**So the most natural-sounding feature — one unified account view across Verena and Counsel — is the one deliberately not built.** The hook left open: `Relationship`/source typing means a Counsel relationship can be added later without reshaping the schema.

`OPEN QUESTION` Counsel's jurisdiction, and whether it is an Arizona ABS. If it is, this constraint relaxes substantially. Not answerable from public sources.

Worth a paragraph in the written submission. Knowing what to exclude and defending it is the kind of judgment a selection exercise tests.

---

## 6. What exists in Linear

**Workspace:** https://linear.app/invictus-ai12345 · **Team:** `Invictus Ai` (key `INV`)

**41 issues, INV-5 through INV-45**, across six projects. Every issue carries Context / Objective / Scope / Acceptance criteria / Dependencies / Validation. **40 blocking relations** set, so execution order reads off the dependency graph.

| Project | Issues | Owner |
|---|---|---|
| 1 · Foundation and Data Model | INV-5 → INV-14 | Human · Shashwat, solo, pre-fork |
| 2 · Records — Companies and Contacts | INV-15 → INV-23 | Agent A · Records |
| 3 · Pipeline and Deals | INV-24 → INV-32 | Agent B · Pipeline |
| 4 · Activity, Tasks and Timeline | INV-33 → INV-37 | Agent C · Activity |
| 5 · Funnel Dashboard | INV-38 → INV-41 | Agent C · Activity |
| 6 · Outbound Scan Ingestion | INV-42 → INV-45 | Agent A, stretch |

**Labels** are exclusive groups, not a flat list:
- **Owner** — Agent A · Records / Agent B · Pipeline / Agent C · Activity / Human · Shashwat
- **Execution** — AI-executed / Human-reviewed *(the latter on anything touching schema, auth, audit, deletion or outbound content — 7 issues)*
- **Scope** — Must (32) / Should (5) / Stretch (4)
- Plus `Feature` and `Chore`

Estimates in Fibonacci points. Linear's four default onboarding issues (INV-1→4) are cancelled.

**Still manual — the API can't do these:**
1. Create the initiative `Verena Self-Launch CRM` and attach all six projects
2. Enable cycles, set length to **1 day**, name them `Day 1 — Foundation & Core` and `Day 2 — Funnel & Polish`

**Discipline for the rest of the build:** move issues to In Progress and Done *as work actually happens*. Timestamps are visible; a board completed in one burst at the end reads as retrofitted.

---

## 7. Assumptions in force

State these at the top of the submission. A1 is the one that would invalidate real work.

| # | Assumption | If wrong |
|---|---|---|
| A1 | "Verena self launch" means the internal CRM Invictus uses to run Verena's go-to-market launch, covering inbound signups and outbound-generated prospects | Fundamental. Mitigated by designing one pipeline that serves both readings |
| A2 | Single-tenant, internal, small team (~5 users) | Needs real permissions, territories, assignment rules |
| A3 | Verena tiers are Starter $99 / Professional $299 / Enterprise $999 per month | Verified on verena.ai |
| A4 | Signed engagement is the funnel terminus; for the Verena launch that means a paid subscription | Field named to allow a Counsel engagement later |
| A5 | No existing CRM to migrate from | Adds a workstream; doesn't change the model |
| A6 | ICP is SMB/mid-market with public digital properties (ADA, GDPR, CCPA named; no SOC 2 or HIPAA) | Enterprise ICP means longer cycles and a different product |

---

## 8. Superseded material — don't act on these

**In `PROJECT_MANDATE_AND_PLAN.md`:**
- The "configure HubSpot rather than build" recommendation — **withdrawn**, D1 overrides
- The "self-serve funnel with a human triage layer, no real pipeline" framing — **withdrawn**. The JD names *meetings booked* as a success metric, so there is a pipeline
- The ambiguity about what the project is for — **resolved**, see §2

**In `RESEARCH_DISCOVERY_REPORT.md`:**
- §15 Linear strategy (one initiative, two projects, don't build the backlog) — **withdrawn**, the interviewer asked for complete ticketing
- §20 Recommended next step — superseded by §3 here
- §17 item 1 ("don't build the CRM yet") — superseded by D1

Everything else in the research report — company facts, Verena and Counsel detail, CRM architecture patterns, the Counsel boundary reasoning, UX principles, MVP discipline — still stands.

---

## 9. How Shashwat wants to be worked with on this

- **Direct assessments, no optimistic framing.** He pushes back hard and expects the same in return.
- **Evidence over generality.** He weights his own and his friends' direct hands-on experience above research-based caution — and correctly so when the evidence is real.
- **Don't over-ask.** He calls out excessive permission-seeking. Make the call, state it, move.
- **Honest claim language is non-negotiable.** Gaps stay named, never softened. The submission should open with *"I hadn't used Linear or built a CRM before this assignment"* — the interviewer already knows, and the work then speaks for itself.
- He is on a hard clock. Prefer doing the thing over writing another plan about the thing.

---

## 10. Corrections already made — don't repeat them

Recorded so a fresh session doesn't rediscover these the expensive way.

1. **Over-read "self launch" as "self-serve."** Built a whole "it's not really a CRM, it's a triage layer" framing on one ambiguous phrase. It was wrong, and it was reaching for non-obviousness over correctness. "Self launch" most likely just means Verena's launch.
2. **Treated the JD as the assignment.** The JD says what the company values; the task is what the interviewer asked for. Use the JD for context, not as the spec.
3. **Kept arguing build-vs-buy after it was settled.** He asked the interviewer directly and got an answer. Once a decision is made, it's made.
4. **Objected to the parallel-agents idea on general caution.** His friend had actually run parallel Claude Code sessions on one codebase with good output in one to two hours. Direct evidence beats general caution. The one refinement that survived: split by feature, not by layer.

---

## 11. Reuse research — closed, 9 Sep

A separate research project investigated whether open-source reuse could materially reduce the build effort. **It is closed. Its recommendation changes nothing about the plan**, which is the point.

**Recommendation:** build from scratch on the D2 stack, composed from permissively-licensed components — TanStack Table v8, dnd-kit, nuqs, shadcn's Recharts chart block, papaparse, `@faker-js/faker`. Marmelab's **Atomic CRM (MIT)** as a schema and pattern reference, not a foundation. Reject platform adoption (Twenty: 20–30h to first meaningful change, AGPL-3.0, needs NestJS + Redis + a worker, not Vercel-deployable). Reject forking.

**The finding worth using in the written submission:** neither Twenty nor Atomic CRM implements **stage entry criteria** — verified in source. Twenty's `stage` is a metadata SELECT field; Atomic CRM's `onDragEnd` updates the stage unconditionally. Enforced gates are a from-scratch build under every strategy, which means the parent project's design position — *a stage is a business state, not a dropdown value* — is genuinely differentiated rather than merely opinionated. Say this in the plan.

**Also validated:** D4 (lifecycle-as-field, no separate Lead object) matches both modern codebases. The separate-Lead model survives mainly in the older PHP generation and in Frappe CRM. Neither candidate pre-builds lifecycle-as-field, so it is still ours to implement.

### Three actions taken from it

1. **INV-11 updated** with the audit-logging constraint — see §11.1 below.
2. **Cut order corrected** — see §11.2. The research got this wrong.
3. **NEW-1 decided:** read Atomic CRM's `supabase/schemas/01_tables.sql` and its `activity_log` view as reference; write the Prisma schema and the timeline view independently. Lift nothing verbatim, so no attribution obligation attaches. Worth 20 minutes before freezing the schema (D6).

### 11.1 Audit logging — the trap

`prisma.$use()` middleware was deprecated in Prisma 4.16 and **removed in v6.14.0**. Every pre-2025 tutorial uses it, so an agent working from training data will plausibly emit it and it will not run.

Correct pattern: a **Prisma Client Extension** on `$allOperations`, with `AsyncLocalStorage` carrying the acting user's id. Reference implementation: `prisma/prisma-client-extensions` → `audit-log-context`. Keep audited routes on the Node.js runtime — ALS context can be lost on Edge. This is now written into INV-11 and belongs in `CLAUDE.md` when it is written.

### 11.2 Correction to the research's cut order

The research report says the **funnel dashboard** is the first thing to cut if the schedule slips. **That is wrong and should not be followed.** The funnel dashboard is a MUST and it is the artifact the assignment brief names directly — *"a single dashboard that reads the funnel as one chain from first scan to signed engagement."*

Correct cut order: **exhaust every SHOULD before touching any MUST.** In order — CSV import, company dedupe, stalled-deals widget, lost-reason capture. Then the four Stretch items, which should be cancelled in Linear with a one-line reason rather than left open.

### 11.3 Where the research's value actually was

Its own honest estimate: ~5–10 agent-hours saved (the timeline view pattern, the schema read, the audit correction, avoiding an unnecessary Elasticsearch and workflow-engine detour), plus one avoided catastrophe — the 20–30 hours adopting Twenty would have burned before producing a single Invictus-specific line.

The larger "35–50 hours saved" figure in the report is the saving from *using libraries instead of hand-rolling UI primitives* — which was already the plan. Do not restate that number as a research outcome.

---

## 12. Open items

**Blocking the build**
- `CLAUDE.md` and three agent kickoff prompts — needed before the worktrees fork. The only thing between here and Foundation.

**Two minutes of clicking, do them next time Linear is open**
- Create the initiative `Verena Self-Launch CRM` and attach all six projects
- Enable cycles, set length to 1 day, name them `Day 1 — Foundation & Core` and `Day 2 — Funnel & Polish`
- Assign all 41 issues to yourself so "My Issues" is populated

**Worth 20 minutes, once, before the schema freezes**
- Click around Linear by hand — create an issue, drag one between statuses, build a filtered view. The board is currently ahead of the hands-on familiarity, and the follow-up conversation will test the familiarity, not the artifact. "Claude set it up" is a bad answer to "why did you group the labels?"

**Unconfirmed**
- Exact submission format and channel
- The precise deadline hour. Assignment set 9 Sep IST; assume the earlier end of 10–11 Sep

**Standing discipline**
- Move issues to In Progress / Done as work happens. Timestamps are visible.
- Close the loop on everything before submitting: Done, or Cancelled with a one-line reason. Nothing left ambiguous in Todo.
- Cut order if the schedule slips: all SHOULDs first, then Stretch — never a MUST. See §11.2.
