import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

const HELP =
  "ℹ️ Forex Alert Bot\n\n" +
  "Get notified when a currency pair crosses your target price.\n\n" +
  "Tap 🔔 New alert to create one, or 📋 My alerts to see your active alerts.\n\n" +
  "You can also type:\n" +
  "• /alert EUR/USD 1.1000 above\n" +
  "• /list — see all your alerts\n" +
  "• /cancel [id] — cancel an alert\n\n" +
  "Tap /start to open the menu.";

const backToMenu = inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]);

composer.command("help", async (ctx) => {
  await ctx.reply(HELP);
});

composer.callbackQuery("menu:help", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(HELP, { reply_markup: backToMenu });
});

export default composer;
