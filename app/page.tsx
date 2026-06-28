"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchBacktest, fetchPrediction } from "@/lib/api";
import { PredictionCard } from "@/components/predictionCard";
import { BacktestCard } from "@/components/backtestCard";

export default function Home() {
  const predictionQuery = useQuery({
    queryKey: ["prediction-final"],
    queryFn: fetchPrediction,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const backtestQuery = useQuery({
    queryKey: ["backtest-final-baseline"],
    queryFn: fetchBacktest,

    // Backtest тяжелый. Не надо гонять его постоянно.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  if (predictionQuery.isLoading || backtestQuery.isLoading) {
    return (
      <main className="min-h-screen bg-black text-white p-8">
        Loading EUR/USD AI Analyst...
      </main>
    );
  }

  if (predictionQuery.error || backtestQuery.error) {
    return (
      <main className="min-h-screen bg-black text-white p-8">
        Ошибка загрузки данных.
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">EUR/USD AI Analyst</h1>

          <p className="text-zinc-400 mt-2">
            Similarity model · ATR targets · final trade filters
          </p>

          <p className="text-zinc-500 text-sm mt-1">
            Live signal refreshes every 60 seconds. Backtest is fixed baseline.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PredictionCard prediction={predictionQuery.data} />
          <BacktestCard backtest={backtestQuery.data} />
        </div>
      </div>
    </main>
  );
}
