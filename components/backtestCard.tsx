"use client";

type Props = {
  backtest: any;
};

export function BacktestCard({ backtest }: Props) {
  const total = backtest.total;

  return (
    <div className="rounded-2xl bg-zinc-900 p-6 border border-zinc-800">
      <p className="text-zinc-400 mb-4">Backtest</p>

      <div className="grid grid-cols-2 gap-4">
        <Metric label="Signals" value={total.signals} />
        <Metric
          label="Win Rate"
          value={`${(total.winRate * 100).toFixed(1)}%`}
        />
        <Metric label="Total Pips" value={total.pips.toFixed(1)} />
        <Metric label="Avg Pips" value={total.avgPips.toFixed(2)} />
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
