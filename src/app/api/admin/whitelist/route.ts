import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getServerClient } from "@/lib/server-db";

// GET /api/admin/whitelist — list all whitelist requests with optional status/role filters
export async function GET(req: NextRequest) {
  const user = await requireAuth(req, ["admin"]);
  if (user instanceof NextResponse) return user;

  const client = getServerClient();
  const status = req.nextUrl.searchParams.get("status");
  const role = req.nextUrl.searchParams.get("role");

  let query = client
    .from("whitelist_requests")
    .select("*")
    .order("submitted_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (role) query = query.eq("requested_role", role);

  const { data, error } = await query;
  if (error) {
    // Table might not exist yet — try to create it
    try {
      await client.rpc("exec_sql", {
        sql: `
          CREATE TABLE IF NOT EXISTS whitelist_requests (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID,
            identifier TEXT NOT NULL,
            requested_role TEXT NOT NULL DEFAULT 'weaver',
            status TEXT NOT NULL DEFAULT 'pending',
            submitted_at TIMESTAMPTZ DEFAULT NOW(),
            reviewed_by UUID,
            reviewed_at TIMESTAMPTZ,
            review_note TEXT,
            applicant_name TEXT,
            applicant_location TEXT,
            applicant_craft TEXT,
            applicant_bio TEXT
          );
          CREATE TABLE IF NOT EXISTS whitelist_audit (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            request_id UUID REFERENCES whitelist_requests(id),
            user_id UUID,
            action TEXT NOT NULL,
            role TEXT,
            performed_by UUID,
            performed_at TIMESTAMPTZ DEFAULT NOW(),
            note TEXT
          );
        `,
      });
    } catch {
      // If RPC not available, the table might already exist with a different schema
    }
    // Retry
    const { data: retry } = await client
      .from("whitelist_requests")
      .select("*")
      .order("submitted_at", { ascending: false });
    return NextResponse.json(retry || []);
  }

  return NextResponse.json(data || []);
}

// POST /api/admin/whitelist — create a new whitelist entry (pre-approve)
export async function POST(req: NextRequest) {
  const user = await requireAuth(req, ["admin"]);
  if (user instanceof NextResponse) return user;

  const body = await req.json();
  const { identifier, requested_role, applicant_name, applicant_location, applicant_craft, applicant_bio, review_note } = body;

  if (!identifier || !requested_role) {
    return NextResponse.json({ detail: "identifier and requested_role are required" }, { status: 400 });
  }

  const client = getServerClient();

  const { data, error } = await client
    .from("whitelist_requests")
    .insert({
      identifier,
      requested_role,
      status: "approved",
      applicant_name: applicant_name || null,
      applicant_location: applicant_location || null,
      applicant_craft: applicant_craft || null,
      applicant_bio: applicant_bio || null,
      reviewed_by: user.userId,
      reviewed_at: new Date().toISOString(),
      review_note: review_note || "Pre-approved by admin",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  // Write audit log
  await client.from("whitelist_audit").insert({
    request_id: data.id,
    user_id: null,
    action: "pre_approved",
    role: requested_role,
    performed_by: user.userId,
    note: review_note || "Pre-approved by admin",
  });

  return NextResponse.json(data);
}
