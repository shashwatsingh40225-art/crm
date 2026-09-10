"use client";

import { useState } from "react";
import Link from "next/link";
import { PlanTier } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ContactOption, OwnerOption } from "./deal-form";
import {
  postStageTransition,
  type StageTransitionFields,
  type StageTransitionResult,
} from "./stage-transition";
import { LOST_REASON_CATEGORIES, formatLostReason } from "@/app/api/deals/gates";

const TIER_OPTIONS: { value: PlanTier; label: string }[] = [
  { value: "starter", label: "Starter · $99/mo" },
  { value: "professional", label: "Professional · $299/mo" },
  { value: "enterprise", label: "Enterprise · $999/mo" },
];

const COMPANY_BLOCKER_KEYS = new Set(["companyIcpFit", "companyFindings"]);

type Draft = {
  ownerId: string;
  primaryContactId: string;
  lastOutreachAt: string;
  nextAction: string;
  nextActionDue: string;
  verenaPlanInterest: string;
  proposedTier: string;
  proposedMrr: string;
  outcome: string;
  lostReasonCategory: string;
  lostReasonNotes: string;
};

const EMPTY_DRAFT: Draft = {
  ownerId: "",
  primaryContactId: "",
  lastOutreachAt: "",
  nextAction: "",
  nextActionDue: "",
  verenaPlanInterest: "",
  proposedTier: "",
  proposedMrr: "",
  outcome: "",
  lostReasonCategory: "",
  lostReasonNotes: "",
};

/**
 * The blocking modal INV-30 asks for: shows exactly the fields the target
 * stage still needs, filling them and confirming completes the move in one
 * action. Shared by the kanban board and the deal detail page's stage
 * control - one implementation of "fill and move."
 *
 * Company-level blockers (ICP fit, findings - both on Company, not Deal)
 * have no input here at all: there's nothing this form can fix, only a link
 * to where it can be fixed.
 *
 * Lost reason is a fixed category (INV-31) plus optional free-text notes,
 * combined into the single `lostReason` string the frozen schema has room
 * for (see gates.ts for why there's no separate category column).
 */
