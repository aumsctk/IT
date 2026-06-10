// @ts-nocheck
/**
 * /auth/callback — Supabase Auth redirect handler
 *
 * Handles:
 *  1. Magic link / OTP email confirmation
 *  2. OAuth provider callbacks (if added later)
 *
 * Supabase sends ?code=... here. We exchange it for a session,
 * then redirect to the intended destination.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code     = searchParams.get("code");
  const redirect = searchParams.get("redirect") ?? "/dashboard";

  // Only accept relative paths to prevent open redirect attacks
  const safeRedirect = redirect.startsWith("/") ? redirect : "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()    { return cookieStore.getAll(); },
        setAll(cs)  {
          cs.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession error:", error.message);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  return NextResponse.redirect(`${origin}${safeRedirect}`);
}