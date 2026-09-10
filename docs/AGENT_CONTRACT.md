# Agent contract — shared primitives, audit, timeline

What Foundation built and every feature agent consumes. Read this before your
first slice. It documents interfaces only; the rules live in `CLAUDE.md`, the
vocabulary in `CONTEXT.md`.

**Everything below is read-only for feature agents.** If a primitive is missing
something you need, say so — do not edit `components/ui/**`.

---

## 1. Data access

Import the shared client. Never construct your own `PrismaClient`: the audit
extension is attached in `lib/db.ts` and nowhere else, so a second client
writes mutations that produce no `AuditEvent`.

```ts
import { prisma } from "@/lib/db";
```

Reads may cross agent boundaries; writes may not (ADR 0002). Agent B queries
`prisma.company.findMany()` directly rather than calling `/api/companies`.

Prisma fields are **camelCase**; columns are snake_case. `deal.nextActionDue`
in TypeScript is `next_action_due` in Postgres.

## 2. Audit logging — what you must do

Every mutation writes an `AuditEvent` automatically. You do **not** call a
`recordAudit()` helper; the extension on `$allOperations` fires on every
create / update / delete through the shared client. Calling one by hand would
double-log.

Two things are your responsibility in every mutating route:

```ts
export const runtime = "nodejs";   // (1) ALS context is lost on Edge

export async function POST(req: Request) {
  const user = await requireUser();
  return withActor(user.id, async () => {   // (2) records WHO, not just what
    const deal = await prisma.deal.create({ data });
    return Response.json({ data: deal });
  });
}
```

Omit `runtime = "nodejs"` and the row still writes — with a null actor. It
fails silently, which is why it is called out here.

Worked example: [`app/api/me/route.ts`](../app/api/me/route.ts).

### The lazy-promise trap (hit and fixed during Foundation)

Prisma promises are lazy. `prisma.deal.update(...)` builds a `PrismaPromise`; the
query — and the audit extension — runs only when something awaits it. So this
logs a **null actor**, even though it looks correct:

```ts
// WRONG: the PrismaPromise escapes the withActor scope unawaited
await withActor(user.id, () => prisma.deal.update({ where, data }));
```

`withActor` now awaits internally (`run(store, async () => await fn())`), so
both forms work. Prefer the explicit one anyway — it survives someone
"simplifying" the helper later:

```ts
await withActor(user.id, async () => {
  return await prisma.deal.update({ where, data });
});
```

If you ever see an `AuditEvent` with `actorId: null` from a route, this is the
first thing to check.

## 3. API shape

- List endpoints return `{ data, total }`.
- Mutations return `{ data }`.
- Validation failures return **422** with the offending fields. The stage gate
  returns 422 with the list of missing fields — the UI shows them inline, it
  does not silently refuse the drag.
- Validate on the server with zod. The UI is not the enforcement layer.

## 4. Shared UI primitives

All exported from `components/ui/`.

### `<DataTable>` — `data-table.tsx`

Client component, TanStack Table v8, client-side sorting.

| Prop | Type | Notes |
|---|---|---|
| `columns` | `ColumnDef<TData, TValue>[]` | Standard TanStack column defs |
| `data` | `TData[]` | |
| `onRowClick` | `(row: TData) => void` | Optional; usually `router.push` to the detail page |
| `emptyState` | `ReactNode` | Optional; replaces the whole table when `data` is empty |
| `className` | `string` | |

Do not hand-roll a second table (CLAUDE.md §6).

### `<DetailPanel>` / `<DetailField>` — `detail-panel.tsx`

```tsx
<DetailPanel title="Company" actions={<Button size="sm">Edit</Button>}>
  <DetailField label="Domain" value={company.domain} />
  <DetailField label="Lifecycle">
    <LifecycleBadge stage={company.lifecycleStage} />
  </DetailField>
</DetailPanel>
```

`DetailField` takes either `value` (string/number/null) or `children`. A null or
empty value renders a muted em dash so the two-column grid stays aligned.

### Badges — `badges.tsx`

One component per enum, every value with its own colour. Keyed by the Prisma
enum type, so a schema change fails the typecheck here rather than rendering an
unstyled badge.

| Component | Prop |
|---|---|
| `<StageBadge>` | `stage: StageKey`, optional `label` override |
| `<LifecycleBadge>` | `stage: LifecycleStage` |
| `<SourceBadge>` | `source: Source` |
| `<IcpFitBadge>` | `fit: IcpFit` |
| `<PlanTierBadge>` | `tier: PlanTier` — renders the price |
| `<OutcomeBadge>` | `outcome: DealOutcome` |

### Forms — `form.tsx`

`Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`,
`FormMessage` — the standard shadcn form API over react-hook-form + zod.
Hand-written because `shadcn add form` is not resolvable in this project's
`radix-nova` style; the shadcn docs still apply.

`<FormMessage>` renders the field's client-side error, and also accepts
children — so a 422 field error from the server can be surfaced in the same
place.

### `<PageHeader>` — `page-header.tsx`

`title`, optional `description`, optional `actions` (right-hand button slot).

### `<EmptyState>` — `empty-state.tsx`

`icon` (lucide), `title`, optional `description`, optional `action`. Use it for
every empty list rather than writing a bare "No results".

### Loading — `loading.tsx`

`<LoadingTable rows columns />` and `<LoadingPanel />`, for route-level
`loading.tsx` files.

## 5. `<ActivityTimeline>` — `activity-timeline.tsx`

**Implemented by Agent C under INV-34** — it was a Foundation stub so Agents A
and B were never blocked on it. **The signature below is final and must not
change**: Agents A and B render it on their detail pages, so a signature change
breaks two features at once.

```ts
type ActivityTimelineProps = {
  entityType: "company" | "contact" | "deal";
  entityId: string;
  limit?: number;
  className?: string;
};
```

Every detail page renders `<ActivityTimeline entityType={...} entityId={...} />`.

## 6. Shell

The authenticated shell is `app/(nav)/layout.tsx` — sidebar, header, breadcrumb,
and the `requireUser()` gate. **Your routes go inside that group** so they
inherit it:

- Agent A — `app/(nav)/companies/**`, `app/(nav)/contacts/**`
- Agent B — `app/(nav)/deals/**`
- Agent C — `app/(nav)/dashboard/**`, `app/(nav)/tasks/**`, `app/(nav)/activities/**`
- Agent D (Phase 2) — `app/(nav)/review/**`

API routes are unaffected: `app/api/<section>/**` as in CLAUDE.md §7.

Add your section to `NAV_ITEMS` only if a new top-level entry is genuinely
needed — the five that exist cover the MUST scope.
