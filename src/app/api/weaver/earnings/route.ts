import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getServerClient } from "@/lib/server-db";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req, ["weaver"]);
  if (user instanceof NextResponse) return user;

  const client = getServerClient();

  const { data: weaver } = await client
    .from("weavers")
    .select("id")
    .eq("user_id", user.userId)
    .limit(1)
    .single();
  if (!weaver) return NextResponse.json({ detail: "Weaver profile not found" }, { status: 404 });

  const { data: products } = await client
    .from("products")
    .select("id, title, craft_type, status, price")
    .eq("weaver_id", weaver.id);

  const items = products || [];
  const totalValue = items.reduce((sum: number, p: any) => sum + (p.price || 0), 0);
  const soldValue = items.filter((p: any) => p.status === "sold").reduce((sum: number, p: any) => sum + (p.price || 0), 0);
  const listedValue = items.filter((p: any) => p.status === "in_retail" || p.status === "with_retailer").reduce((sum: number, p: any) => sum + (p.price || 0), 0);
  const totalProducts = items.length;
  const soldCount = items.filter((p: any) => p.status === "sold").length;
  const listedCount = items.filter((p: any) => p.status === "in_retail" || p.status === "with_retailer").length;
  const completedCount = items.filter((p: any) => p.status === "completed").length;

  return NextResponse.json({
    totalValue,
    soldValue,
    listedValue,
    totalProducts,
    soldCount,
    listedCount,
    completedCount,
    products: items.map((p: any) => ({
      id: p.id,
      title: p.title,
      craft_type: p.craft_type,
      status: p.status,
      price: p.price,
    })),
  });
}
