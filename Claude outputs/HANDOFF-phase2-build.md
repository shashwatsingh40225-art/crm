# Handoff — Invictus CRM, Phase 2 build

**For:** a fresh chat in the claude.ai Project "invictus crm"
**Written:** 10 September 2026, ~17:30 IST
**Your job in that chat:** guide Shashwat through running the Phase 2 build — assembling the kickoff prompts, then running the checkpoint loop across four Claude Code sessions.

---

## 1. Where things stand, exactly

Phase 1 is complete, deployed, and closed out on the board. Phase 2 is **fully ticketed and not started**. No Claude Code session has been opened for it. No prompt has been pasted anywhere yet.

The immediate sequence, in his words: he opens the new chat with this handoff → you help him assemble the first prompt → he starts the Claude Code sessions.

**The deadline is roughly 24 hours from midday 10 Sep IST**, and it covers the build and the board only. The 2-page write-up happens after, separately — he was explicit about that. Do not let it pull focus during the build, and do not re-litigate it.

The 5–7 minute screen recording is **not** part of the submission. Any doc still listing it (`docs/CRM_BUILD_PLAN.md` Part 8, `docs/STATE.md`) is stale on that point.

---

## 2. Read these, in this order

| Doc | Why |
|---|---|
| `handoff/PHASE2_KICKOFF_PROMPTS.md` (Project) | **Written this session. The operational document.** All four prompts, run order, session/mode table, the operating loop. This is what you work from. |
| `CLAUDE.md` (repo root) | The agents' contract. **Note: still describes three agents.** Foundation's first task is to update it — see §4 below. |
| `docs/STATE.md` (Project) | Phase 1 orientation, locked decisions D1–D11, assumptions A1–A6, the Counsel boundary. Stale on: the recording, the worktree question, and it predates all of Phase 2. |
| Linear INV-48 → INV-63 | The 16 Phase 2 tickets, each with full Context / Objective / Scope / Acceptance criteria / Dependencies / Validation. Reasoning lives in the tickets, not restated here. |
| The five project status updates on Linear projects 1–5 | Written this session. They carry most of the write-up's substance. |

**Repo:** `C:\Users\first\Desktop\CRM` on device `msi`, connected to the session. `github.com/shashwatsingh40225-art/crm`, all on `main`, auto-deploys to Vercel. Live at `https://invictus-crm.vercel.app`.

Credentials (demo login, connection strings) live in the repo and in Foundation's checkpoint output. Never restate them anywhere.

---

## 3. The first thing you will actually be asked to do

The four prompts in `handoff/PHASE2_KICKOFF_PROMPTS.md` contain `[paste the ticket text]` placeholders. **You fill those in** by pulling the ticket from Linear via the Linear MCP (`get_issue`) and handing him the complete, assembled prompt ready to paste.

This worked well in Phase 1 and saved him a lot of copy-paste. Linear is not authorized inside the Claude Code sessions and there is no `linear_issues.csv` on the machine, so the chat is the only path.

**Give him one prompt at a time, when he asks for it.** He objected in a previous session when four kickoff prompts were proactively updated and re-sent after he asked for one. Deliver the current thing.

First one he needs: `foundation`, with INV-48's text inlined.

---

## 4. What must be true before any agent forks

Two hard gates. Both are in the Foundation prompt already, but you are the backstop:

1. **`CLAUDE.md` must be updated first.** It currently describes three agents and knows nothing about Agent D, the new two-sided Linear protocol, or the Phase 2 slice tables. Foundation's Task 1 does this. An agent forked against the old contract will not know its own boundaries.

2. **INV-48 must be on `main` before anything forks.** It is the single schema unfreeze window (`archivedAt` ×3, `Finding.reviewStatus`). Four of the sixteen tickets need those fields. After it lands, the schema is frozen again for the rest of Phase 2 — same D6 rule, same escalation path.

Foundation then continues with INV-49/50/51 **in parallel** with the four agents. Two cautions live in its follow-on message: INV-49 changes env vars the running agents depend on (warn before applying), and INV-50 touches `components/ui/`, which all four import.

---

## 5. The Linear protocol — the thing that must not regress

This is the substance of what changed this phase, and it is the part he most wants to get right, because the interviewer specifically asked for someone who can work in Linear.

**What went wrong in Phase 1**, from the board's own timestamps: 21 of 38 completed tickets went straight Todo → Done with no In Progress state, and status changes arrived in bursts — INV-16/17/18/19 within 8 seconds, INV-24/25 within 0.2 seconds, and eleven tickets inside 37 seconds on the morning of 10 Sep. That last burst is where INV-15, a Must with completed work, got cancelled by mistake.

**The cause was the protocol, not him.** Agents emitted "Linear actions" only at the end of a multi-ticket slice, so the moves arrived batched and he executed them batched. He followed the instructions he was given, faithfully.

**Phase 2 protocol, now in every prompt:**

1. Agent opens a slice with a `Linear: starting` line → he moves those tickets to In Progress **before** it writes code
2. Agent ends with the usual `Linear actions` section
3. He moves **one ticket at a time as each is verified** — never a checkpoint's worth in one pass
4. **Every move to Done carries a comment** naming what verified it (Phase 1 has zero comments across 38 tickets)
5. Agents still never touch Linear themselves

If you find yourself handing him four Linear moves at once, you have reproduced the Phase 1 failure. Pace them.

---

## 6. Facts verified this session — don't re-derive these

