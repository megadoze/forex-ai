// app/api/sync/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DB_TIMEFRAME = "15m";
const TWELVE_INTERVAL = "15min";

const DEFAULT_OUTPUTSIZE = 5000;
const UPSERT_BATCH_SIZE = 1000;

const DXY_COMPONENTS = [
  "EUR/USD",
  "USD/JPY",
  "GBP/USD",
  "USD/CAD",
  "USD/SEK",
  "USD/CHF",
] as const;

type DxyPair = (typeof DXY_COMPONENTS)[number];

type MarketCandle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type DbCandle = {
  symbol: string;
  timeframe: string;
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseOutputSize(value: string | null) {
  const n = Number(value);

  if (!Number.isFinite(n)) return DEFAULT_OUTPUTSIZE;

  return Math.max(1, Math.min(5000, Math.floor(n)));
}

function normalizeTwelveTime(datetime: string) {
  const normalized = datetime.includes("T")
    ? datetime
    : datetime.replace(" ", "T");

  if (normalized.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(normalized)) {
    return normalized;
  }

  return `${normalized}+00:00`;
}

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseTwelveCandle(value: any): MarketCandle | null {
  const open = toNumber(value.open);
  const high = toNumber(value.high);
  const low = toNumber(value.low);
  const close = toNumber(value.close);
  const volume = toNumber(value.volume ?? 0);

  if (
    open === null ||
    high === null ||
    low === null ||
    close === null ||
    volume === null ||
    !value.datetime
  ) {
    return null;
  }

  return {
    time: normalizeTwelveTime(value.datetime),
    open,
    high,
    low,
    close,
    volume,
  };
}

async function fetchTwelveSeries(
  symbol: DxyPair,
  outputsize: number,
  apiKey: string,
): Promise<MarketCandle[]> {
  const params = new URLSearchParams({
    symbol,
    interval: TWELVE_INTERVAL,
    outputsize: String(outputsize),
    timezone: "UTC",
    apikey: apiKey,
  });

  const url = `https://api.twelvedata.com/time_series?${params.toString()}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    const json = await res.json();

    if (!res.ok || json.status === "error") {
      const isRateLimited = res.status === 429 || json.code === 429;

      if (isRateLimited && attempt === 0) {
        await sleep(65_000);
        continue;
      }

      throw new Error(
        `Twelve Data error for ${symbol}: ${JSON.stringify(json).slice(
          0,
          500,
        )}`,
      );
    }

    if (!Array.isArray(json.values)) {
      throw new Error(`No Twelve Data values for ${symbol}`);
    }

    return json.values
      .map(parseTwelveCandle)
      .filter((c: MarketCandle | null): c is MarketCandle => c !== null)
      .sort(
        (a: MarketCandle, b: MarketCandle) =>
          new Date(a.time).getTime() - new Date(b.time).getTime(),
      );
  }

  throw new Error(`Failed to fetch ${symbol}`);
}

function syntheticDxy(
  eurusd: number,
  usdjpy: number,
  gbpusd: number,
  usdcad: number,
  usdsek: number,
  usdchf: number,
) {
  return (
    50.14348112 *
    Math.pow(eurusd, -0.576) *
    Math.pow(usdjpy, 0.136) *
    Math.pow(gbpusd, -0.119) *
    Math.pow(usdcad, 0.091) *
    Math.pow(usdsek, 0.042) *
    Math.pow(usdchf, 0.036)
  );
}

function buildSyntheticDxy(
  components: Record<DxyPair, MarketCandle[]>,
): MarketCandle[] {
  const maps = {} as Record<DxyPair, Map<string, MarketCandle>>;

  for (const pair of DXY_COMPONENTS) {
    maps[pair] = new Map(components[pair].map((c) => [c.time, c]));
  }

  const times = Array.from(maps["EUR/USD"].keys()).sort();

  const result: MarketCandle[] = [];

  for (const time of times) {
    const eurusd = maps["EUR/USD"].get(time);
    const usdjpy = maps["USD/JPY"].get(time);
    const gbpusd = maps["GBP/USD"].get(time);
    const usdcad = maps["USD/CAD"].get(time);
    const usdsek = maps["USD/SEK"].get(time);
    const usdchf = maps["USD/CHF"].get(time);

    if (!eurusd || !usdjpy || !gbpusd || !usdcad || !usdsek || !usdchf) {
      continue;
    }

    const open = syntheticDxy(
      eurusd.open,
      usdjpy.open,
      gbpusd.open,
      usdcad.open,
      usdsek.open,
      usdchf.open,
    );

    const close = syntheticDxy(
      eurusd.close,
      usdjpy.close,
      gbpusd.close,
      usdcad.close,
      usdsek.close,
      usdchf.close,
    );

    const high = syntheticDxy(
      eurusd.low,
      usdjpy.high,
      gbpusd.low,
      usdcad.high,
      usdsek.high,
      usdchf.high,
    );

    const low = syntheticDxy(
      eurusd.high,
      usdjpy.low,
      gbpusd.high,
      usdcad.low,
      usdsek.low,
      usdchf.low,
    );

    if (
      !Number.isFinite(open) ||
      !Number.isFinite(high) ||
      !Number.isFinite(low) ||
      !Number.isFinite(close)
    ) {
      continue;
    }

    result.push({
      time,
      open,
      high,
      low,
      close,
      volume: 0,
    });
  }

  return result;
}

function toDbRows(symbol: string, candles: MarketCandle[]): DbCandle[] {
  return candles.map((c) => ({
    symbol,
    timeframe: DB_TIMEFRAME,
    time: c.time,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume ?? 0,
  }));
}

async function upsertCandles(rows: DbCandle[]) {
  for (let i = 0; i < rows.length; i += UPSERT_BATCH_SIZE) {
    const chunk = rows.slice(i, i + UPSERT_BATCH_SIZE);

    const { error } = await supabaseAdmin.from("candles").upsert(chunk, {
      onConflict: "symbol,timeframe,time",
    });

    if (error) {
      throw error;
    }
  }
}

function getAuthToken(req: Request) {
  const header = req.headers.get("authorization") ?? "";

  if (!header.startsWith("Bearer ")) {
    return null;
  }

  return header.replace("Bearer ", "").trim();
}

export async function GET(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const twelveApiKey = process.env.TWELVE_DATA_API_KEY;

    if (!cronSecret) {
      return NextResponse.json(
        { error: "CRON_SECRET is not configured" },
        { status: 500 },
      );
    }

    if (!twelveApiKey) {
      return NextResponse.json(
        { error: "TWELVE_DATA_API_KEY is not configured" },
        { status: 500 },
      );
    }

    const token = getAuthToken(req);

    if (token !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const outputsize = parseOutputSize(searchParams.get("outputsize"));

    const components = {} as Record<DxyPair, MarketCandle[]>;

    for (const pair of DXY_COMPONENTS) {
      components[pair] = await fetchTwelveSeries(
        pair,
        outputsize,
        twelveApiKey,
      );

      await sleep(500);
    }

    const eurusdCandles = components["EUR/USD"];
    const syntheticDxyCandles = buildSyntheticDxy(components);

    const eurusdRows = toDbRows("EURUSD", eurusdCandles);
    const dxyRows = toDbRows("DXY", syntheticDxyCandles);

    await upsertCandles(eurusdRows);
    await upsertCandles(dxyRows);

    return NextResponse.json({
      ok: true,
      source: "twelve_data",
      timeframe: DB_TIMEFRAME,
      twelveInterval: TWELVE_INTERVAL,
      outputsize,

      fetched: {
        components: DXY_COMPONENTS.reduce(
          (acc, pair) => {
            acc[pair] = components[pair].length;
            return acc;
          },
          {} as Record<string, number>,
        ),
      },

      upserted: {
        EURUSD: eurusdRows.length,
        DXY: dxyRows.length,
      },

      eurusdFrom: eurusdRows[0]?.time,
      eurusdTo: eurusdRows[eurusdRows.length - 1]?.time,

      dxyFrom: dxyRows[0]?.time,
      dxyTo: dxyRows[dxyRows.length - 1]?.time,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
