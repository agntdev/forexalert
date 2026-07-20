import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import {
  inlineButton,
  inlineKeyboard,
  registerMainMenuItem,
} from "../toolkit/index.js";
import {
  saveAlert,
  generateAlertId,
  type Alert,
  type AlertDirection,
} from "../storage.js";
import { now } from "../price-feed.js";

// ─── Main menu entry ─────────────────────────────────────────────────────────

registerMainMenuItem({
  label: "🔔 New alert",
  data: "alert:create",
  order: 10,
});

// ─── Parse /alert arguments ──────────────────────────────────────────────────

function parseAlertArgs(
  text: string,
): { pair: string; price: number; direction: AlertDirection } | null {
  const args = text.replace(/^\/alert\s*/, "").trim();
  if (!args) return null;

  const parts = args.split(/\s+/);
  if (parts.length !== 3) return null;

  const [pairRaw, priceRaw, dirRaw] = parts;
  const pair = pairRaw!.toUpperCase().replace("-", "/");
  const price = Number(priceRaw);
  if (!isFinite(price) || price <= 0) return null;

  const dirLower = dirRaw!.toLowerCase();
  if (dirLower !== "above" && dirLower !== "below") return null;

  return { pair, price, direction: dirLower };
}

// ─── Confirmation message builder ────────────────────────────────────────────

function confirmationText(pair: string, price: number, direction: string): string {
  return (
    `🔔 New price alert\n\n` +
    `Pair: ${pair}\n` +
    `Target: ${direction} ${price}\n\n` +
    `Save this alert?`
  );
}

// ─── /alert command ──────────────────────────────────────────────────────────

const composer = new Composer<Ctx>();

composer.command("alert", async (ctx) => {
  const parsed = parseAlertArgs(ctx.message?.text ?? "");
  if (!parsed) {
    await ctx.reply(
      "Usage: /alert [pair] [price] [above|below]\n\n" +
        "Example: /alert EUR/USD 1.1000 above",
    );
    return;
  }

  ctx.session.pendingAlert = {
    pair: parsed.pair,
    targetPrice: parsed.price,
    direction: parsed.direction,
  };

  await ctx.reply(confirmationText(parsed.pair, parsed.price, parsed.direction), {
    reply_markup: inlineKeyboard([
      [
        inlineButton("✅ Confirm", "alert:confirm"),
        inlineButton("Cancel", "alert:cancel"),
      ],
    ]),
  });
});

// ─── Main menu button → prompt for /alert ────────────────────────────────────

composer.callbackQuery("alert:create", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    "Send a message in this format:\n\n" +
      "/alert [pair] [price] [above|below]\n\n" +
      "Example: /alert EUR/USD 1.1000 above",
    {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

// ─── Confirm callback ────────────────────────────────────────────────────────

composer.callbackQuery("alert:confirm", async (ctx) => {
  await ctx.answerCallbackQuery();
  const pending = ctx.session.pendingAlert;
  if (!pending) {
    await ctx.editMessageText("No pending alert — send /alert to start a new one.", {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }

  const alert: Alert = {
    id: generateAlertId(),
    userId: ctx.from.id,
    pair: pending.pair,
    direction: pending.direction,
    targetPrice: pending.targetPrice,
    createdAt: now().toISOString(),
    status: "active",
  };

  await saveAlert(alert);
  ctx.session.pendingAlert = undefined;

  await ctx.editMessageText(
    `✅ Alert saved!\n\n` +
      `Pair: ${alert.pair}\n` +
      `Target: ${alert.direction} ${alert.targetPrice}\n` +
      `ID: ${alert.id}`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

// ─── Cancel callback ─────────────────────────────────────────────────────────

composer.callbackQuery("alert:cancel", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.pendingAlert = undefined;
  await ctx.editMessageText("Alert discarded.", {
    reply_markup: inlineKeyboard([
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

export default composer;
