import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured. Add it to .env.local" },
      { status: 500 }
    );
  }

  let body: { image: string; mimeType?: string; scene?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.image) {
    return NextResponse.json(
      { error: "Missing image field" },
      { status: 400 }
    );
  }

  const mimeType = body.mimeType || "image/jpeg";

  const prompt =
    "This is a low-resolution capture from a panorama. Reimagine it as a sharp, natural photograph taken with a Sony A7IV at 85mm f/1.4. " +
    "The input is blurry and low-detail — you should freely generate and interpolate realistic details to fill in the gaps. " +
    "Guess what faces, textures, signs, and objects would actually look like and render them convincingly. " +
    "The result must look like a real, high-resolution DSLR photo — not an upscaled version of the input. " +
    "Generate realistic faces with natural skin, proper eyes, and believable expressions. Generate readable text on signs. Generate crisp fabric, hair, foliage, and architectural detail. " +
    "Keep the same general scene, composition, and lighting, but make it look like it was actually there and photographed professionally. " +
    "Subtle shallow depth of field with background bokeh.";

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
          contents: [
            {
              parts: [
                { inlineData: { mimeType, data: body.image } },
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
            imageConfig: {
              imageSize: "1K",
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

    // Return enhanced image data only — saving to disk happens in /api/save-photo
    return NextResponse.json({
      image: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType,
    });
  } catch (e) {
    console.error("Gemini focus request failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
