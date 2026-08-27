import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getServerClient } from "@/lib/server-db";
import { sha256 } from "@/lib/server-utils";

export async function POST(req: NextRequest) {
  const user = await requireAuth(req, ["admin"]);
  if (user instanceof NextResponse) return user;

  const body = await req.json();
  const { phone, message } = body;

  if (!phone || !message) {
    return NextResponse.json({ detail: "phone and message are required" }, { status: 400 });
  }

  const client = getServerClient();

  // Parse the SMS message format: "STEP <step_name> <optional details>"
  // Example: "STEP dyeing Natural indigo batch #42"
  const stepMatch = message.match(/^STEP\s+(\w+)\s*(.*)$/i);
  if (!stepMatch) {
    return NextResponse.json({
      parsed: false,
      message: "Invalid format. Use: STEP <step_name> <details>",
      example: "STEP dyeing Natural indigo batch completed",
    });
  }

  const stepName = stepMatch[1].toLowerCase();
  const details = stepMatch[2] || "";

  // Find weaver by phone number
  const { data: weaver } = await client
    .from("weavers")
    .select("id, user_id, name")
    .eq("user_id", user.userId)
    .limit(1)
    .single();

  if (!weaver) {
    return NextResponse.json({
      parsed: true,
      logged: false,
      message: "No weaver profile found for this phone/user",
      step: stepName,
      details,
    });
  }

  // Find the weaver's most recent in_progress product
  const { data: product } = await client
    .from("products")
    .select("id, status")
    .eq("weaver_id", weaver.id)
    .eq("status", "in_progress")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!product) {
    return NextResponse.json({
      parsed: true,
      logged: false,
      message: "No in-progress product found for this weaver",
      step: stepName,
      details,
      weaver: weaver.name,
    });
  }

  // Log the step (same logic as the web form)
  const { data: existing } = await client
    .from("ledger_entries")
    .select("seq")
    .eq("product_id", product.id)
    .order("seq", { ascending: false })
    .limit(1);

  const nextSeq = existing && existing.length > 0 ? existing[0].seq + 1 : 1;
  const now = new Date().toISOString();
  const prevHash = nextSeq > 1 && existing?.length
    ? (await client.from("ledger_entries").select("entry_hash").eq("product_id", product.id).order("seq", { ascending: false }).limit(1).single()).data?.entry_hash || ""
    : "";
  const payload = JSON.stringify({ step_name: stepName, step_data: { note: details, source: "sms_simulator" }, actor: weaver.name, seq: nextSeq, prev_hash: prevHash, timestamp: now });
  const entryHash = sha256(payload);

  const { data: entry, error } = await client
    .from("ledger_entries")
    .insert({
      product_id: product.id,
      seq: nextSeq,
      step_name: stepName,
      step_data: { note: details, source: "sms_simulator" },
      actor: weaver.name,
      previous_entry_hash: prevHash,
      entry_hash: entryHash,
      timestamp: now,
      flagged_plausibility: false,
      flagged_reason: null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ parsed: true, logged: false, message: error.message });
  }

  return NextResponse.json({
    parsed: true,
    logged: true,
    message: `Step "${stepName}" logged for product ${product.id} via SMS simulator`,
    entry: {
      id: entry.id,
      seq: entry.seq,
      step_name: entry.step_name,
      product_id: product.id,
      actor: weaver.name,
      timestamp: entry.timestamp,
    },
    note: "Photo evidence still needs to be added via the web app",
  });
}
