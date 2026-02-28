import { NextResponse } from "next/server";

type CameraId = "sony-handycam" | "digital-camera" | "fujifilm-xt2" | "sony-a7iv";

const CAMERA_PROMPTS: Record<CameraId, string> = {
  "sony-a7iv":
    "This is a low-resolution capture from a panorama. Reimagine it as a sharp, natural photograph taken with a Sony A7IV at 85mm f/1.4. " +
    "The input is blurry and low-detail — you should freely generate and interpolate realistic details to fill in the gaps. " +
    "Guess what faces, textures, signs, and objects would actually look like and render them convincingly. " +
    "The result must look like a real, high-resolution DSLR photo — not an upscaled version of the input. " +
    "Generate realistic faces with natural skin, proper eyes, and believable expressions. Generate readable text on signs. Generate crisp fabric, hair, foliage, and architectural detail. " +
    "Keep the same general scene, composition, and lighting, but make it look like it was actually there and photographed professionally. " +
    "Subtle shallow depth of field with background bokeh.",

  "fujifilm-xt2":
    "This is a low-resolution capture from a panorama. Reimagine it as a photograph taken with a Fujifilm X-T2 mirrorless camera with the XF 35mm f/1.4 lens. " +
    "Apply Fujifilm's signature color science — use PROVIA/Standard film simulation with slightly lifted shadows, rich but not oversaturated colors, and characteristic Fuji skin tones (warm, natural, slightly pink undertones). " +
    "The image should have organic film-like grain, slightly muted highlights, and that distinctive X-Trans sensor rendering with fine detail. " +
    "Generate realistic details for faces, textures, and objects. Keep the composition but make it look like an authentic Fujifilm JPEG straight out of camera. " +
    "The overall feel should be warm, nostalgic, and film-like — reminiscent of classic Fuji Superia or Velvia film stocks.",

  "digital-camera":
    "This is a low-resolution capture from a panorama. Reimagine it as a photograph taken with an early 2000s compact digital camera (like a Canon PowerShot or Sony Cybershot from 2003-2006). " +
    "Apply the characteristic look of that era: slightly overexposed highlights, muted and slightly desaturated colors, visible but subtle JPEG compression artifacts. " +
    "The image should have the 'built-in flash' look with slightly flat lighting, minor chromatic aberration at edges, and that distinctive CCD sensor rendering. " +
    "Resolution should appear lower — around 3-5 megapixels worth of detail. Colors should lean slightly magenta/purple in shadows. " +
    "Add a subtle orange date stamp in the bottom-right corner showing today's date in MM/DD/YYYY format. " +
    "The overall aesthetic should scream 'early digital photography' — not bad, but distinctly of its era.",

  "sony-handycam":
    "This is a low-resolution capture from a panorama. Reimagine it as a still frame captured from a late 1990s Sony Handycam Hi8/Digital8 camcorder. " +
    "Apply authentic analog video artifacts: visible interlaced scan lines, VHS-style color bleeding/smearing especially on reds and blues, softer overall focus. " +
    "The image should have that characteristic CCD video camera look with slightly blown highlights, crushed blacks, and analog video noise/grain. " +
    "Colors should be slightly oversaturated with that warm, nostalgic VHS palette. Add subtle tracking wobble artifacts at edges. " +
    "The aspect ratio feeling should be 4:3 standard definition. Resolution should appear SD video quality (480i). " +
    "Include subtle tape artifacts like minor dropouts or color banding. The overall look should be unmistakably 'home video from the 90s'.",
};

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
    cameraId?: CameraId;
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
  const cameraId: CameraId = body.cameraId && body.cameraId in CAMERA_PROMPTS
    ? body.cameraId
    : "sony-a7iv";

  const prompt = CAMERA_PROMPTS[cameraId];

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
