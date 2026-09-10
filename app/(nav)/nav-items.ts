import {
  Building2,
  CheckSquare,
  LayoutDashboard,
  Handshake,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * The top-level sections (INV-9). Single source of truth for the sidebar and
 * the breadcrumb, so navigation cannot be invented a different way by every
 * agent.
 */

/** Counts the (nav) layout computes server-side and hands to the sidebar. */
export type NavBadge = "pendingReview";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Which agent fills this section in, for the placeholder copy. */
  owner: string;
  /** Show a count badge from this source; hidden when the count is 0. */
  badge?: NavBadge;
};

export const NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    owner: "Agent C · Activity & Dashboard",
  },
  {
    title: "Companies",
    href: "/companies",
    icon: Building2,
    owner: "Agent A · Records",
  },
  {
    title: "Contacts",
    href: "/contacts",
    icon: Users,
    owner: "Agent A · Records",
  },
  {
    title: "Deals",
    href: "/deals",
    icon: Handshake,
    owner: "Agent B · Pipeline",
  },
  {
    title: "Tasks",
    href: "/tasks",
    icon: CheckSquare,
    owner: "Agent C · Activity & Dashboard",
  },
  {
    // Added by Foundation after INV-61 merged (CLAUDE.md section 12).
    title: "Review",
    href: "/review",
    icon: ShieldCheck,
    owner: "Agent D · Intake",
    badge: "pendingReview",
  },
];
