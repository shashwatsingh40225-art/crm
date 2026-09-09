import {
  Building2,
  CheckSquare,
  LayoutDashboard,
  Handshake,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * The five top-level sections (INV-9). Single source of truth for the sidebar
 * and the breadcrumb, so navigation cannot be invented three different ways by
 * three different agents.
 */
export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Which agent fills this section in, for the placeholder copy. */
  owner: string;
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
];
