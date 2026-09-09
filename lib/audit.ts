import { AsyncLocalStorage } from "node:async_hooks";
import { Prisma } from "@prisma/client";

/**
 * Audit logging (INV-11 / CLAUDE.md section 5).
 *
 * ── The trap ───────────────────────────────────────────────────────────────
 * Do NOT rewrite this with `prisma.$use()`. That middleware API was deprecated
 * in Prisma 4.16 and REMOVED in 6.14.0. Most pre-2025 audit-logging tutorials
 * use it, so it is the thing a model reaches for from memory. It does not
 * throw - it simply never runs, and every mutation looks audited while
 * writing nothing.
 *
 * The current pattern is a Prisma Client Extension on `$allOperations`, which
 * is what this file implements. Reference: prisma/prisma-client-extensions ->
 * audit-log-context.
 *
 * ── Runtime constraint ─────────────────────────────────────────────────────
 * AsyncLocalStorage context is lost on the Edge runtime. Any route that
 * mutates must declare `export const runtime = "nodejs"`, or the write
 * succeeds and the AuditEvent records a null actor.
 *
 * ── Ownership ──────────────────────────────────────────────────────────────
 * Foundation owns this file. Feature agents import it and never modify it.
 */

export type AuditActor = { userId: string | null };

const auditContext = new AsyncLocalStorage<AuditActor>();

/**
 * Runs `fn` with the acting user attached, so every mutation inside it records
 * who did it. Wrap the body of each mutating route handler / server action:
 *
 *   export const runtime = "nodejs";
 *
 *   export async function POST(req: Request) {
 *     const user = await requireUser();
 *     return withActor(user.id, async () => {
 *       const company = await prisma.company.create({ data });
 *       return Response.json({ data: company });
 *     });
 *   }
 */
export function withActor<T>(userId: string | null, fn: () => Promise<T>) {
  return auditContext.run({ userId }, fn);
}

/** The acting user id, or null outside a withActor() scope (seed, scripts). */
export function getActorId(): string | null {
  return auditContext.getStore()?.userId ?? null;
}

/** Models whose writes are audited. AuditEvent itself must never be audited. */
const AUDITED_MODELS = new Set([
  "Company",
  "Contact",
  "Deal",
  "Pipeline",
  "Stage",
  "StageEvent",
  "Activity",
  "Task",
  "Finding",
  "User",
]);

const CREATE_OPS = new Set(["create", "createMany", "createManyAndReturn"]);
const UPDATE_OPS = new Set([
  "update",
  "updateMany",
  "updateManyAndReturn",
  "upsert",
]);
const DELETE_OPS = new Set(["delete", "deleteMany"]);

function actionFor(operation: string): "create" | "update" | "delete" | null {
  if (CREATE_OPS.has(operation)) return "create";
  if (UPDATE_OPS.has(operation)) return "update";
  if (DELETE_OPS.has(operation)) return "delete";
  return null;
}

/**
 * Fields never copied into before/after. Nothing here is secret today, but the
 * cost of the list is zero and the cost of finding a token in an append-only
 * audit table later is not.
 */
const REDACTED = new Set(["password", "token", "secret", "accessToken"]);

function scrub(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "object") return value as Prisma.InputJsonValue;

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (REDACTED.has(k)) {
      out[k] = "[redacted]";
    } else if (v instanceof Date) {
      out[k] = v.toISOString();
    } else if (typeof v === "object" && v !== null) {
      // Decimal, nested relations, JSON columns - stringify rather than
      // recursing, so a deep include cannot blow up the audit row.
      out[k] = JSON.parse(JSON.stringify(v));
    } else {
      out[k] = v;
    }
  }
  return out as Prisma.InputJsonValue;
}

function idOf(result: unknown): string {
  if (result && typeof result === "object" && "id" in result) {
    return String((result as { id: unknown }).id);
  }
  return "(bulk)";
}

/**
 * The extension. Attached once, in lib/db.ts, to the single shared client.
 *
 * Audit rows are written through `client.auditEvent`, which is the *unextended*
 * client for that model - so writing the log does not recurse back through
 * this same handler.
 *
 * A failure to write the audit row is swallowed and logged rather than thrown:
 * losing an audit row is bad, but failing the user's mutation because the log
 * write failed is worse, and the two are not in a transaction anyway.
 */
export const withAudit = Prisma.defineExtension((client) =>
  client.$extends({
    name: "audit-log-context",
    query: {
      $allOperations: async ({ model, operation, args, query }) => {
        const action = model ? actionFor(operation) : null;

        if (!model || !action || !AUDITED_MODELS.has(model)) {
          return query(args);
        }

        // Snapshot the prior state for single-row updates and deletes, so the
        // AuditEvent carries a real diff rather than only the new values.
        let before: Prisma.InputJsonValue | undefined;
        const where = (args as { where?: Record<string, unknown> })?.where;

        if (action !== "create" && where) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const delegate = (client as any)[
              model.charAt(0).toLowerCase() + model.slice(1)
            ];
            const prior = await delegate?.findFirst?.({ where });
            before = scrub(prior);
          } catch {
            // Best effort. A missing before-image must not fail the mutation.
          }
        }

        const result = await query(args);

        try {
          await client.auditEvent.create({
            data: {
              entityType: model,
              entityId: idOf(result),
              action,
              actorId: getActorId(),
              before,
              after: action === "delete" ? undefined : scrub(result),
            },
          });
        } catch (error) {
          console.error("[audit] failed to record AuditEvent", {
            model,
            operation,
            error,
          });
        }

        return result;
      },
    },
  }),
);
