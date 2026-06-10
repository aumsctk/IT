/**
 * Root page — redirect to dashboard if logged in, else to login.
 * Middleware handles this too, but this covers the edge case of
 * direct navigation to "/".
 */
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function RootPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  redirect(user ? "/dashboard" : "/login");
}
