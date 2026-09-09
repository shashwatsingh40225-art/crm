import { Handshake } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export const runtime = "nodejs";

/**
 * PLACEHOLDER (INV-9). Agent B replaces this in INV-25.
 * Owned path after the fork: app/(nav)/deals/**
 */
export default function DealsPage() {
  return (
    <>
      <PageHeader
        title="Deals"
        description="One pipeline, seven gated stages, both motions."
      />
      <EmptyState
        icon={Handshake}
        title="Deal list and board not built yet"
        description="INV-25 — Agent B · Pipeline."
      />
    </>
  );
}
