import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const origin = new URL(req.url).origin;

  const endpoints = [
    `${origin}/api/sync-yahoo?range=60d&interval=15m`,
    `${origin}/api/sync-dxy?range=60d&interval=15m`,
  ];

  const results = await Promise.all(
    endpoints.map(async (url) => {
      const res = await fetch(url, { cache: "no-store" });

      let body: any = null;

      try {
        body = await res.json();
      } catch {
        body = await res.text();
      }

      return {
        url,
        status: res.status,
        ok: res.ok,
        body,
      };
    }),
  );

  const ok = results.every((r) => r.ok);

  return NextResponse.json({
    ok,
    syncedAt: new Date().toISOString(),
    results,
  });
}
