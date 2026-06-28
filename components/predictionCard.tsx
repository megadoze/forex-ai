"use client";

type Props = {
  prediction: any;
};

const blockedReasonLabels: Record<string, string> = {
  outside_session: "Outside trading session",
  low_confidence: "Low confidence",
  blocked_hour_7_utc: "Blocked hour: 7 UTC",
  blocked_hour_8_utc: "Blocked hour: 8 UTC",
  blocked_hour_11_utc: "Blocked hour: 11 UTC",
  blocked_hour_15_utc: "Blocked hour: 15 UTC",
  blocked_16_utc_up: "Blocked: 16 UTC up",
};

export function PredictionCard({ prediction }: Props) {
  const up = (prediction.probabilityUp ?? 0) * 100;
  const down = (prediction.probabilityDown ?? 0) * 100;

  const allowedTrade = prediction.allowedTrade === true;
  const finalConfidence =
    prediction.finalConfidence ?? prediction.confidence ?? "low";

  const title = allowedTrade ? prediction.direction?.toUpperCase() : "NO TRADE";

  const blockedReason =
    prediction.blockedReason &&
    (blockedReasonLabels[prediction.blockedReason] ?? prediction.blockedReason);

  return (
    <div className="rounded-2xl bg-zinc-900 p-6 border border-zinc-800">
      <p className="text-zinc-400 mb-2">AI Prediction</p>

      <div className="flex items-end justify-between mb-4">
        <div>
          <p
            className={
              allowedTrade
                ? "text-4xl font-bold"
                : "text-4xl font-bold text-zinc-500"
            }
          >
            {title}
          </p>

          <p className="text-zinc-400">Final confidence: {finalConfidence}</p>

          {!allowedTrade && (
            <p className="text-sm text-amber-500 mt-1">
              Reason: {blockedReason}
            </p>
          )}
        </div>

        <p className="text-2xl font-bold">{prediction.price?.toFixed(5)}</p>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Up</span>
            <span>{up.toFixed(1)}%</span>
          </div>
          <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${up}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Down</span>
            <span>{down.toFixed(1)}%</span>
          </div>
          <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-red-500" style={{ width: `${down}%` }} />
          </div>
        </div>
      </div>

      <div className="text-sm text-zinc-500 mt-4 space-y-1">
        <p>Historical matches: {prediction.matches}</p>

        {prediction.signalTime && <p>Signal time: {prediction.signalTime}</p>}

        {prediction.signalHourUtc !== undefined && (
          <p>UTC hour: {prediction.signalHourUtc}</p>
        )}

        {prediction.reason && <p>Model reason: {prediction.reason}</p>}
      </div>
    </div>
  );
}
