/**
 * Shell layout for every authenticated section (INV-9).
 *
 * Placeholder until INV-9 lands the sidebar, header and breadcrumb in the
 * F5-F7 slice. Shared path: Foundation owns this file, agents do not edit it.
 */
export default function NavLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-svh p-8">{children}</div>;
}
