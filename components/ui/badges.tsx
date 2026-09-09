import type {
  DealOutcome,
  IcpFit,
  LifecycleStage,
  PlanTier,
  Source,
  StageKey,
} from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Enum badges (INV-10).
 *
 * Every enum value gets its own colour, and the maps are keyed by the Prisma
 * enum type - so if the schema ever gains a value, TypeScript fails here rather
 * than the UI silently rendering an unstyled badge.
 *
 * Colours are literal Tailwind classes, not interpolated, because Tailwind only
 * emits classes it can see in the source.
 */

const badgeBase = "border-transparent font-medium";

// --- Stage (deal pipeline position) ---------------------------------------

const STAGE_LABELS: Record<StageKey, string> = {
  scanned: "Scanned",
  qualified: "Qualified",
  contacted: "Contacted",
  engaged: "Engaged",
  evaluating: "Evaluating",
  proposal: "Proposal",
  closed: "Won / Lost",
};

const STAGE_CLASSES: Record<StageKey, string> = {
  scanned: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  qualified: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  contacted:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",
  engaged:
    "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  evaluating:
    "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  proposal:
    "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200",
  closed:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
};

export function StageBadge({
  stage,
  label,
  className,
}: {
  stage: StageKey;
  /** Override for the stage's own name, when it differs from the default. */
  label?: string;
  className?: string;
}) {
  return (
    <Badge className={cn(badgeBase, STAGE_CLASSES[stage], className)}>
      {label ?? STAGE_LABELS[stage]}
    </Badge>
  );
}

// --- Lifecycle stage (Company / Contact relationship state) ----------------

const LIFECYCLE_LABELS: Record<LifecycleStage, string> = {
  prospect: "Prospect",
  lead: "Lead",
  qualified: "Qualified",
  opportunity: "Opportunity",
  customer: "Customer",
  churned: "Churned",
  disqualified: "Disqualified",
};

const LIFECYCLE_CLASSES: Record<LifecycleStage, string> = {
  prospect: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  lead: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  qualified: "bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200",
  opportunity:
    "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  customer:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  churned: "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200",
  disqualified:
    "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
};

export function LifecycleBadge({
  stage,
  className,
}: {
  stage: LifecycleStage;
  className?: string;
}) {
  return (
    <Badge className={cn(badgeBase, LIFECYCLE_CLASSES[stage], className)}>
      {LIFECYCLE_LABELS[stage]}
    </Badge>
  );
}

// --- Source ----------------------------------------------------------------

const SOURCE_LABELS: Record<Source, string> = {
  outbound_scan: "Outbound scan",
  inbound_signup: "Inbound signup",
  referral: "Referral",
};

const SOURCE_CLASSES: Record<Source, string> = {
  outbound_scan: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  inbound_signup:
    "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200",
  referral:
    "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
};

export function SourceBadge({
  source,
  className,
}: {
  source: Source;
  className?: string;
}) {
  return (
    <Badge className={cn(badgeBase, SOURCE_CLASSES[source], className)}>
      {SOURCE_LABELS[source]}
    </Badge>
  );
}

// --- ICP fit ---------------------------------------------------------------

const ICP_LABELS: Record<IcpFit, string> = {
  strong: "Strong fit",
  moderate: "Moderate fit",
  weak: "Weak fit",
  none: "Not a fit",
};

const ICP_CLASSES: Record<IcpFit, string> = {
  strong:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  moderate: "bg-lime-100 text-lime-900 dark:bg-lime-950 dark:text-lime-200",
  weak: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  none: "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200",
};

export function IcpFitBadge({
  fit,
  className,
}: {
  fit: IcpFit;
  className?: string;
}) {
  return (
    <Badge className={cn(badgeBase, ICP_CLASSES[fit], className)}>
      {ICP_LABELS[fit]}
    </Badge>
  );
}

// --- Plan tier -------------------------------------------------------------

const TIER_LABELS: Record<PlanTier, string> = {
  starter: "Starter · $99",
  professional: "Professional · $299",
  enterprise: "Enterprise · $999",
};

const TIER_CLASSES: Record<PlanTier, string> = {
  starter: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  professional:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",
  enterprise:
    "bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-950 dark:text-fuchsia-200",
};

export function PlanTierBadge({
  tier,
  className,
}: {
  tier: PlanTier;
  className?: string;
}) {
  return (
    <Badge className={cn(badgeBase, TIER_CLASSES[tier], className)}>
      {TIER_LABELS[tier]}
    </Badge>
  );
}

// --- Deal outcome ----------------------------------------------------------

const OUTCOME_LABELS: Record<DealOutcome, string> = {
  won: "Won",
  lost: "Lost",
};

const OUTCOME_CLASSES: Record<DealOutcome, string> = {
  won: "bg-emerald-600 text-white dark:bg-emerald-700",
  lost: "bg-rose-600 text-white dark:bg-rose-700",
};

export function OutcomeBadge({
  outcome,
  className,
}: {
  outcome: DealOutcome;
  className?: string;
}) {
  return (
    <Badge className={cn(badgeBase, OUTCOME_CLASSES[outcome], className)}>
      {OUTCOME_LABELS[outcome]}
    </Badge>
  );
}
