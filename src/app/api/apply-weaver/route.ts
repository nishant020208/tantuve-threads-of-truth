import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/server-db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, region, craft_type, bio } = body;

    if (!email || !password || !name || !region || !craft_type) {
      return NextResponse.json({ detail: "All fields are required" }, { status: 400 });
    }

    const client = getServerClient();

    // Create Supabase Auth user
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

    // Create profile
    await client.from("profiles").upsert({
      id: userId,
      full_name: name,
      email,
    });

    // Create user_role
    await client.from("user_roles").upsert({
      user_id: userId,
      role: "weaver",
    });

    // Create weaver record
    const { error } = await client.from("weavers").insert({
      user_id: userId,
      name,
      craft_type,
      region,
      bio: bio || "",
      gi_registered: false,
      status: "pending",
    });

    if (error) {
      return NextResponse.json({ detail: `Failed: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ message: "Application submitted for GI authority review" });
  } catch (err: any) {
    console.error("Apply weaver error:", err);
    return NextResponse.json({ detail: err.message || "Internal server error" }, { status: 500 });
  }
}
