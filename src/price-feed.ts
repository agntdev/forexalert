import type { Bot, Context } from "grammy";
import {
  getActiveAlertIds,
  getAlert,
  markAlertTriggered,
  type Alert,
} from "./storage.js";

// ─── Injectable clock ────────────────────────────────────────────────────────

export type ClockFn = () => Date;
let clockFn: ClockFn = () => new Date();
export function setClock(fn: ClockFn): void {
  clockFn = fn;
}
export function now(): Date {
  return clockFn();
}

// ─── Price feed ──────────────────────────────────────────────────────────────

const DEFAULT_POLL_MS = 60_000;

export interface PriceFeedOptions {
  pollMs?: number;
  fetchRate?: (pair: string) => Promise<number | null>;
}

// exchangerate.host — free, no API key required
async function defaultFetchRate(pair: string): Promise<number | null> {
  const parts = pair.toUpperCase().split("/");
  if (parts.length !== 2) return null;
  const [base, quote] = parts;
  try {
    const url = `https://api.exchangerate.host/latest?base=${base}&symbols=${quote}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      success?: boolean;
      rates?: Record<string, number>;
    };
    if (data.success === false) return null;
    return data.rates?.[quote!] ?? null;
  } catch {
    return null;
  }
}

function crossesDirection(
  current: number,
  target: number,
  direction: "above" | "below",
): boolean {
  if (direction === "above") return current >= target;
  return current <= target;
}

async function checkAlerts(
  sendDm: (userId: number, text: string) => Promise<void>,
  fetchRate: (pair: string) => Promise<number | null>,
): Promise<void> {
  const activeIds = await getActiveAlertIds();
  for (const id of activeIds) {
    const alert = await getAlert(id);
    if (!alert || alert.status !== "active") continue;

    const rate = await fetchRate(alert.pair);
    if (rate === null) continue;

    if (crossesDirection(rate, alert.targetPrice, alert.direction)) {
      await markAlertTriggered(alert.id);
      const dirWord = alert.direction === "above" ? "risen above" : "fallen below";
      const msg =
        `🔔 ${alert.pair} has ${dirWord} ${alert.targetPrice}\n` +
        `Current rate: ${rate}`;
      await sendDm(alert.userId, msg).catch(() => {});
    }
  }
}

// ─── Polling loop ────────────────────────────────────────────────────────────

let timer: ReturnType<typeof setInterval> | null = null;

export function startPriceFeed(
  bot: Bot<any>,
  opts?: PriceFeedOptions,
): void {
  if (timer) return;
  const pollMs = opts?.pollMs ?? DEFAULT_POLL_MS;
  const fetchRate = opts?.fetchRate ?? defaultFetchRate;

  const loop = (): void => {
    void checkAlerts(async (userId, text) => {
      await bot.api.sendMessage(userId, text);
    }, fetchRate);
  };

  timer = setInterval(loop, pollMs);
  timer.unref?.();
}

export function stopPriceFeed(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
