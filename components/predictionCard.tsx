"use client";

type Props = {
  prediction: any;
};

type SignalMode = "trade" | "watch" | "no_trade";

const blockedReasonLabels: Record<string, string> = {
  outside_session: "Outside trading session",
  low_confidence: "Low confidence",
  watch_medium_confidence: "Medium confidence — wait only",

  blocked_hour_7_utc: "Blocked hour: 7 UTC",
  blocked_hour_8_utc: "Blocked hour: 8 UTC",
  blocked_hour_9_utc: "Blocked hour: 9 UTC",
  blocked_hour_10_utc: "Blocked hour: 10 UTC",
  blocked_hour_15_utc: "Blocked hour: 15 UTC",
  blocked_hour_16_utc: "Blocked hour: 16 UTC",
  blocked_hour_17_utc: "Blocked hour: 17 UTC",

  blocked_13_utc_down: "Blocked: 13 UTC sell",
};

function getSignalMode(prediction: any): SignalMode {
  if (prediction?.signalMode === "trade") return "trade";
  if (prediction?.signalMode === "watch") return "watch";
  return "no_trade";
}

function getTradeSide(direction?: string) {
  if (direction === "up") return "BUY";
  if (direction === "down") return "SELL";
  return "—";
}

function getStatusTitle(signalMode: SignalMode) {
  if (signalMode === "trade") return "TRADE";
  if (signalMode === "watch") return "WAIT";
  return "NO TRADE";
}

function getCardClass(signalMode: SignalMode) {
  if (signalMode === "trade") {
    return "border-emerald-500/60 bg-emerald-500/10";
  }

  if (signalMode === "watch") {
    return "border-amber-500/60 bg-amber-500/10";
  }

  return "border-zinc-800 bg-zinc-900";
}

function getTitleClass(signalMode: SignalMode) {
  if (signalMode === "trade") {
    return "text-5xl font-bold text-emerald-300";
  }

  if (signalMode === "watch") {
    return "text-5xl font-bold text-amber-300";
  }

  return "text-5xl font-bold text-zinc-500";
}

function getReasonText(signalMode: SignalMode, blockedReason?: string | null) {
  if (signalMode === "trade") {
    return "High confidence. Trade is allowed.";
  }

  if (signalMode === "watch") {
    return "Medium confidence. Wait only. No live trade.";
  }

  if (blockedReason) {
    return blockedReason;
  }

  return "No valid trade setup.";
}

function getExecutionProbabilities(prediction: any) {
  const rawUp = (prediction.probabilityUp ?? 0) * 100;
  const rawDown = (prediction.probabilityDown ?? 0) * 100;

  const rawDirection = prediction.rawDirection;
  const finalDirection = prediction.direction;

  const isInverted =
    rawDirection &&
    finalDirection &&
    rawDirection !== finalDirection;

  if (isInverted) {
    return {
      buy: rawDown,
      sell: rawUp,
      rawUp,
      rawDown,
    };
  }

  return {
    buy: rawUp,
    sell: rawDown,
    rawUp,
    rawDown,
  };
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
  const tradeSide = getTradeSide(prediction.direction);

  const { buy, sell, rawUp, rawDown } = getExecutionProbabilities(prediction);

  const blockedReason =
    prediction.blockedReason &&
    (blockedReasonLabels[prediction.blockedReason] ?? prediction.blockedReason);

  const statusTitle = getStatusTitle(signalMode);
  const reasonText = getReasonText(signalMode, blockedReason);

  return (
    <div className={`rounded-2xl p-6 border ${getCardClass(signalMode)}`}>
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-zinc-400 mb-2">AI Decision</p>

          <p className={getTitleClass(signalMode)}>{statusTitle}</p>

          <div className="mt-5">
            {signalMode === "trade" && (
              <>
                <p className="text-2xl font-bold text-white">
                  {tradeSide} EUR/USD
                </p>

                <p className="text-emerald-300 mt-2">
                  Open trade is allowed.
                </p>
              </>
            )}

            {signalMode === "watch" && (
              <>
                <p className="text-2xl font-bold text-white">
                  Possible {tradeSide}
                </p>

                <p className="text-amber-300 mt-2">
                  Wait. Do not open a trade yet.
                </p>
              </>
            )}

            {signalMode === "no_trade" && (
              <>
                <p className="text-2xl font-bold text-white">
                  Do not enter
                </p>

                <p className="text-zinc-400 mt-2">
                  Market bias: {tradeSide}
                </p>
              </>
            )}
          </div>

          <p className="mt-4 text-sm text-zinc-300">
            Reason: {reasonText}
          </p>
        </div>

        <div className="text-right shrink-0">
          <p className="text-2xl font-bold">
            {prediction.price?.toFixed(5)}
          </p>

          <p className="text-xs text-zinc-500 mt-2">
            TP ATR × {prediction.tpMultiplier ?? 1.6}
          </p>

          <p className="text-xs text-zinc-500">
            SL ATR × {prediction.slMultiplier ?? 1.0}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>BUY</span>
            <span>{buy.toFixed(1)}%</span>
          </div>

          <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${Math.min(buy, 100)}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>SELL</span>
            <span>{sell.toFixed(1)}%</span>
          </div>

          <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500"
              style={{ width: `${Math.min(sell, 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-black/30 border border-zinc-800 p-4">
        <p className="text-sm text-zinc-400">Investor summary</p>

        <p className="mt-2 text-lg font-semibold text-white">
          {signalMode === "trade" &&
            `${tradeSide} is allowed now.`}

          {signalMode === "watch" &&
            `Wait. Possible ${tradeSide}, but confidence is not high enough.`}

          {signalMode === "no_trade" &&
            `Wait. No trade now. Market bias: ${tradeSide}.`}
        </p>
      </div>

      <div className="text-sm text-zinc-500 mt-4 space-y-1">
        {prediction.signalTime && <p>Signal time: {prediction.signalTime}</p>}

        {prediction.signalHourUtc !== undefined && (
          <p>UTC hour: {prediction.signalHourUtc}</p>
        )}

        <p>
          Final confidence:{" "}
          <span className="uppercase">
            {prediction.finalConfidence ?? prediction.confidence ?? "low"}
          </span>
        </p>
      </div>

      <details className="text-sm text-zinc-500 mt-4">
        <summary className="cursor-pointer hover:text-zinc-300">
          Technical details
        </summary>

        <div className="mt-3 space-y-1">
          <p>Execution side: {tradeSide}</p>
          <p>Execution direction: {prediction.direction?.toUpperCase()}</p>

          {prediction.rawDirection && (
            <p>Raw model direction: {prediction.rawDirection.toUpperCase()}</p>
          )}

          <p>
            Internal raw probabilities: Up {rawUp.toFixed(1)}% / Down{" "}
            {rawDown.toFixed(1)}%
          </p>

          <p>
            Investor probabilities: BUY {buy.toFixed(1)}% / SELL{" "}
            {sell.toFixed(1)}%
          </p>

          <p>Historical matches: {prediction.matches}</p>

          {prediction.upMatches !== undefined &&
            prediction.downMatches !== undefined && (
              <p>
                Raw match split: Up {prediction.upMatches} / Down{" "}
                {prediction.downMatches}
              </p>
            )}

          {prediction.reason && <p>Model reason: {prediction.reason}</p>}
          {blockedReason && <p>Blocked reason: {blockedReason}</p>}
        </div>
      </details>
    </div>
  );
}