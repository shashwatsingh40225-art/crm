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

const badgeBase = "border text-[11px] font-medium tracking-tight rounded-full px-2 py-0.5";

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
  scanned: "bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300 border-slate-200 dark:border-slate-800",
  qualified: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  contacted:
    "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  engaged:
    "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border-violet-200 dark:border-violet-800",
  evaluating:
    "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  proposal:
    "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  closed:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
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
  prospect: "bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300 border-slate-200 dark:border-slate-800",
  lead: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  qualified: "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-800",
  opportunity:
    "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border-violet-200 dark:border-violet-800",
  customer:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  churned: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  disqualified:
    "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700",
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
  outbound_scan: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  inbound_signup:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  referral:
    "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800",
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
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  moderate: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  weak: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  none: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
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
  starter: "bg-slate-50 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300 border-slate-200 dark:border-slate-800",
  professional:
    "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  enterprise:
    "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800",
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
  won: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  lost: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
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
