import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const url =
    "https://query1.finance.yahoo.com/v8/finance/chart/DX-Y.NYB?range=60d&interval=15m";

  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();

  const result = json.chart?.result?.[0];

  if (!result) {
    return NextResponse.json({ error: "No DXY data" }, { status: 500 });
  }

  const timestamps = result.timestamp;
  const quote = result.indicators.quote[0];

  const rows = timestamps
    .map((t: number, i: number) => ({
      symbol: "DXY",
      timeframe: "15m",
      time: new Date(t * 1000).toISOString(),
      open: quote.open[i],
      high: quote.high[i],
      low: quote.low[i],
      close: quote.close[i],
      volume: quote.volume?.[i] ?? 0,
    }))
    .filter((r: any) => r.open && r.high && r.low && r.close);

  const { error } = await supabaseAdmin.from("candles").upsert(rows, {
    onConflict: "symbol,timeframe,time",
  });

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    symbol: "DXY",
    inserted: rows.length,
  });
}
