import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
}

function buildPrompt(params: Record<string, string>): string {
  const base =
    "Create an equirectangular image with a perfect seam connection (for viewing in 360). Make it as realistic and natural as possible - like a real Street View Photo.";

    
  const detailParts: string[] = [];
  if (params.location) detailParts.push(`Location: ${params.location}`);
  if (params.timeOfDay) detailParts.push(`Time of day: ${params.timeOfDay}`);
  if (params.decade)
    detailParts.push(
      `The scene is set in the ${params.decade} era — reflect this ONLY through period-accurate details like vehicles, fashion, signage, storefronts, and street furniture. KEEP IT REALISTIC - like the photo was taken with today's photography equipment. The architecture, roads, and environment should still look like a modern perfect replica photograph taken in that time period, NOT a stylized or vintage-filtered illustration`
    );
  if (params.placeType) detailParts.push(`Setting: a ${params.placeType}`);
  if (params.weather) detailParts.push(`Weather: ${params.weather}`);
  if (params.crowd) detailParts.push(`Crowd level: ${params.crowd}`);

  if (detailParts.length === 0) return base;
  return `${base}\n\n${detailParts.join(". ")}.`;
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured. Add it to .env.local" },
      { status: 500 }
    );
  }

  let body: Record<string, string | undefined>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const resolved: Record<string, string> = {};
  if (body.location) resolved.location = body.location;
  if (body.timeOfDay) resolved.timeOfDay = body.timeOfDay;
  if (body.decade) resolved.decade = body.decade;
  if (body.placeType) resolved.placeType = body.placeType;
  if (body.weather) resolved.weather = body.weather;
  if (body.crowd) resolved.crowd = body.crowd;

  const prompt = buildPrompt(resolved);

  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
            imageConfig: {
              imageSize: "4K",
            },
          },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("Gemini API error:", res.status, errText);
      return NextResponse.json(
        { error: `Gemini API returned ${res.status}`, details: errText },
        { status: 502 }
      );
    }

    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts;
    if (!parts || !Array.isArray(parts)) {
      return NextResponse.json(
        { error: "Unexpected Gemini response format" },
        { status: 502 }
      );
    }

    const imagePart = parts.find(
      (p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData
    );
    if (!imagePart?.inlineData) {
      return NextResponse.json(
        { error: "Gemini did not return an image" },
        { status: 502 }
      );
    }

    // Build a descriptive filename from resolved params
    const slugParts: string[] = [];
    if (resolved.location) slugParts.push(slugify(resolved.location));
    if (resolved.timeOfDay) slugParts.push(slugify(resolved.timeOfDay));
    if (resolved.decade) slugParts.push(slugify(resolved.decade));
    if (resolved.placeType) slugParts.push(slugify(resolved.placeType));
    if (resolved.weather) slugParts.push(slugify(resolved.weather));
    const slug = slugParts.length > 0 ? slugParts.join("-") : "scene";

    const ext = imagePart.inlineData.mimeType === "image/png" ? "png" : "jpg";
    const filename = `${slug}-${Date.now()}.${ext}`;
    const dir = path.join(process.cwd(), "public", "generated", "panos");
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, filename),
      Buffer.from(imagePart.inlineData.data, "base64")
    );
    console.log(`Saved panorama: public/generated/panos/${filename}`);

    return NextResponse.json({
      image: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType,
      prompt,
      parameters: resolved,
      savedPath: `/generated/panos/${filename}`,
    });
  } catch (e) {
    console.error("Gemini request failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
