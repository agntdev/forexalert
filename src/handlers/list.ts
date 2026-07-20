import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import {
  inlineButton,
  inlineKeyboard,
  registerMainMenuItem,
} from "../toolkit/index.js";
import { getUserAlerts } from "../storage.js";

// ─── Main menu entry ─────────────────────────────────────────────────────────

registerMainMenuItem({
  label: "📋 My alerts",
  data: "list:show",
  order: 20,
});

// ─── /list command ───────────────────────────────────────────────────────────

const composer = new Composer<Ctx>();

composer.command("list", async (ctx) => {
  await sendAlertList(ctx);
});

composer.callbackQuery("list:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from?.id ?? 0;
  const alerts = await getUserAlerts(userId);
  if (alerts.length === 0) {
    await ctx.editMessageText(
      "No active alerts — tap 🔔 New alert to create one.",
      {
        reply_markup: inlineKeyboard([
          [inlineButton("⬅️ Back to menu", "menu:main")],
        ]),
      },
    );
    return;
  }

  const lines = alerts.map(
    (a) => `• ${a.pair} ${a.direction} ${a.targetPrice}  (ID: ${a.id})`,
  );
  const keyboard = alerts.map((a) => [
    inlineButton(`Cancel ${a.pair}`, `list:cancel:${a.id}`),
  ]);
  keyboard.push([inlineButton("⬅️ Back to menu", "menu:main")]);

  await ctx.editMessageText(
    `Active alerts (${alerts.length}):\n\n${lines.join("\n")}`,
    { reply_markup: inlineKeyboard(keyboard) },
  );
});

async function sendAlertList(ctx: Ctx): Promise<void> {
  const userId = ctx.from?.id ?? 0;
  const alerts = await getUserAlerts(userId);
  if (alerts.length === 0) {
    await ctx.reply("No active alerts — tap 🔔 New alert to create one.", {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }

  const lines = alerts.map(
    (a) => `• ${a.pair} ${a.direction} ${a.targetPrice}  (ID: ${a.id})`,
  );
  const keyboard = alerts.map((a) => [
    inlineButton(`Cancel ${a.pair}`, `list:cancel:${a.id}`),
  ]);
  keyboard.push([inlineButton("⬅️ Back to menu", "menu:main")]);

  await ctx.reply(`Active alerts (${alerts.length}):\n\n${lines.join("\n")}`, {
    reply_markup: inlineKeyboard(keyboard),
  });
}

export default composer;
