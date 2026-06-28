import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const range = searchParams.get("range") ?? "60d";
  const interval = searchParams.get("interval") ?? "15m";

  if (interval === "15m" && range !== "60d") {
    return NextResponse.json(
      {
        error: "Yahoo only supports 15m data within the last 60 days",
        allowed: "?range=60d&interval=15m",
      },
      { status: 400 },
    );
  }

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/EURUSD=X?range=${range}&interval=${interval}`;

  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();

  const result = json.chart?.result?.[0];

  if (!result) {
    return NextResponse.json(
      {
        error: "No EURUSD data",
        yahooError: json.chart?.error ?? null,
        url,
      },
      { status: 500 },
    );
  }

  const timestamps = result.timestamp;
  const quote = result.indicators.quote[0];

  const rows = timestamps
    .map((t: number, i: number) => ({
      symbol: "EURUSD",
      timeframe: interval,
      time: new Date(t * 1000).toISOString(),
      open: quote.open[i],
      high: quote.high[i],
      low: quote.low[i],
      close: quote.close[i],
      volume: quote.volume?.[i] ?? 0,
    }))
    .filter((r: any) => r.open && r.high && r.low && r.close);

  const batchSize = 1000;
  let imported = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);

    const { error } = await supabaseAdmin.from("candles").upsert(batch, {
      onConflict: "symbol,timeframe,time",
    });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    imported += batch.length;
  }

  return NextResponse.json({
    ok: true,
    symbol: "EURUSD",
    range,
    interval,
    imported,
    from: rows[0]?.time,
    to: rows[rows.length - 1]?.time,
  });
}
