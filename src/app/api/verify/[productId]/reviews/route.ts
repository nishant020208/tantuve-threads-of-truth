import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/server-db";

// Simple in-memory rate limiter per IP per product (resets on cold start)
const rateLimiter = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5; // max reviews per IP per product per hour
const RATE_WINDOW = 3600000; // 1 hour

function checkRateLimit(ip: string, productId: string): boolean {
  const key = `${ip}:${productId}`;
  const now = Date.now();
  const entry = rateLimiter.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimiter.set(key, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  try {
    const { productId } = await params;
    const client = getServerClient();

    // Check if reviews table exists
    const { data, error } = await client
      .from("reviews")
      .select("id, rating, comment, reviewer_name, submitted_at")
      .eq("product_id", productId)
      .order("submitted_at", { ascending: false })
      .limit(20);

    if (error) {
      // Table doesn't exist yet
      return NextResponse.json({ reviews: [], averageRating: 0, tableExists: false });
    }

    const reviews = data || [];
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
      : 0;

    return NextResponse.json({ reviews, averageRating: Math.round(avgRating * 10) / 10, tableExists: true });
  } catch {
    return NextResponse.json({ reviews: [], averageRating: 0, tableExists: false });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  try {
    const { productId } = await params;
    const body = await req.json();
    const { rating, comment, reviewer_name } = body;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ detail: "Rating must be between 1 and 5" }, { status: 400 });
    }

    // Rate limit check
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    if (!checkRateLimit(ip, productId)) {
      return NextResponse.json({ detail: "Too many reviews. Please try again later." }, { status: 429 });
    }

    const client = getServerClient();

    const { data, error } = await client
      .from("reviews")
      .insert({
        product_id: productId,
        rating: Math.round(rating),
        comment: comment || null,
        reviewer_name: reviewer_name || "Anonymous",
        reviewer_ip: ip,
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes("relation") && error.message.includes("does not exist")) {
        return NextResponse.json({ detail: "Reviews system not yet configured" }, { status: 503 });
      }
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
