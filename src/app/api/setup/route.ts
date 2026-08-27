import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/server-db";

export async function POST(req: NextRequest) {
  try {
    const client = getServerClient();

    // Create reviews table using raw SQL via Supabase's REST API
    // This is a one-time setup endpoint
    const sql = `
      CREATE TABLE IF NOT EXISTS reviews (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        product_id TEXT NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        reviewer_name TEXT,
        reviewer_ip TEXT,
        submitted_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
    `;

    // Try to create via exec SQL function
    const { error } = await client.rpc("exec_sql" as any, { sql: sql });

    if (error) {
      // If exec_sql doesn't exist, try inserting a test record to see if table exists
      const { error: testError } = await client
        .from("reviews")
        .select("id")
        .limit(1);

      if (testError) {
        return NextResponse.json({
          success: false,
          message: "Reviews table does not exist. Please create it manually in Supabase SQL Editor:",
          sql: sql,
        });
      }
      return NextResponse.json({ success: true, message: "Reviews table already exists" });
    }

    return NextResponse.json({ success: true, message: "Reviews table created" });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
