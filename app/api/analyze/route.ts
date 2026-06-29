// app/api/analyze/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { addFeatures } from "@/lib/indicators";
import { mergeDxy } from "@/lib/mergeDxy";
import { predict } from "@/lib/model";
import { getBlockedReason } from "@/lib/tradeFilters";

const TP_MULTIPLIER = 1.6;
const SL_MULTIPLIER = 1.0;

async function fetchCandles(symbol: string, limit = 30000) {
  const pageSize = 1000;
  const allRows: any[] = [];

  for (let from = 0; from < limit; from += pageSize) {
    const to = Math.min(from + pageSize - 1, limit - 1);

    const { data, error } = await supabaseAdmin
      .from("candles")
      .select("*")
      .eq("symbol", symbol)
      .eq("timeframe", "15m")
      .order("time", { ascending: false })
      .range(from, to);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    allRows.push(...data);

    if (data.length < pageSize) {
      break;
    }
  }

  return allRows;
}

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
  let data: any[] = [];
  let dxyData: any[] = [];

  try {
    data = await fetchCandles("EURUSD", 30000);
    dxyData = await fetchCandles("DXY", 30000);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }

  const eurusd = addFeatures(mapRows(data));
  const dxy = addFeatures(mapRows(dxyData));
  const featured = mergeDxy(eurusd, dxy);

  const featuredWithDxy = featured.filter((c) => c.dxyClose !== undefined);

  if (!featuredWithDxy.length) {
    return NextResponse.json(
      {
        error: "No merged EURUSD/DXY candles",
        eurusdRawCandles: data.length,
        dxyRawCandles: dxyData.length,
        eurusdCandles: eurusd.length,
        dxyCandles: dxy.length,
      },
      { status: 500 },
    );
  }

  const current = featuredWithDxy[featuredWithDxy.length - 1];
  const prediction = predict(featuredWithDxy);

  const filterBlockedReason = getBlockedReason(
    current.time,
    prediction.direction,
    prediction.confidence,
    prediction.reason,
  );

  const allowedByFilters = filterBlockedReason === null;
  const isHighConfidence = prediction.confidence === "high";

  const allowedTrade = allowedByFilters && isHighConfidence;

  const signalMode = !allowedByFilters
    ? "no_trade"
    : isHighConfidence
      ? "trade"
      : "watch";

  const blockedReason = !allowedByFilters
    ? filterBlockedReason
    : !isHighConfidence
      ? "watch_medium_confidence"
      : null;

  const finalConfidence =
    signalMode === "trade" ? "high" : signalMode === "watch" ? "medium" : "low";

  return NextResponse.json({
    ...prediction,

    allowedTrade,
    signalMode,
    blockedReason,

    tpMultiplier: TP_MULTIPLIER,
    slMultiplier: SL_MULTIPLIER,

    historyFrom: featuredWithDxy[0]?.time,
    historyTo: featuredWithDxy[featuredWithDxy.length - 1]?.time,
    historyCandles: featuredWithDxy.length,
    eurusdCandles: eurusd.length,
    dxyCandles: dxy.length,
    dxyMergedCandles: featuredWithDxy.length,

    eurusdRawCandles: data.length,
    dxyRawCandles: dxyData.length,

    signalTime: current.time,
    signalHourUtc: new Date(current.time).getUTCHours(),

    dxyClose: current.dxyClose,
    dxyReturn1: current.dxyReturn1,
    dxyReturn4: current.dxyReturn4,
    dxyTrend: current.dxyTrend,

    finalConfidence,
  });
}
