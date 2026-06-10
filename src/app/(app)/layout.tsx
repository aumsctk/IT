/**
 * App layout — wraps all authenticated pages with AppShell.
 * DEMO MODE: works without a real Supabase connection.
 */
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // DEMO MODE — hardcoded profile so UI renders without Supabase
  // Replace with real Supabase fetch once your project is connected
  const userRole    = "super_admin";
  const unreadCount = 3;

  return (
    <AppShell userRole={userRole} unreadCount={unreadCount}>
      {children}
    </AppShell>
  );
}
