import { NextResponse } from "next/server";
import { readdir, readFile, unlink } from "fs/promises";
import path from "path";
import type { WorldEntry } from "@/lib/worldStore";

export async function GET() {
  const dir = path.join(process.cwd(), "public", "generated", "panos");

  try {
    const files = await readdir(dir);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));

    const worlds: WorldEntry[] = [];
    for (const file of jsonFiles) {
      try {
        const raw = await readFile(path.join(dir, file), "utf-8");
        const entry = JSON.parse(raw) as WorldEntry;
        worlds.push(entry);
      } catch {
        // skip malformed sidecars
      }
    }

    worlds.sort((a, b) => b.createdAt - a.createdAt);
    return NextResponse.json({ worlds });
  } catch {
    // Directory doesn't exist yet — no worlds saved
    return NextResponse.json({ worlds: [] });
  }
}

export async function DELETE(req: Request) {
  let panoPath: string;
  try {
    ({ panoPath } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Validate path is within generated/panos/
  if (!panoPath || !panoPath.startsWith("/generated/panos/")) {
    return NextResponse.json({ error: "Invalid panoPath" }, { status: 400 });
  }

  const filename = path.basename(panoPath);
  const dir = path.join(process.cwd(), "public", "generated", "panos");
  const jsonFilename = filename.replace(/\.(jpg|png)$/, ".json");

  const deleted: string[] = [];
  for (const file of [filename, jsonFilename]) {
    try {
      await unlink(path.join(dir, file));
      deleted.push(file);
    } catch {
      // File may already be gone — not an error
    }
  }

  return NextResponse.json({ deleted });
}
