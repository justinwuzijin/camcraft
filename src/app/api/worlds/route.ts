import { NextResponse } from "next/server";
import { readdir, readFile } from "fs/promises";
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
