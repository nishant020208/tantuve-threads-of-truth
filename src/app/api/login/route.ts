import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/server-db";

const JWT_SECRET = process.env.JWT_SECRET || "tantuve-jwt-secret";
const ALGORITHM = "HS256";

async function signToken(payload: Record<string, unknown>): Promise<string> {
  const { SignJWT } = await import("jose");
  const encoder = new TextEncoder();
  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encoder.encode(JWT_SECRET));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ detail: "Email and password are required" }, { status: 400 });
    }

    const client = getServerClient();

    // Find user in Supabase Auth
    let userId: string | null = null;
    let authEmail = email;

    try {
      const { data: users } = await client.auth.admin.listUsers();
      const user = users?.users?.find((u) => u.email === email);
      if (user) {
        userId = user.id;
      }
    } catch {
      // listUsers might fail — try alternative approach
    }

    if (!userId) {
      return NextResponse.json({ detail: "Invalid email or password" }, { status: 401 });
    }

    // Try to verify password (if user has bcrypt hash in profiles)
    const { data: profile } = await client
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profile?.password_hash) {
      const bcrypt = await import("bcryptjs");
      const valid = await bcrypt.compare(password, profile.password_hash);
      if (!valid) {
        return NextResponse.json({ detail: "Invalid email or password" }, { status: 401 });
      }
    }
    // If no password_hash column or no hash stored, accept any password (backwards compat)

    // Find role
    const { data: roleRow } = await client
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .limit(1)
      .single();

    let role = roleRow?.role;

    // Fallback: check weavers table
    if (!role) {
      const { data: weaverRow } = await client
        .from("weavers")
        .select("id")
        .eq("user_id", userId)
        .limit(1)
        .single();
      if (weaverRow) role = "weaver";
    }

    if (!role) {
      return NextResponse.json({ detail: "No role assigned to this account" }, { status: 401 });
    }

    // Whitelist check
    if (role === "weaver") {
      const { data: w } = await client
        .from("weavers")
        .select("status")
        .eq("user_id", userId)
        .limit(1)
        .single();
      if (w?.status === "pending") {
        return NextResponse.json({ detail: "Your access request is pending admin approval" }, { status: 403 });
      }
      if (w?.status === "rejected") {
        return NextResponse.json({ detail: "Your access request was not approved" }, { status: 403 });
      }
    } else if (role === "retailer") {
      const { data: r } = await client
        .from("retailers")
        .select("request_status")
        .eq("user_id", userId)
        .limit(1)
        .single();
      if (r?.request_status === "pending") {
        return NextResponse.json({ detail: "Your retailer access request is pending admin approval" }, { status: 403 });
      }
      if (r?.request_status === "rejected") {
        return NextResponse.json({ detail: "Your retailer access request was not approved" }, { status: 403 });
      }
    }

    // Create JWT
    const token = await signToken({ sub: userId, role });

    return NextResponse.json({
      token,
      user: {
        id: userId,
        email: authEmail,
        full_name: profile?.full_name || email.split("@")[0],
        role,
      },
    });
  } catch (err: any) {
    console.error("Login error:", err);
    return NextResponse.json(
      { detail: err.message || "Internal server error" },
      { status: 500 },
    );
  }
}
