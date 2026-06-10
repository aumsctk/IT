import { type NextRequest, NextResponse } from "next/server";

/**
 * DEMO MODE middleware — bypasses Supabase auth so you can preview the UI
 * without a real Supabase project.
 *
 * To restore real auth: delete this file and rename middleware.real.ts → middleware.ts
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files through
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.json"
  ) {
    return NextResponse.next();
  }

  // Redirect root → dashboard in demo mode
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Let everything else through (no auth gate)
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|workbox-.*).*)" ],
};
