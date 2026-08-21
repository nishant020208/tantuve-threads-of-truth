import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/server-db";

export async function GET() {
  try {
    const client = getServerClient();
    const { data } = await client
      .from("products")
      .select("*")
      .in("status", ["completed", "with_retailer"])
      .order("created_at", { ascending: false });

    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error("Explore error:", err);
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
