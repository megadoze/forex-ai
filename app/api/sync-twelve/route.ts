import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const API_URL = "https://api.twelvedata.com/time_series";

const PAIRS = [
  "EUR/USD",
  "USD/JPY",
  "GBP/USD",
  "USD/CAD",
  "USD/SEK",
  "USD/CHF",
];

type TwelveCandle = {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume?: string;
};

type Candle = {
  symbol: string;
  timeframe: string;
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

function normalizeTime(datetime: string) {
  const date = new Date(`${datetime.replace(" ", "T")}Z`);

  date.setUTCSeconds(0, 0);

  const minutes = date.getUTCMinutes();
  date.setUTCMinutes(minutes - (minutes % 15));

  return date.toISOString();
}

function parseNumber(value: string | undefined) {
  if (!value) return 0;
  return Number(value);
}

async function fetchTwelveSeries(symbol: string, outputsize: number) {
  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    throw new Error("Missing TWELVE_DATA_API_KEY");
  }

  const url = new URL(API_URL);

  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", "15min");
  url.searchParams.set("outputsize", String(outputsize));
  url.searchParams.set("timezone", "UTC");
  url.searchParams.set("apikey", apiKey);

  const res = await fetch(url.toString(), {
    cache: "no-store",
  });

  const json = await res.json();

  if (!res.ok || json.status === "error" || !json.values) {
    throw new Error(`Twelve Data error for ${symbol}: ${JSON.stringify(json)}`);
  }

  return json.values as TwelveCandle[];
}

function toCandles(symbol: string, values: TwelveCandle[]): Candle[] {
  return values
    .map((v) => ({
      symbol,
      timeframe: "15m",
      time: normalizeTime(v.datetime),
      open: parseNumber(v.open),
      high: parseNumber(v.high),
      low: parseNumber(v.low),
      close: parseNumber(v.close),
      volume: parseNumber(v.volume),
    }))
    .filter((c) => c.open && c.high && c.low && c.close)
    .sort((a, b) => a.time.localeCompare(b.time));
}

function indexByTime(values: TwelveCandle[]) {
  const map = new Map<string, TwelveCandle>();

  for (const v of values) {
    map.set(normalizeTime(v.datetime), v);
  }

  return map;
}

/**
 * Synthetic DXY-style formula.
 *
 * Real DXY weights are approximately:
 * EUR 57.6%, JPY 13.6%, GBP 11.9%, CAD 9.1%, SEK 4.2%, CHF 3.6%.
 *
 * For pairs quoted as XXX/USD, we use negative exponent.
 * For pairs quoted as USD/XXX, we use positive exponent.
 */
function syntheticDxyClose(values: {
  eurusd: number;
  usdjpy: number;
  gbpusd: number;
  usdcad: number;
  usdsek: number;
  usdchf: number;
}) {
  return (
    50.14348112 *
    Math.pow(values.eurusd, -0.576) *
    Math.pow(values.usdjpy, 0.136) *
    Math.pow(values.gbpusd, -0.119) *
    Math.pow(values.usdcad, 0.091) *
    Math.pow(values.usdsek, 0.042) *
    Math.pow(values.usdchf, 0.036)
  );
}

function buildSyntheticDxy(series: Record<string, TwelveCandle[]>) {
  const eurusd = indexByTime(series["EUR/USD"]);
  const usdjpy = indexByTime(series["USD/JPY"]);
  const gbpusd = indexByTime(series["GBP/USD"]);
  const usdcad = indexByTime(series["USD/CAD"]);
  const usdsek = indexByTime(series["USD/SEK"]);
  const usdchf = indexByTime(series["USD/CHF"]);

  const commonTimes = [...eurusd.keys()].filter(
    (time) =>
      usdjpy.has(time) &&
      gbpusd.has(time) &&
      usdcad.has(time) &&
      usdsek.has(time) &&
      usdchf.has(time),
  );

  const rows: Candle[] = commonTimes.map((time) => {
    const e = eurusd.get(time)!;
    const j = usdjpy.get(time)!;
    const g = gbpusd.get(time)!;
    const c = usdcad.get(time)!;
    const s = usdsek.get(time)!;
    const ch = usdchf.get(time)!;

    const open = syntheticDxyClose({
      eurusd: parseNumber(e.open),
      usdjpy: parseNumber(j.open),
      gbpusd: parseNumber(g.open),
      usdcad: parseNumber(c.open),
      usdsek: parseNumber(s.open),
      usdchf: parseNumber(ch.open),
    });

    const high = syntheticDxyClose({
      eurusd: parseNumber(e.high),
      usdjpy: parseNumber(j.high),
      gbpusd: parseNumber(g.high),
      usdcad: parseNumber(c.high),
      usdsek: parseNumber(s.high),
      usdchf: parseNumber(ch.high),
    });

    const low = syntheticDxyClose({
      eurusd: parseNumber(e.low),
      usdjpy: parseNumber(j.low),
      gbpusd: parseNumber(g.low),
      usdcad: parseNumber(c.low),
      usdsek: parseNumber(s.low),
      usdchf: parseNumber(ch.low),
    });

    const close = syntheticDxyClose({
      eurusd: parseNumber(e.close),
      usdjpy: parseNumber(j.close),
      gbpusd: parseNumber(g.close),
      usdcad: parseNumber(c.close),
      usdsek: parseNumber(s.close),
      usdchf: parseNumber(ch.close),
    });

    return {
      symbol: "DXY",
      timeframe: "15m",
      time,
      open,
      high: Math.max(open, high, low, close),
      low: Math.min(open, high, low, close),
      close,
      volume: 0,
    };
  });

  return rows.sort((a, b) => a.time.localeCompare(b.time));
}

async function upsertRows(rows: Candle[]) {
  const batchSize = 1000;
  let imported = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);

    const { error } = await supabaseAdmin.from("candles").upsert(batch, {
      onConflict: "symbol,timeframe,time",
    });

    if (error) {
      throw error;
    }

    imported += batch.length;
  }

  return imported;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const secret = searchParams.get("secret")?.trim();
  const authHeader = req.headers.get("authorization")?.trim();

  const cronSecret = process.env.CRON_SECRET?.trim();

  const validSecret =
    !cronSecret ||
    secret === cronSecret ||
    authHeader === `Bearer ${cronSecret}`;

  if (!validSecret) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        hasCronSecret: Boolean(cronSecret),
        hasQuerySecret: Boolean(secret),
        hasAuthHeader: Boolean(authHeader),
      },
      { status: 401 },
    );
  }

  try {
    const outputsize = Number(searchParams.get("outputsize") ?? "5000");

    const series: Record<string, TwelveCandle[]> = {};

    for (const pair of PAIRS) {
      series[pair] = await fetchTwelveSeries(pair, outputsize);
    }

    const eurusdRows = toCandles("EURUSD", series["EUR/USD"]);
    const dxyRows = buildSyntheticDxy(series);

    const eurusdImported = await upsertRows(eurusdRows);
    const dxyImported = await upsertRows(dxyRows);

    return NextResponse.json({
      ok: true,
      source: "twelve-data",
      outputsize,

      pairs: PAIRS,

      eurusdImported,
      dxyImported,

      eurusdFrom: eurusdRows[0]?.time,
      eurusdTo: eurusdRows[eurusdRows.length - 1]?.time,

      dxyFrom: dxyRows[0]?.time,
      dxyTo: dxyRows[dxyRows.length - 1]?.time,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message ?? String(error),
      },
      { status: 500 },
    );
  }
}
