import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/server-db";

export async function GET() {
  try {
    const client = getServerClient();
    const { data } = await client.from("gi_registry").select("*");

    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error("GI registry error:", err);
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
