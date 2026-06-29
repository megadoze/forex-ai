// lib/tradeFilters.ts
import type { Direction } from "./model";

export function isAllowedTradeHour(time: string) {
  const hour = new Date(time).getUTCHours();

  if (hour === 7) return false;
  if (hour === 8) return false;
  if (hour === 9) return false;
  if (hour === 10) return false;
  if (hour === 15) return false;
  if (hour === 16) return false;
  if (hour === 17) return false;

  return true;
}

export function isAllowedHourDirection(time: string, direction: Direction) {
  const hour = new Date(time).getUTCHours();

  if (hour === 13 && direction === "down") return false;

  return true;
}

export function getBlockedReason(
  time: string,
  direction: Direction,
  confidence: string,
  reason?: string,
) {
  const hour = new Date(time).getUTCHours();

  if (reason === "outside_session") return "outside_session";

  if (hour === 7) return "blocked_hour_7_utc";
  if (hour === 8) return "blocked_hour_8_utc";
  if (hour === 9) return "blocked_hour_9_utc";
  if (hour === 10) return "blocked_hour_10_utc";
  if (hour === 15) return "blocked_hour_15_utc";
  if (hour === 16) return "blocked_hour_16_utc";
  if (hour === 17) return "blocked_hour_17_utc";

  if (hour === 13 && direction === "down") {
    return "blocked_13_utc_down";
  }

  if (confidence === "low") return "low_confidence";

  return null;
}

export function isAllowedTrade(
  time: string,
  direction: Direction,
  confidence: string,
  reason?: string,
) {
  return getBlockedReason(time, direction, confidence, reason) === null;
}
