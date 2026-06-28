// lib/model.ts
import { FeaturedCandle } from "./indicators";

export type Direction = "up" | "down";

const LOOKAHEAD = 32;

function isTradingSession(time: string) {
  const hour = new Date(time).getUTCHours();
  return hour >= 7 && hour <= 17;
}

function distance(a: FeaturedCandle, b: FeaturedCandle) {
  const trend =
    Math.abs(a.distEma20 - b.distEma20) +
    Math.abs(a.distEma50 - b.distEma50) +
    Math.abs(a.distEma100 - b.distEma100) +
    Math.abs(a.distEma200 - b.distEma200) +
    Math.abs(a.ema20Slope - b.ema20Slope) +
    Math.abs(a.ema50Slope - b.ema50Slope);

  const momentum =
    Math.abs(a.rsi7 - b.rsi7) / 100 +
    Math.abs(a.rsi14 - b.rsi14) / 100 +
    Math.abs(a.rsi28 - b.rsi28) / 100 +
    Math.abs(a.roc5 - b.roc5) +
    Math.abs(a.roc10 - b.roc10) +
    Math.abs(a.macdHist - b.macdHist);

  const volatility =
    Math.abs(a.atrPercent - b.atrPercent) +
    Math.abs(a.bodyAtr - b.bodyAtr) +
    Math.abs(a.rangeAtr - b.rangeAtr);

  const structure =
    Math.abs(a.distHigh20 - b.distHigh20) +
    Math.abs(a.distLow20 - b.distLow20) +
    Math.abs(a.breakout20 - b.breakout20);

  const context =
    Math.abs(a.return1 - b.return1) +
    Math.abs(a.return2 - b.return2) +
    Math.abs(a.return4 - b.return4) +
    Math.abs(a.return8 - b.return8) +
    Math.abs(a.return16 - b.return16) +
    Math.abs(a.impulse4 - b.impulse4) +
    Math.abs(a.impulse8 - b.impulse8) +
    Math.abs(a.impulse16 - b.impulse16) +
    Math.abs(a.impulse32 - b.impulse32) +
    Math.abs(a.bullCount5 - b.bullCount5) / 5 +
    Math.abs(a.bearCount5 - b.bearCount5) / 5 +
    Math.abs(a.bullCount10 - b.bullCount10) / 10 +
    Math.abs(a.bearCount10 - b.bearCount10) / 10 +
    Math.abs(a.distHigh50 - b.distHigh50) +
    Math.abs(a.distLow50 - b.distLow50) +
    Math.abs(a.rangeCompression - b.rangeCompression);

  const session =
    Math.abs(a.hour - b.hour) / 24 + Math.abs(a.dayOfWeek - b.dayOfWeek) / 7;

  const dxy =
    Math.abs((a.dxyReturn1 ?? 0) - (b.dxyReturn1 ?? 0)) +
    Math.abs((a.dxyReturn4 ?? 0) - (b.dxyReturn4 ?? 0)) +
    Math.abs((a.dxyTrend ?? 0) - (b.dxyTrend ?? 0));

  return (
    trend * 0.28 +
    momentum * 0.2 +
    volatility * 0.12 +
    structure * 0.12 +
    context * 0.18 +
    session * 0.05 +
    dxy * 0.05
  );
}

function firstDirectionalHit(data: FeaturedCandle[], index: number) {
  const entry = data[index].close;
  const atr = data[index].atr14;

  if (!atr || atr <= 0) return null;

  const tpUp = entry + atr * 1.2;
  const tpDown = entry - atr * 1.2;

  for (let i = index + 1; i <= index + LOOKAHEAD; i++) {
    const c = data[i];
    if (!c) return null;

    const hitUp = c.high >= tpUp;
    const hitDown = c.low <= tpDown;

    if (hitUp && !hitDown) return "up";
    if (hitDown && !hitUp) return "down";

    if (hitUp && hitDown) return null; // неоднозначная свеча
  }

  return null;
}

export function predict(
  data: FeaturedCandle[],
  currentIndex = data.length - 1,
) {
  const current = data[currentIndex];

  if (!isTradingSession(current.time)) {
    return {
      price: current.close,
      direction: "up" as Direction,
      probabilityUp: 0.5,
      probabilityDown: 0.5,
      confidence: "low",
      matches: 0,
      reason: "outside_session",
    };
  }

  const history = data
    .slice(100, currentIndex - LOOKAHEAD)
    .filter((c) => isTradingSession(c.time));

  const matches = history
    .map((c) => {
      const realIndex = data.indexOf(c);
      const d = distance(current, c);

      return {
        index: realIndex,
        distance: d,
        outcome: firstDirectionalHit(data, realIndex),
      };
    })
    .filter((m) => m.outcome)
    .sort((a, b) => a.distance - b.distance)
    .filter((m) => m.distance < 2.5)
    .slice(0, 150);

  let upScore = 0;
  let downScore = 0;
  let upMatches = 0;
  let downMatches = 0;

  for (const m of matches) {
    const weight = Math.exp(-m.distance);

    if (m.outcome === "up") {
      upScore += weight;
      upMatches++;
    }

    if (m.outcome === "down") {
      downScore += weight;
      downMatches++;
    }
  }

  const total = upScore + downScore || 1;

  const probabilityUp = upScore / total;
  const probabilityDown = downScore / total;

  const maxProb = Math.max(probabilityUp, probabilityDown);

  const rawDirection =
    probabilityUp >= probabilityDown
      ? ("up" as Direction)
      : ("down" as Direction);

  const direction =
    rawDirection === "up" ? ("down" as Direction) : ("up" as Direction);

  const confidence: "low" | "medium" | "high" =
    maxProb > 0.72 ? "high" : maxProb > 0.62 ? "medium" : "low";

  return {
    price: current.close,
    direction,
    rawDirection,
    probabilityUp,
    probabilityDown,
    confidence,
    matches: matches.length,
    upMatches,
    downMatches,
    reason: "ok",
  };
}
