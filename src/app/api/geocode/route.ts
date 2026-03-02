import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query || query.length < 2) {
    return NextResponse.json({ features: [] });
  }

  const token = process.env.MAPBOX_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Mapbox token not configured" }, { status: 500 });
  }

  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
    new URLSearchParams({
      access_token: token,
      types: "place",
      autocomplete: "true",
      limit: "5",
    });

  const res = await fetch(url);
  if (!res.ok) {
    return NextResponse.json({ error: "Mapbox request failed" }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