export function StageGateModal({
  open,
  onOpenChange,
  dealId,
  toStageId,
  stageName,
  missingFields,
  companyId,
  owners,
  contacts,
  onMoved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealId: string;
  toStageId: string;
  stageName: string;
  missingFields: Record<string, string[]>;
  companyId: string;
  owners: OwnerOption[];
  contacts: ContactOption[];
  onMoved: (data: unknown) => void;
}) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<Record<string, string[]>>(missingFields);
  const [submitting, setSubmitting] = useState(false);

  const missingKeys = Object.keys(errors);
  const companyBlockers = missingKeys.filter((k) => COMPANY_BLOCKER_KEYS.has(k));
  const fillableKeys = missingKeys.filter((k) => !COMPANY_BLOCKER_KEYS.has(k));
  const onlyCompanyBlocked = fillableKeys.length === 0 && companyBlockers.length > 0;

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function handleSubmit() {
    setSubmitting(true);

    const fields: StageTransitionFields = {};
    if (fillableKeys.includes("ownerId")) fields.ownerId = draft.ownerId || null;
    if (fillableKeys.includes("primaryContactId"))
      fields.primaryContactId = draft.primaryContactId || null;
    if (fillableKeys.includes("lastOutreachAt"))
      fields.lastOutreachAt = draft.lastOutreachAt
        ? new Date(draft.lastOutreachAt).toISOString()
        : null;
    if (fillableKeys.includes("nextAction")) fields.nextAction = draft.nextAction || null;
    if (fillableKeys.includes("nextActionDue"))
      fields.nextActionDue = draft.nextActionDue
        ? new Date(draft.nextActionDue).toISOString()
        : null;
    if (fillableKeys.includes("verenaPlanInterest"))
      fields.verenaPlanInterest = draft.verenaPlanInterest || null;
    if (fillableKeys.includes("proposedTier")) fields.proposedTier = draft.proposedTier || null;
    if (fillableKeys.includes("proposedMrr"))
      fields.proposedMrr = draft.proposedMrr ? Number(draft.proposedMrr) : null;

    const outcome =
      fillableKeys.includes("outcome") && draft.outcome
        ? (draft.outcome as "won" | "lost")
        : undefined;
    const categoryLabel = LOST_REASON_CATEGORIES.find(
      (c) => c.value === draft.lostReasonCategory,
    )?.label;
    const lostReason =
      (outcome === "lost" || fillableKeys.includes("lostReason")) && categoryLabel
        ? formatLostReason(categoryLabel, draft.lostReasonNotes)
        : undefined;

    const result: StageTransitionResult = await postStageTransition(dealId, {
      toStageId,
      fields,
      outcome,
      lostReason,
    });

    setSubmitting(false);

    if (!result.ok) {
      setErrors(result.fields ?? { error: [result.error] });
      return;
    }

    onMoved(result.data);
    onOpenChange(false);
    setDraft(EMPTY_DRAFT);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setDraft(EMPTY_DRAFT);
          setErrors(missingFields);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move to {stageName}</DialogTitle>
          <DialogDescription>
            This stage requires the fields below before the deal can move.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {companyBlockers.map((key) => (
            <p key={key} className="text-destructive text-sm">
              {errors[key]?.[0]}
              {" — "}
              <Link href={`/companies/${companyId}`} className="underline">
                Open company
              </Link>
            </p>
          ))}

          {fillableKeys.includes("ownerId") ? (
            <div className="grid gap-1.5">
              <Label>Owner</Label>
              <Select value={draft.ownerId} onValueChange={(v) => set("ownerId", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an owner" />
                </SelectTrigger>
                <SelectContent>
                  {owners.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {fillableKeys.includes("primaryContactId") ? (
            <div className="grid gap-1.5">
              <Label>Primary contact</Label>
              <Select
                value={draft.primaryContactId}
                onValueChange={(v) => set("primaryContactId", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={contacts.length ? "Select a contact" : "No contacts on this company"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {fillableKeys.includes("lastOutreachAt") ? (
            <div className="grid gap-1.5">
              <Label>Last outreach date</Label>
              <Input
                type="date"
                value={draft.lastOutreachAt}
                onChange={(e) => set("lastOutreachAt", e.target.value)}
              />
            </div>
          ) : null}

          {fillableKeys.includes("nextAction") ? (
            <div className="grid gap-1.5">
              <Label>Next action</Label>
              <Input
                value={draft.nextAction}
                onChange={(e) => set("nextAction", e.target.value)}
                placeholder="e.g. Book the demo"
              />
            </div>
          ) : null}

          {fillableKeys.includes("nextActionDue") ? (
            <div className="grid gap-1.5">
              <Label>Next action due</Label>
              <Input
                type="date"
                value={draft.nextActionDue}
                onChange={(e) => set("nextActionDue", e.target.value)}
              />
            </div>
          ) : null}

          {fillableKeys.includes("verenaPlanInterest") ? (
            <div className="grid gap-1.5">
              <Label>Verena plan interest</Label>
              <Select
                value={draft.verenaPlanInterest}
                onValueChange={(v) => set("verenaPlanInterest", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a tier" />
                </SelectTrigger>
                <SelectContent>
                  {TIER_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {fillableKeys.includes("proposedTier") ? (
            <div className="grid gap-1.5">
              <Label>Proposed tier</Label>
              <Select value={draft.proposedTier} onValueChange={(v) => set("proposedTier", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a tier" />
                </SelectTrigger>
                <SelectContent>
                  {TIER_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {fillableKeys.includes("proposedMrr") ? (
            <div className="grid gap-1.5">
              <Label>Proposed MRR (USD)</Label>
              <Input
                inputMode="decimal"
                value={draft.proposedMrr}
                onChange={(e) => set("proposedMrr", e.target.value)}
                placeholder="299"
              />
            </div>
          ) : null}

          {fillableKeys.includes("outcome") ? (
            <div className="grid gap-1.5">
              <Label>Outcome</Label>
              <Select value={draft.outcome} onValueChange={(v) => set("outcome", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Won or lost" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {(fillableKeys.includes("outcome") && draft.outcome === "lost") ||
          fillableKeys.includes("lostReason") ? (
            <>
              <div className="grid gap-1.5">
                <Label>Lost reason</Label>
                <Select
                  value={draft.lostReasonCategory}
                  onValueChange={(v) => set("lostReasonCategory", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOST_REASON_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Notes (optional)</Label>
                <Input
                  value={draft.lostReasonNotes}
                  onChange={(e) => set("lostReasonNotes", e.target.value)}
                  placeholder="Any detail worth keeping"
                />
              </div>
            </>
          ) : null}

          {errors.error ? <p className="text-destructive text-sm">{errors.error[0]}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          {!onlyCompanyBlocked ? (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Moving…" : "Fill and move"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
