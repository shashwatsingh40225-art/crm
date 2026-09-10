import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Page not found · Invictus CRM" };

/**
 * Root 404 (INV-51). Catches mistyped URLs and every notFound() call that has
 * no nearer not-found boundary - which today is all of them, including a stale
 * link to a record that no longer exists.
 *
 * Renders in two places: bare under the root layout for an unmatched URL, and
 * inside the (nav) shell for a notFound() from a section page. Hence a div, not
 * <main> (the shell's SidebarInset already is one), and 70svh rather than full
 * height so it centres standalone without overflowing under the shell header.
 * Uses the shared EmptyState rather than inventing its own look.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-[70svh] items-center justify-center p-6">
      <EmptyState
        className="w-full max-w-md"
        icon={FileQuestion}
        title="We couldn't find that page"
        description="The link may be out of date, or the record may have been archived."
        action={
          <Button asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        }
      />
    </div>
  );
}
