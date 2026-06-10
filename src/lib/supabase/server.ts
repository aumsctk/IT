// @ts-nocheck
/**
 * Supabase SERVER client
 * Use inside Server Components, Route Handlers, and Server Actions.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from Server Component — safe to ignore
          }
        },
      },
    }
  );
}

/**
 * Service-role client — bypasses RLS.
 * ONLY use in trusted server-side code (Route Handlers / Server Actions).
 * NEVER expose SERVICE_ROLE_KEY to the browser.
 */
export async function createServiceSupabase() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll()    { return cookieStore.getAll(); },
        setAll(cs)  { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
      },
      auth: { persistSession: false },
    }
  );
}