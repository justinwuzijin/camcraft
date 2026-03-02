import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import type { WorldEntry } from "@/lib/worldStore";

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
}

const RANDOM_CITIES = [
  "Tokyo, Japan", "Paris, France", "New York City, USA", "Istanbul, Turkey",
  "Mumbai, India", "Rome, Italy", "Buenos Aires, Argentina", "Marrakech, Morocco",
  "Bangkok, Thailand", "Havana, Cuba", "Prague, Czech Republic", "Cairo, Egypt",
  "Lisbon, Portugal", "Kyoto, Japan", "Mexico City, Mexico", "Amsterdam, Netherlands",
  "Seoul, South Korea", "Barcelona, Spain", "Nairobi, Kenya", "Reykjavik, Iceland",
  "Rio de Janeiro, Brazil", "Vienna, Austria", "Hanoi, Vietnam", "Dubrovnik, Croatia",
  "Petra, Jordan", "Cusco, Peru", "Zanzibar, Tanzania", "Bruges, Belgium",
  "Cartagena, Colombia", "Jaipur, India", "Bergen, Norway", "Fez, Morocco",
  "Tallinn, Estonia", "Queenstown, New Zealand", "Valparaíso, Chile",
  "Edinburgh, Scotland", "Santorini, Greece", "Luang Prabang, Laos",
  "San Francisco, USA", "Cape Town, South Africa", "Saigon, Vietnam",
  "Hong Kong, China", "Singapore", "Venice, Italy", "Zürich, Switzerland",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function isSet(val: string | undefined): val is string {
  return !!val && val !== "Default";
}

function buildPrompt(params: Record<string, string>): string {
  const base =
    "Generate a Google Street View photo. This must be a proper equirectangular projection for spherical 360° viewing — the left and right edges connect seamlessly, horizontal lines near the equator stay straight, and the top/bottom show natural polar stretching. No fisheye, no barrel distortion, no mirroring. Photorealistic, sharp, modern digital camera quality. All people and vehicles frozen in place (no motion blur).";

  const detailParts: string[] = [];
  if (isSet(params.location)) detailParts.push(`Location: ${params.location}`);
  if (isSet(params.timeOfDay)) detailParts.push(`Time of day: ${params.timeOfDay}`);
  if (isSet(params.decade) && params.decade !== "Today") {
    // Avoid "era" framing — just describe the props/set dressing to prevent
    // the model from switching to an old photography projection style
    detailParts.push(
      `The cars, clothing, store signs, advertisements, and street furniture in the scene should all be from the ${params.decade}. Everything else about the image — the camera, resolution, projection, and lighting — is identical to a 2024 Google Street View capture`
    );
  }
  if (isSet(params.placeType)) detailParts.push(`Setting: a ${params.placeType}`);
  if (isSet(params.weather)) detailParts.push(`Weather: ${params.weather}`);
  if (isSet(params.crowd)) detailParts.push(`Crowd level: ${params.crowd}`);

  let prompt = detailParts.length === 0 ? base : `${base}\n\n${detailParts.join(". ")}.`;
  if (params.instructions) prompt += `\n\nAdditional instructions: ${params.instructions}`;

  // For older decades, append a final format reminder (recency bias helps)
  const decadeNum = parseInt(params.decade);
  if (isSet(params.decade) && params.decade !== "Today" && !isNaN(decadeNum) && decadeNum < 2000) {
    prompt += "\n\nRemember: equirectangular projection only. No fisheye, no barrel distortion, no mirrored reflections at top/bottom. The format must be indistinguishable from Google Street View.";
  }

  return prompt;
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
  resolved.location = body.location || pick(RANDOM_CITIES);
  resolved.timeOfDay = body.timeOfDay || "Default";
  resolved.decade = body.decade || "Default";
  resolved.placeType = body.placeType || "Default";
  resolved.weather = body.weather || "Default";
  resolved.crowd = body.crowd || "Default";
  if (body.instructions) resolved.instructions = body.instructions;

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
    if (isSet(resolved.location)) slugParts.push(slugify(resolved.location));
    if (isSet(resolved.timeOfDay)) slugParts.push(slugify(resolved.timeOfDay));
    if (isSet(resolved.decade)) slugParts.push(slugify(resolved.decade));
    if (isSet(resolved.placeType)) slugParts.push(slugify(resolved.placeType));
    if (isSet(resolved.weather)) slugParts.push(slugify(resolved.weather));
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

    // Write companion JSON sidecar for world library
    const worldEntry: WorldEntry = {
      id: `world_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      panoPath: `/generated/panos/${filename}`,
      parameters: {
        location: resolved.location ?? "",
        timeOfDay: resolved.timeOfDay ?? "",
        decade: resolved.decade ?? "",
        placeType: resolved.placeType ?? "",
        weather: resolved.weather ?? "",
        crowd: resolved.crowd ?? "",
      },
      prompt,
      createdAt: Date.now(),
    };
    const jsonFilename = filename.replace(/\.(jpg|png)$/, ".json");
    await writeFile(
      path.join(dir, jsonFilename),
      JSON.stringify(worldEntry, null, 2)
    );

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
