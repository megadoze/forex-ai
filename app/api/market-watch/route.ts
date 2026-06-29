import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendTelegramMessage } from "@/lib/telegram";

function getSide(direction?: string) {
  if (direction === "up") return "BUY";
  if (direction === "down") return "SELL";
  return "UNKNOWN";
}

function formatPrice(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(5);
}

function getInvestorProbabilities(signal: any) {
  const rawUp = Number(signal.probabilityUp ?? 0) * 100;
  const rawDown = Number(signal.probabilityDown ?? 0) * 100;

  const rawDirection = signal.rawDirection;
  const finalDirection = signal.direction;

  const isInverted =
    rawDirection && finalDirection && rawDirection !== finalDirection;

  if (isInverted) {
    return {
      buy: rawDown,
      sell: rawUp,
    };
  }

  return {
    buy: rawUp,
    sell: rawDown,
  };
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}%`;
}

export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const expected = `Bearer ${process.env.CRON_SECRET}`;

    if (!process.env.CRON_SECRET || auth !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const origin = new URL(req.url).origin;

    const analyzeRes = await fetch(`${origin}/api/analyze`, {
      cache: "no-store",
    });

    const signal = await analyzeRes.json();

    if (!analyzeRes.ok) {
      return NextResponse.json(
        {
          error: "Analyze failed",
          details: signal,
        },
        { status: 500 },
      );
    }

    if (signal.signalMode !== "trade") {
      return NextResponse.json({
        sent: false,
        reason: "No trade signal",
        signalMode: signal.signalMode,
        confidence: signal.finalConfidence ?? signal.confidence,
        direction: signal.direction,
        signalTime: signal.signalTime,
      });
    }

    const side = getSide(signal.direction);
    const { buy, sell } = getInvestorProbabilities(signal);

    const signalId = [
      signal.signalTime,
      signal.direction,
      signal.finalConfidence ?? signal.confidence,
      formatPrice(signal.price),
    ].join(":");

    const { data: state, error: stateError } = await supabaseAdmin
      .from("alert_state")
      .select("last_signal_id")
      .eq("id", "telegram_trade_signal_v2")
      .maybeSingle();

    if (stateError) throw stateError;

    if (state?.last_signal_id === signalId) {
      return NextResponse.json({
        sent: false,
        reason: "Duplicate signal",
        signalId,
        signalMode: signal.signalMode,
        side,
      });
    }

    const message = [
      "🚨 <b>EUR/USD TRADE SIGNAL</b>",
      "",
      `<b>Side:</b> ${side}`,
      `<b>Price:</b> ${formatPrice(signal.price)}`,
      `<b>Confidence:</b> ${(signal.finalConfidence ?? signal.confidence ?? "").toUpperCase()}`,
      "",
      `<b>BUY:</b> ${formatPercent(buy)}`,
      `<b>SELL:</b> ${formatPercent(sell)}`,
      "",
      `<b>TP:</b> ATR × ${signal.tpMultiplier ?? 1.6}`,
      `<b>SL:</b> ATR × ${signal.slMultiplier ?? 1.0}`,
      "",
      `<b>Signal time:</b> ${signal.signalTime}`,
      `<b>UTC hour:</b> ${signal.signalHourUtc}`,
    ].join("\n");

    await sendTelegramMessage(message);

    const { error: upsertError } = await supabaseAdmin
      .from("alert_state")
      .upsert({
        id: "telegram_trade_signal_v2",
        last_signal_id: signalId,
        updated_at: new Date().toISOString(),
      });

    if (upsertError) throw upsertError;

    return NextResponse.json({
      sent: true,
      signalId,
      side,
      price: signal.price,
      confidence: signal.finalConfidence ?? signal.confidence,
      signalTime: signal.signalTime,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
