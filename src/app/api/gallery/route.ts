import { NextResponse } from "next/server";
import { readdir, stat } from "fs/promises";
import path from "path";

type ImageEntry = {
  filename: string;
  path: string;
  createdAt: number;
};

async function scanDir(dir: string, urlPrefix: string): Promise<ImageEntry[]> {
  try {
    const files = await readdir(dir);
    const imageFiles = files.filter((f) =>
      /\.(jpg|jpeg|png|webp)$/i.test(f)
    );

    return await Promise.all(
      imageFiles.map(async (filename) => {
        const filePath = path.join(dir, filename);
        const stats = await stat(filePath);
        return {
          filename,
          path: `${urlPrefix}/${filename}`,
          createdAt: stats.mtimeMs,
        };
      })
    );
  } catch {
    return [];
  }
}

export async function GET() {
  const baseDir = path.join(process.cwd(), "public", "generated");

  const [photos, legacyFocus] = await Promise.all([
    scanDir(path.join(baseDir, "photos"), "/generated/photos"),
    // Also scan legacy root folder for old focus_ files
    scanDir(baseDir, "/generated").then((entries) =>
      entries.filter((e) => e.filename.startsWith("focus_"))
    ),
  ]);

  const all = [...photos, ...legacyFocus];
  all.sort((a, b) => b.createdAt - a.createdAt);

  return NextResponse.json({ images: all });
}
