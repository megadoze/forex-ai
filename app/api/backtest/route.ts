// app/api/backtest/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { addFeatures } from "@/lib/indicators";
import { mergeDxy } from "@/lib/mergeDxy";
import { predict, Direction } from "@/lib/model";
import { isAllowedTrade } from "@/lib/tradeFilters";

const LOOKAHEAD = 32;
const BATCH_SIZE = 1000;

type SimpleStats = {
  signals: number;
  wins: number;
  losses: number;
  pips: number;
  winRate: number;
  avgPips: number;
};

function createSimpleStats(): SimpleStats {
  return {
    signals: 0,
    wins: 0,
    losses: 0,
    pips: 0,
    winRate: 0,
    avgPips: 0,
  };
}

function addSimpleTrade(
  stats: SimpleStats,
  result: "win" | "loss",
  pips: number,
) {
  stats.signals++;

  if (result === "win") {
    stats.wins++;
  } else {
    stats.losses++;
  }

  stats.pips += pips;
  stats.winRate = stats.signals ? stats.wins / stats.signals : 0;
  stats.avgPips = stats.signals ? stats.pips / stats.signals : 0;
}

function matchBucket(matches: number) {
  if (matches <= 1) return "0-1";
  if (matches <= 3) return "2-3";
  if (matches <= 7) return "4-7";
  if (matches <= 15) return "8-15";
  return "16+";
}

type TradeResult = {
  result: "win" | "loss";
  pips: number;
  exitIndex: number;
};

function tradeResult(
  data: any[],
  index: number,
  direction: Direction,
): TradeResult | null {
  const entry = data[index].close;
  const atr = data[index].atr14;

  if (!atr || atr <= 0) return null;

  const tp = atr * 1.2;
  const sl = atr * 1.0;

  for (let i = index + 1; i <= index + LOOKAHEAD; i++) {
    const c = data[i];
    if (!c) return null;

    if (direction === "up") {
      if (c.high >= entry + tp)
        return { result: "win", pips: tp * 10000, exitIndex: i };
      if (c.low <= entry - sl)
        return { result: "loss", pips: -sl * 10000, exitIndex: i };
    }

    if (direction === "down") {
      if (c.low <= entry - tp)
        return { result: "win", pips: tp * 10000, exitIndex: i };
      if (c.high >= entry + sl)
        return { result: "loss", pips: -sl * 10000, exitIndex: i };
    }
  }

  return null;
}

