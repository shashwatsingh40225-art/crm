"use client";

import { useState } from "react";
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
  high: "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200",
  medium: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
};

const ICP_FIT_OPTIONS: { value: IcpFit; label: string }[] = [
  { value: "strong", label: "Strong fit" },
  { value: "moderate", label: "Moderate fit" },
  { value: "weak", label: "Weak fit" },
  { value: "none", label: "Not a fit" },
];

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
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="grid gap-1">
          <CardTitle>{row.companyName}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {row.domain ?? "No domain on file"} · {row.pendingCount}{" "}
            {row.pendingCount === 1 ? "finding" : "findings"} · arrived{" "}
            {formatDistanceToNowStrict(row.arrivedAt, { addSuffix: true })}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge
            className={cn(
              "border-transparent font-medium",
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
            <div key={finding.id} className="grid gap-1 rounded-lg bg-muted/40 p-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">{finding.framework}</span>
                <Badge
                  className={cn(
                    "border-transparent font-medium",
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
          onClick={() => {
            setError(null);
            setRejectOpen(true);
          }}
        >
          Reject
        </Button>
        <Button
          size="sm"
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
