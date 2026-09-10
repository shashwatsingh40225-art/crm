import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardMetrics } from "./query";

export const runtime = "nodejs";

const querySchema = z.object({
  period: z.enum(["7d", "30d", "all"]).default("30d"),
});

/** INV-40. GET /api/dashboard/metrics?period=7d|30d|all */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const data = await getDashboardMetrics(parsed.data.period);
  return Response.json({ data });
}
