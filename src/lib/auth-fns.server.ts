import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Require a specific role for a server function.
 * Chains on top of requireSupabaseAuth — must be listed after it in middleware.
 */
export function requireRole(...allowedRoles: string[]) {
  return createMiddleware({ type: "function" }).server(async ({ next, context }) => {
    const userId = (context as any).userId as string | undefined;
    if (!userId) throw new Error("Unauthorized");

    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (error || !data) throw new Error("No role assigned to this user");
    if (!allowedRoles.includes(data.role)) {
      throw new Error(`Access denied: requires role ${allowedRoles.join(" or ")}`);
    }

    return next({
      context: {
        ...context,
        role: data.role,
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Get current user's role (read-only)
// ---------------------------------------------------------------------------

export const getCurrentUserRole = createServerFn({ method: "GET" })
  .validator((input: { user_id: string }) => input)
  .handler(async ({ data }) => {
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user_id)
      .maybeSingle();

    return { role: roleData?.role ?? null };
  });

// ---------------------------------------------------------------------------
// Weaver application submission (public)
// ---------------------------------------------------------------------------

export const applyAsWeaver = createServerFn({ method: "POST" })
  .validator(
    (input: {
      name: string;
      region: string;
      craft_type: string;
      bio?: string;
      user_id: string;
    }) => input,
  )
  .handler(async ({ data }) => {
    // Check if already applied
    const { data: existing } = await supabaseAdmin
      .from("weavers")
      .select("id, status")
      .eq("user_id", data.user_id)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        message: `You already have an application (status: ${existing.status}).`,
        weaverId: existing.id,
      };
    }

    // Create weaver application
    const { data: weaver, error } = await supabaseAdmin
      .from("weavers")
      .insert({
        name: data.name,
        region: data.region,
        craft_type: data.craft_type,
        bio: data.bio ?? null,
        user_id: data.user_id,
        status: "pending",
        gi_registered: false,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    // Ensure user has the weaver role
    await supabaseAdmin.from("user_roles").upsert({
      user_id: data.user_id,
      role: "weaver",
    });

    // Create profile if not exists
    await supabaseAdmin.from("profiles").upsert(
      { id: data.user_id, full_name: data.name },
      { onConflict: "id" },
    );

    return {
      success: true,
      message: "Application submitted. Pending GI Authority review.",
      weaverId: weaver.id,
    };
  });

// ---------------------------------------------------------------------------
// Retailer: receive product
// ---------------------------------------------------------------------------

export const receiveProduct = createServerFn({ method: "POST" })
  .middleware([requireRole("retailer")])
  .validator((input: { product_id: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // Check product exists and is completable
    const { data: product, error: prodErr } = await supabase
      .from("products")
      .select("id, status, retailer_id")
      .eq("id", data.product_id)
      .maybeSingle();

    if (prodErr) throw new Error(prodErr.message);
    if (!product) throw new Error("Product not found");

    // Get retailer record
    const { data: retailer } = await supabaseAdmin
      .from("retailers")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!retailer) throw new Error("No retailer profile linked to this account");

    // Find the last ledger entry for hash chaining
    const { data: lastEntry } = await supabase
      .from("ledger_entries")
      .select("seq, entry_hash")
      .eq("product_id", data.product_id)
      .order("seq", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Append a "received_by_retailer" ledger entry
    const seq = (lastEntry?.seq ?? 0) + 1;
    const timestamp = new Date().toISOString();
    const { computeEntryHash } = await import("@/lib/chain");
    const entry_hash = await computeEntryHash({
      product_id: data.product_id,
      seq,
      step_name: "received_by_retailer",
      step_data: { retailer_id: retailer.id, retailer_name: "" },
      timestamp,
      previous_entry_hash: lastEntry?.entry_hash ?? null,
    });

    const { error: insertErr } = await supabase.from("ledger_entries").insert({
      product_id: data.product_id,
      seq,
      step_name: "received_by_retailer",
      step_data: { retailer_id: retailer.id },
      actor: context.userId,
      timestamp,
      entry_hash,
      previous_entry_hash: lastEntry?.entry_hash ?? null,
    });
    if (insertErr) throw new Error(insertErr.message);

    // Update product status + retailer
    await supabase
      .from("products")
      .update({ status: "with_retailer", retailer_id: retailer.id })
      .eq("id", data.product_id);

    return { ok: true, seq, entry_hash };
  });

// ---------------------------------------------------------------------------
// Retailer: list inventory
// ---------------------------------------------------------------------------

export const getRetailerInventory = createServerFn({ method: "GET" })
  .middleware([requireRole("retailer")])
  .handler(async ({ context }) => {
    const { supabase } = context;

    const { data: retailer } = await supabaseAdmin
      .from("retailers")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!retailer) return [];

    const { data, error } = await supabase
      .from("products")
      .select("*, weavers(name, region)")
      .eq("retailer_id", retailer.id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  });
