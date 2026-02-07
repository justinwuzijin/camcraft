import { NextResponse } from "next/server";

const TIME_OPTIONS = ["dawn", "morning", "noon", "golden hour", "dusk", "night"];
const DECADE_OPTIONS = ["1900s", "1920s", "1950s", "1970s", "1990s", "2000s", "2020s", "tomorrow"];
const PLACE_OPTIONS = [
  "street", "station", "harbor", "factory", "fairground",
  "diner", "cinema", "park", "rooftop", "market", "cathedral", "library",
];
const WEATHER_OPTIONS = ["clear", "hazy", "fog", "rain", "snow"];
const CROWD_OPTIONS = ["empty", "few people", "moderate", "busy"];
const LOCATION_OPTIONS = [
  "Tokyo", "Paris", "New York", "London", "Rome", "Cairo",
  "Istanbul", "Havana", "Marrakech", "Kyoto", "Vienna", "Buenos Aires",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildPrompt(params: Record<string, string>): string {
  const base =
    "Create a photorealistic equirectangular panorama image with perfect seam connection suitable for 360-degree spherical viewing. The left and right edges must connect seamlessly. The image should be in 2:1 equirectangular projection format.";

  const details = [
    `Location: ${params.location}`,
    `Time of day: ${params.timeOfDay}`,
    `Era/period: ${params.decade}`,
    `Setting: a ${params.placeType}`,
    `Weather: ${params.weather}`,
    `Crowd level: ${params.crowd}`,
  ].join(". ");

  return `${base}\n\n${details}.`;
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

  const resolved: Record<string, string> = {
    location: body.location || pick(LOCATION_OPTIONS),
    timeOfDay: body.timeOfDay || pick(TIME_OPTIONS),
    decade: body.decade || pick(DECADE_OPTIONS),
    placeType: body.placeType || pick(PLACE_OPTIONS),
    weather: body.weather || pick(WEATHER_OPTIONS),
    crowd: body.crowd || pick(CROWD_OPTIONS),
  };

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

    return NextResponse.json({
      image: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType,
      prompt,
      parameters: resolved,
    });
  } catch (e) {
    console.error("Gemini request failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
