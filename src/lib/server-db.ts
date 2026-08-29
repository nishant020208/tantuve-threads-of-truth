/**
 * Server-side Supabase client for Next.js API routes.
 * Never imported by client components.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getServerClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  client = createClient(url, key);
  return client;
}


/**
 * Create a notification for a user.
 * Non-blocking: errors are logged but don't throw.
 */
export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  link?: string,
) {
  try {
    const client = getServerClient();
    await client.from("notifications").insert({
      user_id: userId,
      type,
      title,
      body,
      link: link || null,
      read: false,
    });
  } catch (err) {
    console.warn("Failed to create notification:", err);
  }
}
