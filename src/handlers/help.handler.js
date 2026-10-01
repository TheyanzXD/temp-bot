/**
 * Help command handler.
 */
const messagesViews = require('../views/messages');
const { InlineKeyboard } = require('grammy');
const { CALLBACKS } = require('../config/constants');

module.exports = async function helpHandler(ctx) {
  if (ctx.callbackQuery) await ctx.answerCallbackQuery();

  const text = messagesViews.helpMessage();
  const kb = new InlineKeyboard().text('🏠 Menu Utama', `${CALLBACKS.MENU}:home`);

  if (ctx.callbackQuery) {
    try {
      await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb });
    } catch (e) {
      await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
    }
  } else {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
  }
};
