import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/server-db";

async function handleShare(productId: string) {
  try {
    const client = getServerClient();

    const { data: product } = await client
      .from("products")
      .select("id, title, craft_type, status, weaver_id")
      .eq("id", productId)
      .single();

    if (!product) {
      return NextResponse.json({ detail: "Product not found" }, { status: 404 });
    }

    let weaverName = "Verified Weaver";
    if (product) {
      const { data: weaver } = await client
        .from("weavers")
        .select("name, region")
        .eq("id", (product as any).weaver_id)
        .single();
      if (weaver) weaverName = weaver.name;
    }

    const verifyUrl = `https://tantuve.app/verify/${productId}`;
    const cardUrl = `https://tantuve.app/verify/${productId}/card`;
    const shareText = encodeURIComponent(
      `Verify this ${product.craft_type} textile by ${weaverName} on Tantuve: ${verifyUrl}`
    );
    const whatsappUrl = `https://wa.me/?text=${shareText}`;
    const copyText = `Verify this ${product.craft_type} textile by ${weaverName} on Tantuve: ${verifyUrl}`;

    return NextResponse.json({
      cardUrl,
      shareUrl: verifyUrl,
      whatsappUrl,
      copyText,
      product: {
        id: productId,
        title: product.title,
        craft_type: product.craft_type,
        weaver_name: weaverName,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  const { productId } = await params;
  return handleShare(productId);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  const { productId } = await params;
  return handleShare(productId);
}