async function loadAllCandles(symbol: string) {
  let allRows: any[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from("candles")
      .select("*")
      .eq("symbol", symbol)
      .eq("timeframe", "15m")
      .order("time", { ascending: false })
      .range(from, from + BATCH_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    allRows = allRows.concat(data);
    if (data.length < BATCH_SIZE) break;

    from += BATCH_SIZE;
  }

  return allRows
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

function finalize(s: any) {
  return {
    ...s,
    winRate: s.signals ? s.wins / s.signals : 0,
    avgPips: s.signals ? s.pips / s.signals : 0,
  };
}

export async function GET() {
  try {
    const eurusdCandles = await loadAllCandles("EURUSD");
    const dxyCandles = await loadAllCandles("DXY");

    const eurusd = addFeatures(eurusdCandles);
    const dxy = addFeatures(dxyCandles);
    const featured = mergeDxy(eurusd, dxy);

    const dxyMergedCandles = featured.filter(
      (c) => c.dxyClose !== undefined,
    ).length;

    const stats = {
      total: {
        signals: 0,
        wins: 0,
        losses: 0,
        pips: 0,
        upSignals: 0,
        downSignals: 0,
      },
      medium: { signals: 0, wins: 0, losses: 0, pips: 0 },
      high: { signals: 0, wins: 0, losses: 0, pips: 0 },
    };

    const inverse = { signals: 0, wins: 0, losses: 0, pips: 0 };
    const trades = [];

    const byMatches: Record<string, SimpleStats> = {
      "0-1": createSimpleStats(),
      "2-3": createSimpleStats(),
      "4-7": createSimpleStats(),
      "8-15": createSimpleStats(),
      "16+": createSimpleStats(),
    };

    const byConfidenceAndMatches: Record<string, SimpleStats> = {
      "medium_0-1": createSimpleStats(),
      "medium_2-3": createSimpleStats(),
      "medium_4-7": createSimpleStats(),
      "medium_8-15": createSimpleStats(),
      "medium_16+": createSimpleStats(),

      "high_0-1": createSimpleStats(),
      "high_2-3": createSimpleStats(),
      "high_4-7": createSimpleStats(),
      "high_8-15": createSimpleStats(),
      "high_16+": createSimpleStats(),
    };

    let i = 400;

    const byHour: Record<string, SimpleStats> = {};
    const byHourDirection: Record<string, SimpleStats> = {};

    for (let h = 0; h < 24; h++) {
      byHour[String(h)] = createSimpleStats();

      byHourDirection[`${h}_up`] = createSimpleStats();
      byHourDirection[`${h}_down`] = createSimpleStats();
    }

    while (i < featured.length - LOOKAHEAD) {
      const prediction = predict(featured, i);

      if (
        !isAllowedTrade(
          featured[i].time,
          prediction.direction,
          prediction.confidence,
          prediction.reason,
        )
      ) {
        i++;
        continue;
      }

      const result = tradeResult(featured, i, prediction.direction);

      const inverseDirection: Direction =
        prediction.direction === "up" ? "down" : "up";
      const inverseResult = tradeResult(featured, i, inverseDirection);

      if (inverseResult) {
        inverse.signals++;
        if (inverseResult.result === "win") inverse.wins++;
        else inverse.losses++;
        inverse.pips += inverseResult.pips;
      }

      if (!result) {
        i++;
        continue;
      }

      const bucket = prediction.confidence as "medium" | "high";

      stats.total.signals++;
      if (prediction.direction === "up") stats.total.upSignals++;
      if (prediction.direction === "down") stats.total.downSignals++;

      stats[bucket].signals++;

      if (result.result === "win") {
        stats.total.wins++;
        stats[bucket].wins++;
      } else {
        stats.total.losses++;
        stats[bucket].losses++;
      }

      stats.total.pips += result.pips;
      stats[bucket].pips += result.pips;

      const matchesBucket = matchBucket(prediction.matches);

      const hour = new Date(featured[i].time).getUTCHours();

      addSimpleTrade(byHour[String(hour)], result.result, result.pips);

      const hourDirectionKey = `${hour}_${prediction.direction}`;
      addSimpleTrade(
        byHourDirection[hourDirectionKey],
        result.result,
        result.pips,
      );

      addSimpleTrade(byMatches[matchesBucket], result.result, result.pips);

      const confidenceMatchesBucket = `${prediction.confidence}_${matchesBucket}`;

      if (byConfidenceAndMatches[confidenceMatchesBucket]) {
        addSimpleTrade(
          byConfidenceAndMatches[confidenceMatchesBucket],
          result.result,
          result.pips,
        );
      }

      trades.push({
        time: featured[i].time,
        direction: prediction.direction,
        rawDirection: prediction.rawDirection,
        probabilityUp: prediction.probabilityUp,
        probabilityDown: prediction.probabilityDown,
        confidence: prediction.confidence,
        matches: prediction.matches,
        result: result.result,
        pips: result.pips,
        upMatches: prediction.upMatches,
        downMatches: prediction.downMatches,
        dxyClose: featured[i].dxyClose,
        dxyReturn1: featured[i].dxyReturn1,
        dxyReturn4: featured[i].dxyReturn4,
        dxyTrend: featured[i].dxyTrend,
      });

      i = result.exitIndex + 1;
    }

    return NextResponse.json({
      eurusdRawCandles: eurusdCandles.length,
      dxyRawCandles: dxyCandles.length,
      totalCandles: featured.length,
      dxyMergedCandles,

      total: finalize(stats.total),
      medium: finalize(stats.medium),
      high: finalize(stats.high),

      byMatches,
      byConfidenceAndMatches,
      byHour,
      byHourDirection,

      lastTrades: trades.slice(-30),
      inverse: finalize(inverse),
    });
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}