- **The Phase 1 schema freeze held.** One migration (`20260909123923_init`); `prisma/schema.prisma` untouched since 9 Sep 17:31, before the fork. Three agents, two days, zero schema edits. Strong write-up material.
- **INV-15's search/filter/sort exists**, but entirely client-side in `app/(nav)/companies/companies-table.tsx`, and `page.tsx` fetches every company plus a per-row N+1 (`deal.count` + `activity.findFirst`) that the code itself flags for revisit. INV-52 was rewritten to reflect this — it is a **replacement**, not an addition, and it must kill the N+1. An agent given the original wording would have shipped two filter systems.
- **Linear's MCP has no cycle write.** Cycle renames and deletions are manual, in the UI.

---

## 7. Board cleanup done this session

- INV-15 and INV-47 restored from an erroneous Cancel, each with a comment naming the mistake. The cancel was deliberately left visible in history.
- Projects 1–5 set to Completed, each with a substantive status update.
- An initiative update on `Verena Self-Launch CRM` covering Phase 1, the worktree failure, and the protocol change.
- INV-46 given a real cancel reason.
- Label `Agent D · Intake` created under the Owner group; Agent A and B label descriptions corrected to the `(nav)` paths.

**Still outstanding, and only he can do them:**
- Delete **Cycle 3** (22–29 Sep) — Team Settings → Cycles
- Rename **Cycle 1** — it renders as `` `Day 1 — Foundation & Core` . `` with literal backticks and a trailing period

He has already renamed Cycle 2.

---

## 8. Decisions settled this session — do not reopen

Reached through a `grill-with-docs` interview. All of these are his calls, made deliberately.

- **Phase 2 is inside the submission.** He ships the improved version, not the Phase 1 build.
- **Project 6 reopened** as Project 8 (Intake and Human Review) — INV-42/43/44's scope returns as INV-60/61/63; outreach drafting (old INV-45) stays cut. Rationale: the human approval gate on machine output is the only feature specifically shaped by how Invictus works.
- **Multi-user hardening is its own project** (7 · Team Readiness). The independent analysis he was given optimised for single-user findability and did not address the goal he stated.
- **Roles and permissions remain NOT NOW**, deliberately, and this is recorded in Project 7's description.
- **One unfreeze window** for the schema, not a permanent lift.
- **Four agents, not three.** Flipped from three once the write-up moved outside the build window. Agent D owns only new paths.
- **Soft delete via `archivedAt`**, not hard delete. ADR 0003, written by Foundation.
- **No command palette, no reports page.** Both cut with reasons recorded in Project 9's description.

---

## 9. How he wants to be worked with

- **Direct assessments, no optimistic framing.** He pushes back hard and expects the same.
- **Do only what was asked.** One prompt when he asks for one prompt.
- **Correct yourself out loud when you're wrong.** This session made two factual errors — a claim that no ticket was ever moved to In Progress, and two wrong counts in an initiative update. Both were corrected explicitly, and that mattered more than being right first time.
- **Verify facts rather than asserting them.** The device bridge and Linear MCP are both available; use them. Several claims in `STATE.md` turned out to be wrong when checked.
- **Plain language over precision when they conflict.** Translate agent output before advising.
- **Walk him through unfamiliar tooling hands-on**, step by step, corrected in real time against what is actually on his screen.
- **He does not write code and neither do you this phase.** Claude Code builds; you write tickets, prompts and docs.

---

## 10. The operating loop, once agents are running

Notification fires → he pastes the agent's output into chat → you translate it in plain language → you tell him the Linear moves, **paced one at a time** → you give him the commit prompt for `foundation` → you give him the continue prompt for that agent. Nothing polls.

**Review `agent-d-intake` first** when several land together — INV-63 is the only cross-agent gate in the phase.

Watch for these three, which the prompts warn agents about but which are still the likeliest silent failures:

- A null `actorId` on an AuditEvent from a normal route is the **lazy-promise bug** (Prisma promises are lazy; an unawaited return escapes the `withActor` scope), not a data quirk. The two webhooks are the only legitimate null actors.
- An agent asking to write outside its paths should be stopped, not accommodated. The one granted exception is INV-61 creating a Deal.
- A stage-gate regression into a plain SELECT field would remove the build's most differentiated feature.

---

## 11. Suggested skills

- **`grilling`** — he used and liked it this session for scoping. Reach for it if he wants to stress-test a mid-build decision. Do not run it unprompted during the build; it costs time he does not have.
- **`engineering:documentation`** — for the 2-page write-up, *after* the build. Assembly of settled material, not fresh thinking. The five Linear project updates plus `STATE.md` §5/§7 are most of the source text.
- **`humanizer`** — run the write-up through it before submission. A human reads this closely.
- **`domain-modeling`** — only if new vocabulary appears mid-build. Foundation is already adding *Archived*, *Review status* and *Signup* to `CONTEXT.md`.

Do not create new planning documents unprompted. `STATE.md` §3's no-new-docs rule still holds; the repo scaffolding (`CLAUDE.md`, `CONTEXT.md`, the ADRs) is the carve-out, justified in ADR 0001.

---

## 12. Open questions

- **Whether he has the Verena scanner payload shape.** INV-60's Zod schema is my invention — plausible, but nothing confirmed it. If a real shape exists, the ticket should be amended before Agent D starts.
- **Whether four parallel Claude Code sessions are comfortable on his laptop.** Phase 1 ran three in one shared working tree. If four is too much, `agent-d-intake`'s three tickets fold back into Foundation's solo pass — that was the alternative and it is still viable.
- **Exact submission format and channel** remain unconfirmed, as they were in Phase 1.
