import { createRequire } from "node:module";
import { RedisSessionStorage, type RedisLike } from "./toolkit/session/redis.js";
import { MemorySessionStorage } from "./toolkit/session/memory.js";
import type { StorageAdapter } from "grammy";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AlertDirection = "above" | "below";
export type AlertStatus = "active" | "triggered" | "cancelled";

export interface Alert {
  id: string;
  userId: number;
  pair: string;
  direction: AlertDirection;
  targetPrice: number;
  createdAt: string;
  status: AlertStatus;
}

export interface UserIndex {
  alertIds: string[];
}

// ─── Lazy storage singletons ─────────────────────────────────────────────────

let alertStore: StorageAdapter<Alert> | null = null;
let indexStore: StorageAdapter<UserIndex> | null = null;
let activeStore: StorageAdapter<string[]> | null = null;

function initStorage(): void {
  if (alertStore) return;
  const url = process.env.REDIS_URL;
  if (url) {
    const require = createRequire(import.meta.url);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ioredis: any = require("ioredis");
    const Redis = ioredis.default ?? ioredis.Redis ?? ioredis;
    const client = new Redis(url, {
      maxRetriesPerRequest: null,
      lazyConnect: false,
    }) as RedisLike;
    alertStore = new RedisSessionStorage<Alert>(client, "falrt:");
    indexStore = new RedisSessionStorage<UserIndex>(client, "fuidx:");
    activeStore = new RedisSessionStorage<string[]>(client, "faidx:");
  } else {
    alertStore = new MemorySessionStorage<Alert>();
    indexStore = new MemorySessionStorage<UserIndex>();
    activeStore = new MemorySessionStorage<string[]>();
  }
}

function alertStorage(): StorageAdapter<Alert> {
  initStorage();
  return alertStore!;
}

function indexStorage(): StorageAdapter<UserIndex> {
  initStorage();
  return indexStore!;
}

function activeStorage(): StorageAdapter<string[]> {
  initStorage();
  return activeStore!;
}

// ─── Alert CRUD ──────────────────────────────────────────────────────────────

export async function saveAlert(alert: Alert): Promise<void> {
  await alertStorage().write(alert.id, alert);

  const userIdx = (await indexStorage().read(String(alert.userId))) ?? {
    alertIds: [],
  };
  if (!userIdx.alertIds.includes(alert.id)) {
    userIdx.alertIds.push(alert.id);
    await indexStorage().write(String(alert.userId), userIdx);
  }

  const activeIdx = (await activeStorage().read("active")) ?? [];
  if (!activeIdx.includes(alert.id)) {
    activeIdx.push(alert.id);
    await activeStorage().write("active", activeIdx);
  }
}

export async function getAlert(id: string): Promise<Alert | null> {
  return (await alertStorage().read(id)) ?? null;
}

export async function getUserAlerts(userId: number): Promise<Alert[]> {
  const userIdx = (await indexStorage().read(String(userId))) ?? {
    alertIds: [],
  };
  const alerts: Alert[] = [];
  for (const id of userIdx.alertIds) {
    const alert = await alertStorage().read(id);
    if (alert && alert.status === "active") alerts.push(alert);
  }
  return alerts;
}

export async function getActiveAlertIds(): Promise<string[]> {
  return (await activeStorage().read("active")) ?? [];
}

export async function markAlertTriggered(id: string): Promise<void> {
  const alert = await alertStorage().read(id);
  if (!alert) return;
  alert.status = "triggered";
  await alertStorage().write(id, alert);
  await removeFromActiveIndex(id);
}

export async function cancelAlert(id: string): Promise<boolean> {
  const alert = await alertStorage().read(id);
  if (!alert || alert.status !== "active") return false;
  alert.status = "cancelled";
  await alertStorage().write(id, alert);
  await removeFromActiveIndex(id);
  return true;
}

async function removeFromActiveIndex(id: string): Promise<void> {
  const activeIdx = (await activeStorage().read("active")) ?? [];
  await activeStorage().write(
    "active",
    activeIdx.filter((a) => a !== id),
  );
}

// ─── ID generation ───────────────────────────────────────────────────────────

let counter = 0;

export function generateAlertId(): string {
  counter++;
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${ts}${rand}${counter}`;
}
