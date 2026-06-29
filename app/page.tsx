"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchBacktest, fetchPrediction } from "@/lib/api";
import { PredictionCard } from "@/components/predictionCard";
import { BacktestCard } from "@/components/backtestCard";
import { LoadingCard } from "@/components/loadingCard";
import { SyncButton } from "@/components/syncButton";

export default function Home() {
  const predictionQuery = useQuery({
    queryKey: ["prediction-v2-live"],
    queryFn: fetchPrediction,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const backtestQuery = useQuery({
    queryKey: ["backtest-v2-high-only"],
    queryFn: fetchBacktest,
    enabled: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  if (predictionQuery.error) {
    return (
      <main className="min-h-screen bg-black text-white p-8">
        Ошибка загрузки live signal.
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold">EUR/USD AI Analyst</h1>

              <p className="text-zinc-400 mt-2">
                Similarity model · ATR TP 1.6 / SL 1.0 · high-only execution
              </p>

              <p className="text-zinc-500 text-sm mt-1">
                High = trade · Medium = watch · Low = no trade
              </p>
            </div>

            <div className="flex flex-col md:items-end gap-2">
              <SyncButton />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {predictionQuery.isLoading ? (
            <LoadingCard title="Loading live signal..." />
          ) : (
            <PredictionCard prediction={predictionQuery.data} />
          )}

          {backtestQuery.isFetching ? (
            <LoadingCard title="Running backtest v2..." />
          ) : backtestQuery.data ? (
            <BacktestCard backtest={backtestQuery.data} />
          ) : (
            <div className="rounded-2xl bg-zinc-900 p-6 border border-zinc-800">
              <p className="text-zinc-400">Backtest</p>

              <p className="text-sm text-zinc-500 mt-2">
                Strategy v2 · TP ATR × 1.6 · SL ATR × 1.0 · high-only
              </p>

              <p className="text-zinc-500 mt-4">
                Backtest is heavy, so it does not run automatically.
              </p>

              <button
                onClick={() => backtestQuery.refetch()}
                className="mt-5 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800 cursor-pointer"
              >
                Run backtest
              </button>

              {backtestQuery.error && (
                <p className="text-sm text-red-400 mt-3">Backtest failed.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
