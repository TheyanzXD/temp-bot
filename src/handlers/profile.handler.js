/**
 * Profile command handler.
 */
const emailsRepo = require('../database/repositories/emails.repo');
const messagesViews = require('../views/messages');
const { InlineKeyboard } = require('grammy');
const { CALLBACKS } = require('../config/constants');

module.exports = async function profileHandler(ctx) {
  if (ctx.callbackQuery) await ctx.answerCallbackQuery();

  let activeEmailAddr = null;
  if (ctx.dbUser.active_email_id) {
    const e = emailsRepo.findById(ctx.dbUser.active_email_id);
    if (e && e.status === 'active') activeEmailAddr = e.address;
  }

  const text = messagesViews.userProfileMessage(ctx.dbUser, activeEmailAddr, ctx.dbUser.total_emails_created);
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
