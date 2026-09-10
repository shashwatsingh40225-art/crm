"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NAV_ITEMS, type NavBadge } from "./nav-items";
import { signOut } from "@/app/login/actions";

export function AppSidebar({
  userName,
  badges = {},
}: {
  userName: string;
  /** Computed in the (nav) layout on each server render, not fetched here. */
  badges?: Partial<Record<NavBadge, number>>;
}) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold">
            IN
          </div>
          <div className="grid min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-semibold">Invictus CRM</span>
            <span className="text-muted-foreground truncate text-xs">
              Verena launch
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Pipeline</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                // Exact match, or a child route such as /companies/<id>.
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                const count = item.badge ? (badges[item.badge] ?? 0) : 0;

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {count > 0 ? (
                      <SidebarMenuBadge data-testid={`nav-badge-${item.badge}`}>
                        {count}
                      </SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="text-muted-foreground truncate px-2 py-1 text-xs group-data-[collapsible=icon]:hidden">
              {userName}
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <form action={signOut} className="w-full">
              <SidebarMenuButton asChild tooltip="Sign out">
                <button type="submit" className="w-full">
                  <LogOut />
                  <span>Sign out</span>
                </button>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
