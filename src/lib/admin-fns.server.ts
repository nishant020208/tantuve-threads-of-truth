import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth, requireRole } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ---------------------------------------------------------------------------
// Admin dashboard stats
// ---------------------------------------------------------------------------

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireRole("admin")])
  .handler(async () => {
    const [weaversRes, productsRes, scansRes, disputesRes] = await Promise.all([
      supabaseAdmin.from("weavers").select("id, status", { count: "exact" }),
      supabaseAdmin.from("products").select("id, status", { count: "exact" }),
      supabaseAdmin.from("scans").select("id", { count: "exact" }),
      supabaseAdmin.from("disputes").select("id, status", { count: "exact" }),
    ]);

    return {
      totalWeavers: weaversRes.count ?? 0,
      pendingWeavers: (weaversRes.data ?? []).filter((w) => w.status === "pending").length,
      totalProducts: productsRes.count ?? 0,
      completedProducts: (productsRes.data ?? []).filter((p) =>
        p.status === "completed" || p.status === "completed_offchain",
      ).length,
      totalScans: scansRes.count ?? 0,
      totalDisputes: disputesRes.count ?? 0,
      openDisputes: (disputesRes.data ?? []).filter((d) => d.status === "open").length,
    };
  });

// ---------------------------------------------------------------------------
// List weavers (filterable by status)
// ---------------------------------------------------------------------------

export const getAdminWeavers = createServerFn({ method: "GET" })
  .middleware([requireRole("admin")])
  .validator((input: { status?: string }) => input)
  .handler(async ({ data }) => {
    let query = supabaseAdmin
      .from("weavers")
      .select("*")
      .order("created_at", { ascending: false });

    if (data.status) {
      query = query.eq("status", data.status);
    }

    const { data: weavers, error } = await query;
    if (error) throw new Error(error.message);
    return weavers;
  });

// ---------------------------------------------------------------------------
// Approve / reject weaver
// ---------------------------------------------------------------------------

export const approveWeaver = createServerFn({ method: "POST" })
  .middleware([requireRole("admin")])
  .validator((input: { weaver_id: string }) => input)
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("weavers")
      .update({ status: "approved", gi_registered: true })
      .eq("id", data.weaver_id);
    if (error) throw new Error(error.message);

    // Fetch the weaver to get user_id for notification
    const { data: weaver } = await supabaseAdmin
      .from("weavers")
      .select("user_id, name")
      .eq("id", data.weaver_id)
      .maybeSingle();

    if (weaver?.user_id) {
      await supabaseAdmin.from("notifications").insert({
        user_id: weaver.user_id,
        message: `Your weaver application has been approved! Welcome, ${weaver.name}.`,
      });
    }

    return { ok: true };
  });

export const rejectWeaver = createServerFn({ method: "POST" })
  .middleware([requireRole("admin")])
  .validator((input: { weaver_id: string }) => input)
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("weavers")
      .update({ status: "rejected" })
      .eq("id", data.weaver_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// List all products (admin view)
// ---------------------------------------------------------------------------

export const getAdminProducts = createServerFn({ method: "GET" })
  .middleware([requireRole("admin")])
  .handler(async () => {
    const { data: products, error } = await supabaseAdmin
      .from("products")
      .select("*, weavers(name, region, craft_type)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return products;
  });

// ---------------------------------------------------------------------------
// GI Registry management
// ---------------------------------------------------------------------------

export const getRegistry = createServerFn({ method: "GET" })
  .middleware([requireRole("admin")])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("gi_registry")
      .select("*")
      .order("craft_type");
    if (error) throw new Error(error.message);
    return data;
  });

export const addRegistryEntry = createServerFn({ method: "POST" })
  .middleware([requireRole("admin")])
  .validator(
    (input: { craft_type: string; region: string; official_description: string }) => input,
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("gi_registry").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
