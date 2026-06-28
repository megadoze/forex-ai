// lib/tradeFilters.ts
import type { Direction } from "./model";

export function isAllowedTradeHour(time: string) {
  const hour = new Date(time).getUTCHours();

  if (hour === 7) return false;
  if (hour === 8) return false;
  if (hour === 11) return false;
  if (hour === 15) return false;

  return true;
}

export function isAllowedHourDirection(time: string, direction: Direction) {
  const hour = new Date(time).getUTCHours();

  if (hour === 16 && direction === "up") return false;

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
  if (confidence === "low") return "low_confidence";

  if (hour === 7) return "blocked_hour_7_utc";
  if (hour === 8) return "blocked_hour_8_utc";
  if (hour === 11) return "blocked_hour_11_utc";
  if (hour === 15) return "blocked_hour_15_utc";

  if (hour === 16 && direction === "up") {
    return "blocked_16_utc_up";
  }

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
