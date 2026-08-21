import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/server-db";

export async function GET() {
  try {
    const client = getServerClient();
    const { data } = await client
      .from("products")
      .select("*, retailers(name, location)")
      .eq("status", "with_retailer");

    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error("Marketplace error:", err);
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
