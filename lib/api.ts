export async function fetchPrediction() {
  const res = await fetch("/api/analyze", {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch prediction");
  }

  return res.json();
}

export async function fetchBacktest() {
  const res = await fetch("/api/backtest?tp=1.6&sl=1.0&minConfidence=high", {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch backtest");
  }

  return res.json();
}
