import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

// Handles the OAuth / email-confirmation callback from Supabase.
//
// This used to call createServerSupabaseClient() (which writes session cookies
// into the next/headers cookie store inside a try/catch that swallowed any
// failure) and then return a brand-new NextResponse.redirect(). When that
// cookie write didn't make it onto the redirect response, the browser arrived
// at /dashboard with no session, middleware bounced it straight back to
// /auth/login, and the user had to sign in a second time - the "you have to
// sign in twice" bug.
//
// Binding the Supabase client's cookie writes directly to the response object
// we actually return removes that whole class of failure: the session is set
// on the same response that performs the redirect.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // The login page sends users through with ?next=, middleware sends them with
  // ?redirect= - accept both so a deep link the user was bounced off of is
  // honoured instead of silently dropping them on /dashboard.
  const requestedNext = searchParams.get("next") ?? searchParams.get("redirect") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=confirmation_failed`);
  }

  // Only allow same-origin relative paths (prevents open redirect), and never
  // bounce back into the auth pages themselves.
  const safeNext =
    requestedNext.startsWith("/") && !requestedNext.startsWith("//") && !requestedNext.startsWith("/auth/")
      ? requestedNext
      : "/dashboard";

  const response = NextResponse.redirect(`${origin}${safeNext}`);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[auth/callback] Supabase public environment variables are not configured.");
    return NextResponse.redirect(`${origin}/auth/login?error=confirmation_failed`);
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Never swallow this - a failed exchange is exactly what used to present
    // as "it just sent me back to the login page for no reason".
    console.error("[auth/callback] exchangeCodeForSession failed:", error.message);
    return NextResponse.redirect(`${origin}/auth/login?error=confirmation_failed`);
  }

  return response;
}
