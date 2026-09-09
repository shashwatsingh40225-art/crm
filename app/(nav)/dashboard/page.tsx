import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-muted-foreground text-sm">
        Signed in as {user.name} ({user.email}).
      </p>
      <p className="text-muted-foreground text-sm">
        Funnel dashboard is INV-38 to INV-41, owned by Agent C.
      </p>
    </div>
  );
}
