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

export async function POST(req: Request) {
  let body: {
    image: string;
    mimeType?: string;
    scene?: Record<string, string>;
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

  const scene = body.scene || {};
  const mimeType = body.mimeType || "image/jpeg";

  // Build a descriptive filename from scene params
  const slugParts: string[] = [];
  if (scene.location) slugParts.push(slugify(scene.location));
  if (scene.timeOfDay) slugParts.push(slugify(scene.timeOfDay));
  if (scene.decade) slugParts.push(slugify(scene.decade));
  if (scene.placeType) slugParts.push(slugify(scene.placeType));
  const slug = slugParts.length > 0 ? slugParts.join("-") : "photo";

  const ext = mimeType === "image/png" ? "png" : "jpg";
  const filename = `${slug}-${Date.now()}.${ext}`;
  const dir = path.join(process.cwd(), "public", "generated", "photos");

  try {
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, filename),
      Buffer.from(body.image, "base64")
    );
    console.log(`Saved photo: public/generated/photos/${filename}`);

    return NextResponse.json({
      savedPath: `/generated/photos/${filename}`,
    });
  } catch (e) {
    console.error("Failed to save photo:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
