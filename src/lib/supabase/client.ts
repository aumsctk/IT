/**
 * Supabase BROWSER client
 * Use inside Client Components ("use client") and hooks.
 */
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Singleton for client components (avoids multiple GoTrueClient warnings)
let _client: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowser() {
  if (!_client) _client = createClient();
  return _client;
}
