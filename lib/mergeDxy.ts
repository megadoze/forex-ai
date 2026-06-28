import { FeaturedCandle } from "./indicators";

export function mergeDxy(
  eurusd: FeaturedCandle[],
  dxy: FeaturedCandle[],
): FeaturedCandle[] {
  const map = new Map(dxy.map((c) => [c.time, c]));

  return eurusd.map((c) => {
    const d = map.get(c.time);

    if (!d || !d.atr14) return c;

    return {
      ...c,
      dxyClose: d.close,
      dxyReturn1: (d.close - d.open) / d.open,
      dxyReturn4: (d.close - d.ema20) / d.atr14,
      dxyTrend: d.trend,
    };
  });
}
