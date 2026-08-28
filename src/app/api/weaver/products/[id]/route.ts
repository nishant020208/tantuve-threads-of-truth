import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getServerClient } from "@/lib/server-db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth(req, ["weaver", "admin"]);
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const client = getServerClient();

  const { data: product } = await client
    .from("products")
    .select("*")
    .eq("id", id)
    .single();
  if (!product) return NextResponse.json({ detail: "Product not found" }, { status: 404 });

  const { data: entries } = await client
    .from("ledger_entries")
    .select("*")
    .eq("product_id", id)
    .order("seq");

  return NextResponse.json({ ...product, entries: entries || [] });
}
