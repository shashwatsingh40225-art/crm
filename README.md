# Invictus CRM — Verena self-launch

The internal CRM Invictus uses to run Verena's go-to-market launch: capture
outbound-scanned prospects and inbound self-serve signups, move them through one
gated pipeline, record what happened, and surface what needs a human today.

Built as a 48-hour assignment. The Linear board is the primary deliverable; this
repo is the working system behind it.

## What's distinctive

- **A stage is a business state, not a dropdown value.** Advancing a deal
  requires that stage's fields to be present, enforced server-side. Failing the
  gate returns a 422 naming the missing fields, which the UI shows inline — it
  does not silently refuse the drag. Neither Twenty nor Atomic CRM does this.
- **One pipeline serves both motions.** Outbound prospects enter at `Scanned`;
  inbound signups enter at `Engaged` with `source = inbound_signup`.
- **Lifecycle stage is a field on Company and Contact — there is no Lead
  object.** HubSpot's model rather than Salesforce's, which avoids duplicate
  identity and split activity history at conversion.
- **Every mutation writes an AuditEvent**, via a Prisma Client Extension on
  `$allOperations` with `AsyncLocalStorage` carrying the acting user.
- **StageEvent is append-only.** A correction is a new transition, never an
  edited history.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Supabase
Postgres · Prisma 6 · deployed on Vercel.

## Running it locally

```bash
npm install
cp .env.example .env    # fill in Supabase connection strings and API keys
npm run db:deploy       # apply migrations
npm run seed
npm run dev
```

`.env.example` documents where each value comes from and why `DATABASE_URL`
(pooled, port 6543) and `DIRECT_URL` (direct, port 5432) differ — migrations
cannot run through pgbouncer, and Vercel is IPv4-only while the direct Supabase
host resolves IPv6-only.

Seed credentials are supplied with the submission rather than committed here.

| Script | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run seed` | Wipe and reseed: 3 users, 8 companies, 11 contacts, 11 deals, 7 stages, activities, tasks |
| `npm run db:migrate` | `prisma migrate dev` — local schema changes |
| `npm run db:deploy` | `prisma migrate deploy` — apply existing migrations |
| `npm run db:studio` | Prisma Studio |

## Documentation

| File | What it covers |
|---|---|
| `STATE.md` | **Start here.** Current state, locked decisions, assumptions, what's next |
| `CLAUDE.md` | The build contract: frozen data model, pipeline gates, audit rules, file ownership |
| `CONTEXT.md` | Vocabulary — what a Company, Deal, Stage, StageEvent, Finding mean here |
| `docs/AGENT_CONTRACT.md` | Shared interfaces: Prisma client, audit helpers, UI primitives, `<ActivityTimeline>` |
| `docs/adr/` | Decisions that would be expensive to reverse |

## Deliberately out of scope

Invictus Counsel — matters, documents, conflicts checking — is excluded by
decision, not omission. Counsel is an *affiliated* law firm; client data belongs
to the firm, some of it is privileged, and pooling it into a commercial CRM is a
problem rather than a feature. The reasoning is in `CLAUDE.md` D7 and `STATE.md`
§5.
