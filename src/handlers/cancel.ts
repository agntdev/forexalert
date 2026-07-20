import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { cancelAlert, getAlert } from "../storage.js";

const composer = new Composer<Ctx>();

// ─── /cancel <id> command ────────────────────────────────────────────────────

composer.command("cancel", async (ctx) => {
  const args = (ctx.message?.text ?? "").replace(/^\/cancel\s*/, "").trim();
  if (!args) {
    await ctx.reply("Usage: /cancel [alert ID]\n\nFind your alert IDs with /list.");
    return;
  }

  const userId = ctx.from?.id;
  const alert = await getAlert(args);
  if (!alert || alert.userId !== userId) {
    await ctx.reply("Alert not found — check the ID and try again.");
    return;
  }
  if (alert.status !== "active") {
    await ctx.reply("That alert is no longer active.");
    return;
  }

  await cancelAlert(args);
  await ctx.reply(
    `Alert cancelled.\n\nPair: ${alert.pair}\nTarget: ${alert.direction} ${alert.targetPrice}`,
    { reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]) },
  );
});

// ─── Cancel button from the list view (callback data: list:cancel:<id>) ──────

composer.callbackQuery(/^list:cancel:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const id = ctx.match[1];
  if (!id) return;

  const userId = ctx.from?.id;
  const alert = await getAlert(id);
  if (!alert || alert.userId !== userId) {
    await ctx.editMessageText("Alert not found.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  if (alert.status !== "active") {
    await ctx.editMessageText("That alert is no longer active.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  await cancelAlert(id);
  await ctx.editMessageText(
    `Alert cancelled.\n\nPair: ${alert.pair}\nTarget: ${alert.direction} ${alert.targetPrice}`,
    { reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]) },
  );
});

export default composer;
