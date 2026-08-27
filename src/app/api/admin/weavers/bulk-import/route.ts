import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getServerClient } from "@/lib/server-db";

export async function POST(req: NextRequest) {
  const user = await requireAuth(req, ["admin"]);
  if (user instanceof NextResponse) return user;
  const body = await req.json();
  const { weavers } = body;
  if (!Array.isArray(weavers) || weavers.length === 0) {
    return NextResponse.json({ detail: "weavers array required" }, { status: 400 });
  }
  const client = getServerClient();
  const results: { name: string; status: string; error?: string }[] = [];
  for (const w of weavers) {
    if (!w.name || !w.region || !w.craft_type) {
      results.push({ name: w.name || "Unknown", status: "skipped", error: "Missing required fields" });
      continue;
    }
    const { error } = await client.from("weavers").insert({ name: w.name, region: w.region, craft_type: w.craft_type, bio: w.bio || null, status: "pending", gi_registered: false });
    if (error) results.push({ name: w.name, status: "error", error: error.message });
    else results.push({ name: w.name, status: "pending" });
  }
  return NextResponse.json({ success: true, imported: results.filter((r) => r.status === "pending").length, errors: results.filter((r) => r.status !== "pending").length, results });
}
