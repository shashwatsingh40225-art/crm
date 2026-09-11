"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { toast } from "sonner";
import type { FindingConfidence, IcpFit } from "@prisma/client";
import { ChevronDownIcon, ChevronUpIcon, ExternalLinkIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ReviewQueueRow } from "./queue";

const CONFIDENCE_LABELS: Record<FindingConfidence, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};

const CONFIDENCE_CLASSES: Record<FindingConfidence, string> = {
  high: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  medium: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  low: "bg-slate-50 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300 border-slate-200 dark:border-slate-800",
};

const FRAMEWORK_CLASSES: Record<string, string> = {
  ADA: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border-violet-200 dark:border-violet-800",
  GDPR: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  CCPA: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  HIPAA: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
};

const ICP_FIT_OPTIONS: { value: IcpFit; label: string }[] = [
  { value: "strong", label: "Strong fit" },
  { value: "moderate", label: "Moderate fit" },
  { value: "weak", label: "Weak fit" },
  { value: "none", label: "Not a fit" },
];

/**
 * "Arrived …" is relative to render time, which SSR and the client hydration
 * pass compute at genuinely different wall-clock moments (this is a "use
 * client" component, but Next still renders it on the server for the initial
 * HTML). formatDistanceToNowStrict() reads Date.now() internally, so calling
 * it straight in the render body is the classic Date.now()-in-render
 * hydration mismatch - the two passes can legitimately disagree, most
 * visibly when a slow first paint lets the string cross a rounding boundary
 * (e.g. "59 seconds ago" -> "1 minute ago"). Fix: render a value that's
 * identical on both passes (an ISO timestamp is a pure function of the Date,
 * no clock read involved), then swap to the relative string in an effect,
 * which only runs after hydration has already committed.
 */
function ArrivedLabel({ arrivedAt }: { arrivedAt: Date }) {
  const [label, setLabel] = useState(() => arrivedAt.toISOString());

  useEffect(() => {
    setLabel(formatDistanceToNowStrict(arrivedAt, { addSuffix: true }));
  }, [arrivedAt]);

  return <>{label}</>;
}

export function ReviewQueue({ rows }: { rows: ReviewQueueRow[] }) {
  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <ReviewRow key={row.companyId} row={row} />
      ))}
    </div>
  );
}

function ReviewRow({ row }: { row: ReviewQueueRow }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [icpFit, setIcpFit] = useState<IcpFit>("moderate");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setPending(true);
    setError(null);

    const res = await fetch(`/api/findings/${row.companyId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ icpFit }),
    });

    setPending(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Could not approve this company.");
      return;
    }

    setApproveOpen(false);
    toast.success(`${row.companyName} approved and moved to Scanned.`);
    router.refresh();
  }

  async function handleReject() {
    setPending(true);
    setError(null);

    const res = await fetch(`/api/findings/${row.companyId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });

    setPending(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? body?.fields?.reason?.[0] ?? "Could not reject this company.");
      return;
    }

    setRejectOpen(false);
    toast.success(`${row.companyName} rejected and archived.`);
    router.refresh();
  }

  return (
    <Card className="border-border/60 shadow-sm transition-all hover:border-border/90">
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="grid gap-1">
          <CardTitle className="text-base font-semibold tracking-tight">{row.companyName}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {row.domain ?? "No domain on file"} · {row.pendingCount}{" "}
            {row.pendingCount === 1 ? "finding" : "findings"} · arrived{" "}
            <ArrivedLabel arrivedAt={row.arrivedAt} />
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge
            className={cn(
              "font-medium",
              CONFIDENCE_CLASSES[row.highestConfidence],
            )}
          >
            {CONFIDENCE_LABELS[row.highestConfidence]}
          </Badge>
          <Button size="sm" variant="outline" onClick={() => setExpanded((e) => !e)}>
            {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
            {expanded ? "Hide findings" : "Show findings"}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="grid gap-2 border-t pt-4">
          {row.findings.map((finding) => (
            <div key={finding.id} className="grid gap-1.5 rounded-lg border border-border/50 bg-muted/20 p-3 text-sm">
              <div className="flex items-center gap-2">
                <Badge
                  className={cn(
                    "font-medium",
                    FRAMEWORK_CLASSES[finding.framework] ?? "bg-muted text-muted-foreground",
                  )}
                >
                  {finding.framework}
                </Badge>
                <Badge
                  className={cn(
                    "font-medium",
                    CONFIDENCE_CLASSES[finding.confidence],
                  )}
                >
                  {CONFIDENCE_LABELS[finding.confidence]}
                </Badge>
              </div>
              <p className="text-muted-foreground">{finding.observation}</p>
              {finding.evidenceUrl && (
                <a
                  href={finding.evidenceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-fit items-center gap-1 text-primary underline underline-offset-2"
                >
                  Evidence <ExternalLinkIcon className="size-3.5" />
                </a>
              )}
            </div>
          ))}
        </CardContent>
      )}

      <CardContent className="flex justify-end gap-2 border-t pt-4">
        <Button
          size="sm"
          variant="outline"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive border-border/70"
          onClick={() => {
            setError(null);
            setRejectOpen(true);
          }}
        >
          Reject
        </Button>
        <Button
          size="sm"
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          onClick={() => {
            setError(null);
            setApproveOpen(true);
          }}
        >
          Approve
        </Button>
      </CardContent>

      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve {row.companyName}</DialogTitle>
            <DialogDescription>
              Confirms ICP fit and creates a Deal at Scanned. This is the moment the prospect
              enters the pipeline.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="icp-fit">ICP fit</Label>
            <Select value={icpFit} onValueChange={(v) => setIcpFit(v as IcpFit)}>
              <SelectTrigger id="icp-fit" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ICP_FIT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={pending}>
              {pending ? "Approving…" : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {row.companyName}</DialogTitle>
            <DialogDescription>
              Archives the company and marks every finding rejected. No Deal is created. A
              reason is required.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="reject-reason">Reason</Label>
            <Textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why isn't this prospect worth pursuing?"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={pending || reason.trim().length === 0}
            >
              {pending ? "Rejecting…" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
