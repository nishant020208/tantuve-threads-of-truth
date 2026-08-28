import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/server-db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(`apply-retailer:${ip}`, 5, 300_000);
  if (!allowed) {
    return NextResponse.json({ detail: "Too many applications. Please try again in 5 minutes." }, { status: 429 });
  }
  try {
    const body = await req.json();
    const { email, password, business_name, location } = body;

    if (!email || !password || !business_name) {
      return NextResponse.json({ detail: "Email, password, and business name are required" }, { status: 400 });
    }

    const client = getServerClient();

    let userId: string;
    try {
      const { data, error } = await client.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error) {
        if (error.message?.includes("already")) {
          return NextResponse.json({ detail: "Email already registered" }, { status: 409 });
        }
        throw error;
      }
      userId = data.user.id;
    } catch (err: any) {
      return NextResponse.json({ detail: `Account creation failed: ${err.message}` }, { status: 500 });
    }

    // Store password hash
    const bcrypt = await import("bcryptjs");
    const passwordHash = await bcrypt.hash(password, 10);
    await client.from("profiles").upsert({ id: userId, full_name: business_name, email, password_hash: passwordHash });
    await client.from("user_roles").upsert({ user_id: userId, role: "retailer" });

    const { error } = await client.from("retailers").insert({
      user_id: userId,
      name: business_name,
      location: location || "",
    });

    if (error) {
      return NextResponse.json({ detail: `Failed: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ message: "Retailer application submitted for GI authority review" });
  } catch (err: any) {
    console.error("Apply retailer error:", err);
    return NextResponse.json({ detail: err.message || "Internal server error" }, { status: 500 });
  }
}
