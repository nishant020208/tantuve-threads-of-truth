import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/server-db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// Approximate lat/lng for GI craft regions (center of region, not precise address)
const REGION_COORDS: Record<string, { lat: number; lng: number; state: string }> = {
  "Sambalpur, Odisha": { lat: 21.47, lng: 83.97, state: "Odisha" },
  "Sambalpur": { lat: 21.47, lng: 83.97, state: "Odisha" },
  "Odisha": { lat: 20.95, lng: 85.1, state: "Odisha" },
  "Patan, Gujarat": { lat: 23.85, lng: 72.13, state: "Gujarat" },
  "Gujarat": { lat: 22.26, lng: 71.19, state: "Gujarat" },
  "Uttar Pradesh": { lat: 26.85, lng: 80.91, state: "Uttar Pradesh" },
  "Varanasi, Uttar Pradesh": { lat: 25.32, lng: 83.01, state: "Uttar Pradesh" },
  "Tamil Nadu": { lat: 11.13, lng: 78.65, state: "Tamil Nadu" },
  "Telangana": { lat: 17.12, lng: 79.2, state: "Telangana" },
  "Bhoodan Pochampally, Telangana": { lat: 17.56, lng: 78.8, state: "Telangana" },
  "Bhubaneswar, Odisha": { lat: 20.3, lng: 85.82, state: "Odisha" },
  "Karnataka": { lat: 15.32, lng: 75.71, state: "Karnataka" },
  "Andhra Pradesh": { lat: 15.91, lng: 79.74, state: "Andhra Pradesh" },
  "West Bengal": { lat: 22.99, lng: 87.75, state: "West Bengal" },
  "Rajasthan": { lat: 27.02, lng: 74.22, state: "Rajasthan" },
  "Maharashtra": { lat: 19.08, lng: 72.88, state: "Maharashtra" },
};

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(`map:${ip}`, 60, 60_000);
  if (!allowed) {
    return NextResponse.json({ detail: "Too many requests" }, { status: 429 });
  }
  try {
    const client = getServerClient();

    const { data: weavers } = await client
      .from("weavers")
      .select("id, name, region, craft_type, gi_registered, status")
      .eq("gi_registered", true)
      .eq("status", "approved");

    const { data: products } = await client
      .from("products")
      .select("id, weaver_id, craft_type, status")
      .in("status", ["completed", "in_retail", "sold"]);

    const { data: giRegistry } = await client
      .from("gi_registry")
      .select("craft_type, region, official_description");

    const items = (weavers || []).map((w: any) => {
      const coords = REGION_COORDS[w.region] || REGION_COORDS[w.region?.split(",")?.[0]] || { lat: 20.59, lng: 78.96, state: "India" };
      const weaverProducts = (products || []).filter((p: any) => p.weaver_id === w.id);
      const giEntry = (giRegistry || []).find((g: any) => g.craft_type === w.craft_type);

      return {
        id: w.id,
        name: w.name,
        region: w.region,
        craft_type: w.craft_type,
        lat: coords.lat,
        lng: coords.lng,
        state: coords.state,
        productCount: weaverProducts.length,
        giRegistered: w.gi_registered,
        officialDescription: giEntry?.official_description || null,
        products: weaverProducts.map((p: any) => ({
          id: p.id,
          craft_type: p.craft_type,
          status: p.status,
        })),
      };
    });

    return NextResponse.json(items);
  } catch (err: any) {
    console.error("Map data error:", err);
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
