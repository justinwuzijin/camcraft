import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured. Add it to .env.local" },
      { status: 500 }
    );
  }

  let body: {
    image: string;
    mimeType?: string;
    scene?: Record<string, string>;
    camera?: Record<string, string>;
  };
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

  const sceneContext = body.scene
    ? Object.entries(body.scene)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")
    : "";

  const cameraContext = body.camera
    ? Object.entries(body.camera)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")
    : "";

  const prompt = `You are a professional photography critic and camera gear advisor. Analyze this photograph and provide a structured critique.

${sceneContext ? `Scene context: ${sceneContext}` : ""}
${cameraContext ? `Camera equipment used: ${cameraContext}` : ""}

Rate the image on these criteria (each score from 0 to 100):
1. **Composition** - Rule of thirds, leading lines, framing, balance, visual flow
2. **Lighting** - Quality, direction, contrast, use of shadows and highlights
3. **Color & Tone** - Color harmony, white balance, mood, grading
4. **Exposure** - Proper exposure, dynamic range, detail in highlights/shadows
5. **Subject & Story** - Clarity of subject, narrative, emotional impact
6. **Technical Quality** - Sharpness, noise, distortion, overall technical execution

Also provide:
- An **overall score** (0-100, weighted average reflecting photographic merit)
- 2-3 specific **composition improvements** (framing, angle, cropping, etc.)
- 2-3 specific **camera rig improvements** (lens choice, settings, filters, accessories)

You MUST respond with ONLY valid JSON in this exact format, no markdown, no explanation:
{
  "scores": {
    "composition": <number>,
    "lighting": <number>,
    "colorTone": <number>,
    "exposure": <number>,
    "subjectStory": <number>,
    "technicalQuality": <number>
  },
  "overall": <number>,
  "compositionTips": ["<tip1>", "<tip2>"],
  "rigTips": ["<tip1>", "<tip2>"],
  "summary": "<One sentence overall impression>"
}`;

  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
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
            responseMimeType: "application/json",
            temperature: 0.4,
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

    const textPart = parts.find(
      (p: { text?: string }) => typeof p.text === "string"
    );
    if (!textPart?.text) {
      return NextResponse.json(
        { error: "Gemini did not return text" },
        { status: 502 }
      );
    }

    // Parse the JSON response
    let analysis;
    try {
      analysis = JSON.parse(textPart.text);
    } catch {
      console.error("Failed to parse Gemini JSON:", textPart.text);
      return NextResponse.json(
        { error: "Failed to parse analysis response" },
        { status: 502 }
      );
    }

    return NextResponse.json(analysis);
  } catch (e) {
    console.error("Gemini analysis request failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
