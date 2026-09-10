# Invictus CRM — Context

The internal system Invictus uses to run Verena's self-launch go-to-market: capture prospects and self-serve signups, move them through one funnel, record what happened, surface what needs a human today.

## Language

**Company**:
The organization being sold to — either an outbound-scanned ICP prospect or a self-serve signup's employer. The identity anchor for Contacts and Deals.
_Avoid_: Account, Organization, Prospect (as an entity)

**Contact**:
A person at a Company. Carries `lifecycle_stage` as a field, not a status on a separate object.
_Avoid_: Lead, Person

**Lifecycle stage**:
A value on Company/Contact (HubSpot's model), not a separate Lead entity — chosen specifically to avoid the duplicate-identity and split-activity-history problem of Salesforce's Lead→Contact conversion (Decision D4).
_Avoid_: Lead status, conversion

**Deal**:
The single unit of pipeline progress, linked to one Company and one primary Contact. Serves both the outbound-scanned and inbound self-serve motions through one pipeline, distinguished by `source` (Decision D3).
_Avoid_: Opportunity

**Source**:
Field on Deal distinguishing `outbound_scan` from `inbound_signup`. Determines pipeline entry point — Scanned for outbound, Engaged for inbound.

**Signup**:
A self-serve Verena account created by the prospect on their own, with no one at Invictus involved. The start of the inbound motion: a Signup enters the pipeline at Engaged with source `inbound_signup`, skipping Scanned and Contacted (Decision D3).
_Avoid_: Registration, inbound lead (there is no Lead — see Lifecycle stage)

**Stage**:
One of the 7 fixed pipeline steps (Scanned → Qualified → Contacted → Engaged → Evaluating → Proposal → Won/Lost). Each stage has required fields that gate advancing past it — a stage represents a business state, not a dropdown value.
_Avoid_: Status (too generic for the gated concept)

**StageEvent**:
Immutable log entry recording one stage transition (from, to, who, when). Append-only — never edited or deleted.
_Avoid_: History, audit event (AuditEvent is a separate, broader entity covering all writes)

**Activity**:
A logged interaction — call, email, meeting, or note — against a Company, Contact, or Deal.

**Archived**:
A Company, Contact or Deal that has been taken out of the working views but not destroyed — the record, its history and everything linked to it are kept. Archiving is the only way a record is removed from this CRM (ADR 0003).
_Avoid_: Deleted, Removed (nothing is deleted)

**Finding**:
An observation from the outbound scanner about a Company's compliance posture, with a confidence score. The **table** is core and is seeded — the stage-1 gate requires at least one Finding before a prospect can leave `Scanned`. The **scan-ingestion feature** that would create Findings automatically (INV-42 → INV-45) is stretch and was not built; seeded Findings are the only ones that exist.

**Review status**:
A human's verdict on a Finding — `pending` until someone reviews it, then `approved` or `rejected`. Distinct from confidence, which is the scanner's own estimate of the Finding.
_Avoid_: Status (too generic), confidence (that is the scanner's view, not a human's)

**Verena**:
The product being sold. This CRM never stores Verena's compliance findings or agent output as content — only that an event happened (signup, plan change).
_Avoid_: using "Verena" to refer to this CRM itself

**Invictus Counsel**:
The affiliated law firm. Out of scope for this build entirely (Decision D7) — no matters, documents, or conflicts data enters this system, ever.

## Deliberately excluded — named so nobody reintroduces them

- **Lead** as a separate object — see Lifecycle stage above.
- **Relationship** as a typed per-product-line entity — explored in early research for a broader Invictus-wide CRM spanning Verena and Counsel, abandoned when scope narrowed to Verena-only. Do not resurrect without deliberately reopening scope with Shashwat.
- **Matter, Document, ConflictsRecord** — Counsel's domain, never this CRM's.
