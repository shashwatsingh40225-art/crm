"use client";

import { startTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Root error boundary (INV-51). Catches any render error below the root
 * layout that has no nearer error.tsx.
 *
 * Never shows `error.message` or a stack: in production Next already replaces
 * server errors with a digest, and in dev the message can carry query text or
 * ids. The error goes to the browser console for whoever is debugging.
 *
 * Retry calls reset() inside a transition with router.refresh(). reset() alone
 * only re-renders on the client, so a page that threw on the server would
 * re-render the same failed payload; refresh() re-fetches it first.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-svh items-center justify-center p-6 bg-gradient-to-b from-background to-destructive/[0.03]">
      <EmptyState
        className="w-full max-w-md"
        icon={TriangleAlert}
        title="Something went wrong"
        description="This page couldn't be loaded. Try again, or head back to the dashboard."
        action={
          <div className="flex items-center gap-2">
            <Button
              onClick={() =>
                startTransition(() => {
                  router.refresh();
                  reset();
                })
              }
            >
              Try again
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        }
      />
    </main>
  );
}
