import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth(req, ["weaver", "admin"]);
  if (user instanceof NextResponse) return user;

  const { id: productId } = await params;
  const verifyUrl = `${req.nextUrl.origin}/verify/${productId}`;

  // Generate a simple SVG QR code (using a public API)
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(verifyUrl)}&format=svg`;
  const res = await fetch(qrApiUrl);
  if (!res.ok) return NextResponse.json({ detail: "QR generation failed" }, { status: 500 });

  const svg = await res.text();
  return new NextResponse(svg, {
    headers: { "Content-Type": "image/svg+xml" },
  });
}
