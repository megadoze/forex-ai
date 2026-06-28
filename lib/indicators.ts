import {
  EMA,
  RSI,
  ATR,
  MACD,
  BollingerBands,
  CCI,
  WilliamsR,
  ROC,
} from "technicalindicators";

export type Candle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type FeaturedCandle = Candle & {
  ema20: number;
  ema50: number;
  ema100: number;
  ema200: number;

  ema20Slope: number;
  ema50Slope: number;
  ema100Slope: number;
  ema200Slope: number;

  distEma20: number;
  distEma50: number;
  distEma100: number;
  distEma200: number;

  rsi7: number;
  rsi14: number;
  rsi28: number;

  atr14: number;
  atrPercent: number;

  roc5: number;
  roc10: number;

  momentum5: number;
  momentum10: number;

  cci20: number;
  williamsR14: number;

  macd: number;
  macdSignal: number;
  macdHist: number;
  macdSlope: number;

  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  bbWidth: number;
  bbDistUpper: number;
  bbDistLower: number;

  body: number;
  range: number;
  upperWick: number;
  lowerWick: number;
  bodyAtr: number;
  rangeAtr: number;

  bullCandle: number;
  bearCandle: number;
  insideBar: number;
  outsideBar: number;

  highest20: number;
  lowest20: number;
  distHigh20: number;
  distLow20: number;
  breakout20: number;

  trend: number;

  hour: number;
  dayOfWeek: number;
  london: number;
  newYork: number;
  asia: number;
  overlap: number;

  dxyClose?: number;
  dxyReturn1?: number;
  dxyReturn4?: number;
  dxyTrend?: number;
  dxyDistanceEma20?: number;

  return1: number;
  return2: number;
  return4: number;
  return8: number;
  return16: number;

  impulse4: number;
  impulse8: number;
  impulse16: number;
  impulse32: number;

  bullCount5: number;
  bearCount5: number;
  bullCount10: number;
  bearCount10: number;

  highest50: number;
  lowest50: number;
  distHigh50: number;
  distLow50: number;

  rangeAvg10: number;
  rangeAvg20: number;
  rangeCompression: number;
};

function safe(value: number | undefined | null, fallback = 0) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function rollingHighest(values: number[], period: number, index: number) {
  const start = Math.max(0, index - period + 1);
  return Math.max(...values.slice(start, index + 1));
}

function rollingLowest(values: number[], period: number, index: number) {
  const start = Math.max(0, index - period + 1);
  return Math.min(...values.slice(start, index + 1));
}

