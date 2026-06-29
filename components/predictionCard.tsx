"use client";

type Props = {
  prediction: any;
};

type SignalMode = "trade" | "watch" | "no_trade";

const blockedReasonLabels: Record<string, string> = {
  outside_session: "Outside trading session",
  low_confidence: "Low confidence",

  watch_medium_confidence: "Medium confidence — watch only",

  blocked_hour_7_utc: "Blocked hour: 7 UTC",
  blocked_hour_8_utc: "Blocked hour: 8 UTC",
  blocked_hour_9_utc: "Blocked hour: 9 UTC",
  blocked_hour_10_utc: "Blocked hour: 10 UTC",
  blocked_hour_15_utc: "Blocked hour: 15 UTC",
  blocked_hour_16_utc: "Blocked hour: 16 UTC",
  blocked_hour_17_utc: "Blocked hour: 17 UTC",

  blocked_13_utc_down: "Blocked: 13 UTC down",
};

function getSignalMode(prediction: any): SignalMode {
  if (prediction?.signalMode === "trade") return "trade";
  if (prediction?.signalMode === "watch") return "watch";
  return "no_trade";
}

function getStatusTitle(signalMode: SignalMode, direction?: string) {
  if (signalMode === "trade") return direction?.toUpperCase() ?? "TRADE";
  if (signalMode === "watch") return "WATCH";
  return "NO TRADE";
}

function getStatusClass(signalMode: SignalMode) {
  if (signalMode === "trade") {
    return "border-emerald-500/50 bg-emerald-500/10";
  }

  if (signalMode === "watch") {
    return "border-amber-500/50 bg-amber-500/10";
  }

  return "border-zinc-800 bg-zinc-900";
}

function getTitleClass(signalMode: SignalMode) {
  if (signalMode === "trade") return "text-4xl font-bold text-emerald-300";
  if (signalMode === "watch") return "text-4xl font-bold text-amber-300";
  return "text-4xl font-bold text-zinc-500";
}

function getStatusDescription(
  signalMode: SignalMode,
  direction?: string,
  blockedReason?: string | null,
) {
  if (signalMode === "trade") {
    return `Trade allowed · ${direction?.toUpperCase()} · high confidence`;
  }

  if (signalMode === "watch") {
    return `Watch only · model points ${direction?.toUpperCase()} · medium confidence`;
  }

  if (blockedReason) {
    return `Blocked: ${blockedReason}`;
  }

  return "No trade";
}

export function PredictionCard({ prediction }: Props) {
  if (!prediction) {
    return (
      <div className="rounded-2xl bg-zinc-900 p-6 border border-zinc-800">
        <p className="text-zinc-400">No prediction data.</p>
      </div>
    );
  }

  const signalMode = getSignalMode(prediction);
  const allowedTrade =
    signalMode === "trade" && prediction.allowedTrade === true;
  const isWatch = signalMode === "watch";
  const showProbabilities = allowedTrade || isWatch;

  const rawUp = (prediction.probabilityUp ?? 0) * 100;
  const rawDown = (prediction.probabilityDown ?? 0) * 100;

  const up = showProbabilities ? rawUp : 0;
  const down = showProbabilities ? rawDown : 0;

  const finalConfidence =
    prediction.finalConfidence ?? prediction.confidence ?? "low";

  const blockedReason =
    prediction.blockedReason &&
    (blockedReasonLabels[prediction.blockedReason] ?? prediction.blockedReason);

  const title = getStatusTitle(signalMode, prediction.direction);
  const description = getStatusDescription(
    signalMode,
    prediction.direction,
    blockedReason,
  );

  return (
    <div className={`rounded-2xl p-6 border ${getStatusClass(signalMode)}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-zinc-400 mb-2">AI Prediction</p>

          <p className={getTitleClass(signalMode)}>{title}</p>

          <p className="text-sm text-zinc-300 mt-2">{description}</p>

          <p className="text-zinc-400 mt-2">
            Final confidence:{" "}
            <span className="font-semibold uppercase">{finalConfidence}</span>
          </p>
        </div>

        <div className="text-right">
          <p className="text-2xl font-bold">{prediction.price?.toFixed(5)}</p>

          <p className="text-xs text-zinc-500 mt-1">
            TP ATR × {prediction.tpMultiplier ?? 1.6}
          </p>

          <p className="text-xs text-zinc-500">
            SL ATR × {prediction.slMultiplier ?? 1.0}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Up</span>
            <span>{showProbabilities ? `${up.toFixed(1)}%` : "—"}</span>
          </div>

          <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${Math.min(up, 100)}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Down</span>
            <span>{showProbabilities ? `${down.toFixed(1)}%` : "—"}</span>
          </div>

          <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500"
              style={{ width: `${Math.min(down, 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="text-sm text-zinc-500 mt-4 space-y-1">
        <p>Historical matches: {prediction.matches}</p>

        {prediction.upMatches !== undefined &&
          prediction.downMatches !== undefined && (
            <p>
              Match split: Up {prediction.upMatches} / Down{" "}
              {prediction.downMatches}
            </p>
          )}

        {prediction.signalTime && <p>Signal time: {prediction.signalTime}</p>}

        {prediction.signalHourUtc !== undefined && (
          <p>UTC hour: {prediction.signalHourUtc}</p>
        )}

        {prediction.rawDirection && (
          <p>Raw model direction: {prediction.rawDirection.toUpperCase()}</p>
        )}

        {prediction.reason && <p>Model reason: {prediction.reason}</p>}

        {blockedReason && signalMode !== "trade" && (
          <p
            className={
              signalMode === "watch" ? "text-amber-400" : "text-zinc-400"
            }
          >
            Reason: {blockedReason}
          </p>
        )}

        {signalMode !== "trade" && (
          <p>
            Raw setup before trade rules: {prediction.direction?.toUpperCase()}{" "}
            · Up {rawUp.toFixed(1)}% / Down {rawDown.toFixed(1)}%
          </p>
        )}
      </div>
    </div>
  );
}
