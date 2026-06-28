// app/api/analyze/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { addFeatures } from "@/lib/indicators";
import { mergeDxy } from "@/lib/mergeDxy";
import { predict } from "@/lib/model";
import { getBlockedReason } from "@/lib/tradeFilters";

function mapRows(rows: any[]) {
  return rows
    .map((c) => ({
      time: c.time,
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
      volume: Number(c.volume ?? 0),
    }))
    .reverse();
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("candles")
    .select("*")
    .eq("symbol", "EURUSD")
    .eq("timeframe", "15m")
    .order("time", { ascending: false })
    .limit(6000);

  if (error || !data) {
    return NextResponse.json({ error }, { status: 500 });
  }

  const { data: dxyData, error: dxyError } = await supabaseAdmin
    .from("candles")
    .select("*")
    .eq("symbol", "DXY")
    .eq("timeframe", "15m")
    .order("time", { ascending: false })
    .limit(6000);

  if (dxyError || !dxyData) {
    return NextResponse.json({ error: dxyError }, { status: 500 });
  }

  const eurusd = addFeatures(mapRows(data));
  const dxy = addFeatures(mapRows(dxyData));
  const featured = mergeDxy(eurusd, dxy);

  const current = featured[featured.length - 1];
  const prediction = predict(featured);

  const blockedReason = getBlockedReason(
    current.time,
    prediction.direction,
    prediction.confidence,
    prediction.reason,
  );

  const allowedTrade = blockedReason === null;

  return NextResponse.json({
    ...prediction,

    allowedTrade,
    blockedReason,

    signalTime: current.time,
    signalHourUtc: new Date(current.time).getUTCHours(),

    dxyClose: current.dxyClose,
    dxyReturn1: current.dxyReturn1,
    dxyReturn4: current.dxyReturn4,
    dxyTrend: current.dxyTrend,

    finalConfidence: allowedTrade ? prediction.confidence : "low",
  });
}
