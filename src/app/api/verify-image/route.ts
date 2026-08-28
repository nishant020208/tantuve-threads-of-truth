import { NextRequest, NextResponse } from "next/server";

const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY;
const CEREBRAS_MODEL = "gemma-4-31b";

/**
 * Verify an image using Cerebras AI vision.
 * Checks: 1) Is this a real photograph? 2) Is it AI-generated?
 * 3) Does it match the expected handloom production step?
 * Returns: { isAuthentic, isAiGenerated, description, confidence }
 */
async function verifyImageWithCerebras(
  base64Image: string,
  stepName: string,
  mimeType: string,
): Promise<{
  isAuthentic: boolean;
  isAiGenerated: boolean;
  description: string;
  confidence: number;
}> {
  if (!CEREBRAS_API_KEY) {
    throw new Error("CEREBRAS_API_KEY not configured");
  }

  const stepDescriptions: Record<string, string> = {
    yarn_sourcing:
      "This should show raw yarn, thread spools, cotton/ silk fibers, or yarn sourcing activities in a handloom workshop.",
    dyeing:
      "This should show dyeing vats, colored threads, natural dye materials (indigo, madder, turmeric), or the dyeing process.",
    weaving:
      "This should show a handloom in operation, woven fabric on a loom, or the weaving process in a textile workshop.",
    finishing:
      "This should show finished fabric, pressing/ironing, quality inspection, or the final stages of textile production.",
  };

  const expectedContext = stepDescriptions[stepName] || "A handloom textile production step.";

  const prompt = `You are an expert image analyst for a handloom textile traceability platform. Analyze this image carefully and answer these questions:

1. IS THIS A REAL PHOTOGRAPH? Look for signs of: natural lighting variations, real-world textures, camera artifacts, noise patterns, imperfect framing. Real workshop photos often have uneven lighting, messy backgrounds, and natural shadows.

2. IS THIS AI-GENERATED? Look for: overly smooth/perfect textures, impossible geometry, repeating patterns that look synthetic, floating objects, inconsistent lighting, strange hand/finger shapes, text that looks garbled, artifacts typical of DALL-E/Midjourney/Stable Diffusion.

3. DOES THIS MATCH THE EXPECTED SCENE? Expected: ${expectedContext}

4. CONFIDENCE: Rate your confidence 0-100.

Respond in this EXACT JSON format (no other text):
{"isAuthentic": true/false, "isAiGenerated": true/false, "description": "brief description", "confidence": 0-100, "reasoning": "why you think this"}`;

  const res = await fetch("https://api.cerebras.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CEREBRAS_API_KEY}`,
    },
    body: JSON.stringify({
      model: CEREBRAS_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 500,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Cerebras API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "";

  // Parse JSON from response (may be wrapped in markdown)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not parse AI response");
  }

  const result = JSON.parse(jsonMatch[0]);

  return {
    isAuthentic: result.isAuthentic === true || result.isAuthentic === "true",
    isAiGenerated: result.isAiGenerated === true || result.isAiGenerated === "true",
    description: result.description || "Image analyzed",
    confidence: Math.min(100, Math.max(0, Number(result.confidence) || 50)),
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, stepName, mimeType } = body;

    if (!image) {
      return NextResponse.json({ detail: "No image provided" }, { status: 400 });
    }
    if (!stepName) {
      return NextResponse.json({ detail: "Step name required" }, { status: 400 });
    }

    // Check image size (max 10MB base64)
    if (image.length > 13_000_000) {
      return NextResponse.json(
        { detail: "Image too large. Maximum 10MB." },
        { status: 400 },
      );
    }

    const result = await verifyImageWithCerebras(
      image,
      stepName,
      mimeType || "image/jpeg",
    );

    const uploadedAt = new Date().toISOString();

    return NextResponse.json({
      verified: result.isAuthentic && !result.isAiGenerated,
      isAuthentic: result.isAuthentic,
      isAiGenerated: result.isAiGenerated,
      description: result.description,
      confidence: result.confidence,
      uploadedAt,
      stepName,
    });
  } catch (err: any) {
    console.error("Image verification error:", err);
    return NextResponse.json(
      { detail: err.message || "Image verification failed" },
      { status: 500 },
    );
  }
}
