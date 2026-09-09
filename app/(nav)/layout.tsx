import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { requireUser } from "@/lib/auth";
import { AppSidebar } from "./app-sidebar";
import { NavBreadcrumb } from "./nav-breadcrumb";

export const runtime = "nodejs";

/**
 * Shell for every authenticated section (INV-9).
 *
 * Shared path - Foundation owns this file, agents do not edit it. Agents add
 * their sections as routes inside this group (app/(nav)/companies/**, etc.) so
 * they inherit the sidebar; /login sits outside the group and does not.
 *
 * requireUser() here is the single auth gate for every section beneath it, on
 * top of the middleware redirect.
 *
 * TooltipProvider is required: SidebarMenuButton's `tooltip` prop renders a
 * Radix Tooltip, and this version of the sidebar component does NOT bundle a
 * provider inside SidebarProvider. Without it every collapsed-sidebar render
 * throws.
 */
export default async function NavLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider>
        <AppSidebar userName={user.name} />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <NavBreadcrumb />
          </header>
          <div className="flex flex-1 flex-col gap-6 p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
