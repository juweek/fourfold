import { createClient } from "@supabase/supabase-js";

let client: ReturnType<typeof createClient> | null = null;

// The hosted schema is intentionally small and SQL-first; route validation keeps writes bounded.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function db(): any {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Fourfold is not connected to Supabase yet.");
  client ??= createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export function assertNoError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}
