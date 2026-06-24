import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function requireDoblyAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase, user: null, allowed: false };

  const adminEmails = (process.env.DOBLY_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const allowed = Boolean(user.email && adminEmails.includes(user.email.toLowerCase()));

  return { supabase, user, allowed };
}
