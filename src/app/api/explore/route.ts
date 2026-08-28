import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/server-db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(`explore:${ip}`, 60, 60_000);
  if (!allowed) {
    return NextResponse.json({ detail: "Too many requests" }, { status: 429 });
  }
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