export function addFeatures(candles: Candle[]): FeaturedCandle[] {
  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);

  const ema20 = EMA.calculate({ period: 20, values: closes });
  const ema50 = EMA.calculate({ period: 50, values: closes });
  const ema100 = EMA.calculate({ period: 100, values: closes });
  const ema200 = EMA.calculate({ period: 200, values: closes });

  const rsi7 = RSI.calculate({ period: 7, values: closes });
  const rsi14 = RSI.calculate({ period: 14, values: closes });
  const rsi28 = RSI.calculate({ period: 28, values: closes });

  const atr14 = ATR.calculate({
    period: 14,
    high: highs,
    low: lows,
    close: closes,
  });

  const roc5 = ROC.calculate({ period: 5, values: closes });
  const roc10 = ROC.calculate({ period: 10, values: closes });

  const cci20 = CCI.calculate({
    period: 20,
    high: highs,
    low: lows,
    close: closes,
  });
  const williamsR14 = WilliamsR.calculate({
    period: 14,
    high: highs,
    low: lows,
    close: closes,
  });

  const macdValues = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });

  const bbValues = BollingerBands.calculate({
    period: 20,
    stdDev: 2,
    values: closes,
  });

  const start = 220;

  return candles.slice(start).map((c, i) => {
    const idx = i + start;

    const e20 = safe(ema20[idx - 20], c.close);
    const e50 = safe(ema50[idx - 50], c.close);
    const e100 = safe(ema100[idx - 100], c.close);
    const e200 = safe(ema200[idx - 200], c.close);

    const prevE20 = safe(ema20[idx - 21], e20);
    const prevE50 = safe(ema50[idx - 51], e50);
    const prevE100 = safe(ema100[idx - 101], e100);
    const prevE200 = safe(ema200[idx - 201], e200);

    const atr = safe(atr14[idx - 14], 0.0001);

    const macd = macdValues[idx - 33] ?? { MACD: 0, signal: 0, histogram: 0 };
    const prevMacd = macdValues[idx - 34] ?? macd;

    const bb = bbValues[idx - 20] ?? {
      upper: c.close,
      middle: c.close,
      lower: c.close,
    };

    const highest20 = rollingHighest(highs, 20, idx);
    const lowest20 = rollingLowest(lows, 20, idx);

    const body = Math.abs(c.close - c.open);
    const range = c.high - c.low;

    const upperWick = c.high - Math.max(c.open, c.close);
    const lowerWick = Math.min(c.open, c.close) - c.low;

    const prev = candles[idx - 1];

    const hour = new Date(c.time).getUTCHours();
    const dayOfWeek = new Date(c.time).getUTCDay();

    const return1 = (c.close - candles[idx - 1].close) / atr;
    const return2 = (c.close - candles[idx - 2].close) / atr;
    const return4 = (c.close - candles[idx - 4].close) / atr;
    const return8 = (c.close - candles[idx - 8].close) / atr;
    const return16 = (c.close - candles[idx - 16].close) / atr;

    const impulse4 = (c.close - candles[idx - 4].open) / atr;
    const impulse8 = (c.close - candles[idx - 8].open) / atr;
    const impulse16 = (c.close - candles[idx - 16].open) / atr;
    const impulse32 = (c.close - candles[idx - 32].open) / atr;

    const last5 = candles.slice(idx - 5, idx);
    const last10 = candles.slice(idx - 10, idx);

    const bullCount5 = last5.filter((x) => x.close > x.open).length;
    const bearCount5 = last5.filter((x) => x.close < x.open).length;

    const bullCount10 = last10.filter((x) => x.close > x.open).length;
    const bearCount10 = last10.filter((x) => x.close < x.open).length;

    const highest50 = rollingHighest(highs, 50, idx);
    const lowest50 = rollingLowest(lows, 50, idx);

    const last10Ranges = candles
      .slice(idx - 10, idx)
      .map((x) => x.high - x.low);

    const last20Ranges = candles
      .slice(idx - 20, idx)
      .map((x) => x.high - x.low);

    const rangeAvg10 =
      last10Ranges.reduce((sum, x) => sum + x, 0) / last10Ranges.length;

    const rangeAvg20 =
      last20Ranges.reduce((sum, x) => sum + x, 0) / last20Ranges.length;

    const rangeCompression = rangeAvg20 > 0 ? rangeAvg10 / rangeAvg20 : 1;

    return {
      ...c,

      ema20: e20,
      ema50: e50,
      ema100: e100,
      ema200: e200,

      ema20Slope: (e20 - prevE20) / atr,
      ema50Slope: (e50 - prevE50) / atr,
      ema100Slope: (e100 - prevE100) / atr,
      ema200Slope: (e200 - prevE200) / atr,

      distEma20: (c.close - e20) / atr,
      distEma50: (c.close - e50) / atr,
      distEma100: (c.close - e100) / atr,
      distEma200: (c.close - e200) / atr,

      rsi7: safe(rsi7[idx - 7], 50),
      rsi14: safe(rsi14[idx - 14], 50),
      rsi28: safe(rsi28[idx - 28], 50),

      atr14: atr,
      atrPercent: atr / c.close,

      roc5: safe(roc5[idx - 5], 0),
      roc10: safe(roc10[idx - 10], 0),

      momentum5: (c.close - candles[idx - 5].close) / atr,
      momentum10: (c.close - candles[idx - 10].close) / atr,

      cci20: safe(cci20[idx - 20], 0),
      williamsR14: safe(williamsR14[idx - 14], -50),

      macd: safe(macd.MACD, 0),
      macdSignal: safe(macd.signal, 0),
      macdHist: safe(macd.histogram, 0),
      macdSlope: safe((macd.MACD ?? 0) - (prevMacd.MACD ?? 0), 0),

      bbUpper: bb.upper,
      bbMiddle: bb.middle,
      bbLower: bb.lower,
      bbWidth: (bb.upper - bb.lower) / atr,
      bbDistUpper: (bb.upper - c.close) / atr,
      bbDistLower: (c.close - bb.lower) / atr,

      body,
      range,
      upperWick,
      lowerWick,
      bodyAtr: body / atr,
      rangeAtr: range / atr,

      bullCandle: c.close > c.open ? 1 : 0,
      bearCandle: c.close < c.open ? 1 : 0,

      insideBar: prev && c.high < prev.high && c.low > prev.low ? 1 : 0,
      outsideBar: prev && c.high > prev.high && c.low < prev.low ? 1 : 0,

      highest20,
      lowest20,
      distHigh20: (highest20 - c.close) / atr,
      distLow20: (c.close - lowest20) / atr,
      breakout20: c.close > highest20 ? 1 : c.close < lowest20 ? -1 : 0,

      trend: c.close > e200 ? 1 : -1,

      hour,
      dayOfWeek,
      london: hour >= 7 && hour <= 11 ? 1 : 0,
      newYork: hour >= 13 && hour <= 17 ? 1 : 0,
      asia: hour >= 0 && hour <= 6 ? 1 : 0,
      overlap: hour >= 13 && hour <= 16 ? 1 : 0,

      return1,
      return2,
      return4,
      return8,
      return16,

      impulse4,
      impulse8,
      impulse16,
      impulse32,

      bullCount5,
      bearCount5,
      bullCount10,
      bearCount10,

      highest50,
      lowest50,
      distHigh50: (highest50 - c.close) / atr,
      distLow50: (c.close - lowest50) / atr,

      rangeAvg10,
      rangeAvg20,
      rangeCompression,
    };
  });
}
