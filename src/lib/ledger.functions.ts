import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeEntryHash, generateProductCode } from "@/lib/chain";

export const createProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      title: string;
      craft_type: string;
      yarn_source?: string;
      lot_id?: string;
      photo_url?: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: weaver, error: weaverError } = await supabase
      .from("weavers")
      .select("id, gi_registered")
      .eq("user_id", userId)
      .maybeSingle();
    if (weaverError) throw new Error(weaverError.message);
    if (!weaver) throw new Error("No weaver profile is linked to this account.");

    let lastError = "";
    for (let attempt = 0; attempt < 5; attempt++) {
      const id = generateProductCode();
      const { error } = await supabase.from("products").insert({
        id,
        weaver_id: weaver.id,
        title: data.title,
        craft_type: data.craft_type,
        yarn_source: data.yarn_source ?? null,
        lot_id: data.lot_id ?? null,
        photo_url: data.photo_url ?? null,
        status: "in_progress",
      });
      if (!error) return { productId: id };
      lastError = error.message;
    }
    throw new Error(lastError || "Could not create product");
  });

export const appendLedgerStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      product_id: string;
      step_name: string;
      step_data: Record<string, string>;
      actor?: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: previous, error: prevError } = await supabase
      .from("ledger_entries")
      .select("seq, entry_hash")
      .eq("product_id", data.product_id)
      .order("seq", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (prevError) throw new Error(prevError.message);

    const seq = (previous?.seq ?? 0) + 1;
    const previous_entry_hash = previous?.entry_hash ?? null;
    const timestamp = new Date().toISOString();

    const entry_hash = await computeEntryHash({
      product_id: data.product_id,
      seq,
      step_name: data.step_name,
      step_data: data.step_data,
      timestamp,
      previous_entry_hash,
    });

    const { error } = await supabase.from("ledger_entries").insert({
      product_id: data.product_id,
      seq,
      step_name: data.step_name,
      step_data: data.step_data,
      actor: data.actor ?? null,
      timestamp,
      entry_hash,
      previous_entry_hash,
    });
    if (error) throw new Error(error.message);

    return { seq, entry_hash, timestamp };
  });

export const setProductStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { product_id: string; status: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("products")
      .update({ status: data.status })
      .eq("id", data.product_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
