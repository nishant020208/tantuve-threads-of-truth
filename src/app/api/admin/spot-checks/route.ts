import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getServerClient } from "@/lib/server-db";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req, ["admin"]);
  if (user instanceof NextResponse) return user;

  const client = getServerClient();

  try {
    const { data, error } = await client
      .from("products")
      .select("*")
      .eq("spot_check_selected", true)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json([]);
    return NextResponse.json(data || []);
  } catch {
    return NextResponse.json([]);
  }
}
