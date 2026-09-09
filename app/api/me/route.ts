import { z } from "zod";
import { prisma } from "@/lib/db";
import { withActor } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";

/**
 * WORKED EXAMPLE (INV-11). Copy this shape for every mutating route.
 *
 * Four things matter here and all four are load-bearing:
 *
 *  1. `runtime = "nodejs"`. The audit extension carries the actor through
 *     AsyncLocalStorage, and ALS context is lost on Edge. An audited route on
 *     Edge still writes the row - with a null actor - so this fails silently.
 *  2. Validate on the server with zod. The UI is not the enforcement layer
 *     (CLAUDE.md section 6).
 *  3. Wrap the mutation in `withActor(user.id, ...)`. Without it the
 *     AuditEvent records what changed but not who changed it.
 *  4. Return `{ data }` - and `{ data, total }` from list endpoints.
 *
 * There is no explicit recordAudit() call: the extension in lib/audit.ts fires
 * on every create/update/delete through the shared client. Writing one by hand
 * would double-log.
 */

export const runtime = "nodejs";

const patchSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  return Response.json({ data: user });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      {
        error: "Validation failed",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  const updated = await withActor(user.id, () =>
    prisma.user.update({
      where: { id: user.id },
      data: { name: parsed.data.name },
    }),
  );

  return Response.json({ data: updated });
}
