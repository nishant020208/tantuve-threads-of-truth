import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getServerClient } from "@/lib/server-db";

// Co-op officer counter-signs a product (trust_level 1 -> 2)
export async function POST(req: NextRequest) {
  const user = await requireAuth(req, ["coop", "admin"]);
  if (user instanceof NextResponse) return user;

  const body = await req.json();
  const { product_id } = body;

  if (!product_id) {
    return NextResponse.json({ detail: "product_id required" }, { status: 400 });
  }

  const client = getServerClient();

  // Verify product exists and is completed
  const { data: product } = await client
    .from("products")
    .select("id, status, trust_level")
    .eq("id", product_id)
    .single();

  if (!product) {
    return NextResponse.json({ detail: "Product not found" }, { status: 404 });
  }

  if (product.status !== "completed") {
    return NextResponse.json({ detail: "Only completed products can be counter-signed" }, { status: 400 });
  }

  // Update trust level to 2 (co-op verified)
  const { error } = await client
    .from("products")
    .update({ trust_level: 2, trust_signed_by: user.userId, trust_signed_at: new Date().toISOString() })
    .eq("id", product_id);

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, trust_level: 2 });
}

// List products awaiting co-op counter-signature
export async function GET(req: NextRequest) {
  const user = await requireAuth(req, ["coop", "admin"]);
  if (user instanceof NextResponse) return user;

  const client = getServerClient();

  const { data: products } = await client
    .from("products")
    .select("id, title, craft_type, status, trust_level, weaver_id")
    .eq("status", "completed")
    .or("trust_level.is.null,trust_level.eq.1");

  // Enrich with weaver names
  const enriched = await Promise.all((products || []).map(async (p: any) => {
    let weaverName = "Unknown";
    if (p.weaver_id) {
      const { data: w } = await client.from("weavers").select("name").eq("id", p.weaver_id).single();
      weaverName = w?.name || "Unknown";
    }
    return { ...p, weaver_name: weaverName };
  }));

  return NextResponse.json(enriched);
}
