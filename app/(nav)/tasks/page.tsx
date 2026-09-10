import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth";
import { TasksView } from "./tasks-view";

export const runtime = "nodejs";

/** INV-35. Owned path: app/(nav)/tasks/**. */
export default async function TasksPage() {
  const user = await requireUser();

  return (
    <>
      <PageHeader title="Tasks" description="What needs a human today." />
      <TasksView currentUserId={user.id} />
    </>
  );
}
