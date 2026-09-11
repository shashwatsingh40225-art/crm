"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
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
  const { setTheme, resolvedTheme } = useTheme();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="bg-[#232366] text-white flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold tracking-tight shadow-sm">
            IN
          </div>
          <div className="grid min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-semibold tracking-tight">
              Invictus CRM
            </span>
            <span className="text-muted-foreground truncate text-[11px]">
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
            <div className="flex items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:justify-center">
              <div className="bg-primary/10 text-primary flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold">
                {userName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </div>
              <span className="text-muted-foreground truncate text-xs font-medium group-data-[collapsible=icon]:hidden">
                {userName}
              </span>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              tooltip="Toggle theme"
            >
              <Sun className="size-4 dark:hidden" />
              <Moon className="hidden size-4 dark:block" />
              <span>Theme</span>
            </SidebarMenuButton>
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
