import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getFunnelMetrics } from "./query";

export const runtime = "nodejs";

const querySchema = z.object({
  source: z.enum(["outbound_scan", "inbound_signup", "referral"]).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

/** INV-38. GET /api/dashboard/funnel — see ./query.ts for the metric math. */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    source: url.searchParams.get("source") || undefined,
    from: url.searchParams.get("from") || undefined,
    to: url.searchParams.get("to") || undefined,
  });
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const data = await getFunnelMetrics(parsed.data);
  return Response.json({ data });
}
