"use client";

type Props = {
  backtest: any;
};

export function BacktestCard({ backtest }: Props) {
  const total = backtest?.total ?? {
    signals: 0,
    winRate: 0,
    pips: 0,
    avgPips: 0,
  };

  const tp = backtest?.tpMultiplier ?? 1.6;
  const sl = backtest?.slMultiplier ?? 1.0;
  const minConfidence = backtest?.minConfidence ?? "high";

  return (
    <div className="rounded-2xl bg-zinc-900 p-6 border border-zinc-800">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-zinc-400">Backtest</p>
          <p className="text-sm text-zinc-500 mt-1">
            Strategy v2 · TP ATR × {tp} · SL ATR × {sl}
          </p>
        </div>

        <div className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300 uppercase">
          {minConfidence}-only
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Metric label="Signals" value={total.signals} />
        <Metric
          label="Win Rate"
          value={`${((total.winRate ?? 0) * 100).toFixed(1)}%`}
        />
        <Metric label="Total Pips" value={(total.pips ?? 0).toFixed(1)} />
        <Metric label="Avg Pips" value={(total.avgPips ?? 0).toFixed(2)} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-zinc-500 text-sm">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
