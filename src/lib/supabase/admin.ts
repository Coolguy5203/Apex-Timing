import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS and anon-key restrictions.
// Only use server-side (API routes, server components, lib functions).
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
