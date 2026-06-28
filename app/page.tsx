"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchBacktest, fetchPrediction } from "@/lib/api";
import { PredictionCard } from "@/components/predictionCard";
import { BacktestCard } from "@/components/backtestCard";
import { LoadingCard } from "@/components/loadingCard";
import { SyncButton } from "@/components/syncButton";

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
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const hasError = predictionQuery.error || backtestQuery.error;

  if (hasError) {
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold">EUR/USD AI Analyst </h1>

              <p className="text-zinc-400 mt-2">
                Similarity model · ATR targets · final trade filters
              </p>

              <p className="text-zinc-500 text-sm mt-1">
                Live signal refreshes every 60 seconds. Backtest is fixed
                baseline.
              </p>
            </div>

            <div className="flex flex-col md:items-end gap-2">
              <SyncButton />

              {predictionQuery.isFetching && !predictionQuery.isLoading && (
                <div className="absolute top-10 right-5 flex items-center gap-2 text-sm text-zinc-400">
                  <div className="h-4 w-4 rounded-full border-2 border-zinc-700 border-t-white animate-spin" />
                  Refreshing
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {predictionQuery.isLoading ? (
            <LoadingCard title="Loading live signal..." />
          ) : (
            <PredictionCard prediction={predictionQuery.data} />
          )}

          {backtestQuery.isLoading ? (
            <LoadingCard title="Loading backtest baseline..." />
          ) : (
            <BacktestCard backtest={backtestQuery.data} />
          )}
        </div>
      </div>
    </main>
  );
}
