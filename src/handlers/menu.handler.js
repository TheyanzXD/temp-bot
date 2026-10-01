/**
 * Handler for /menu command and returning home.
 */
const messagesViews = require('../views/messages');
const { mainMenuKeyboard } = require('../keyboards/main.keyboard');
const emailsRepo = require('../database/repositories/emails.repo');

module.exports = async function menuHandler(ctx) {
  let activeEmailAddress = null;
  let unreadCount = 0;

  if (ctx.dbUser && ctx.dbUser.active_email_id) {
    const activeEmail = emailsRepo.findById(ctx.dbUser.active_email_id);
    if (activeEmail && activeEmail.status === 'active') {
      activeEmailAddress = activeEmail.address;
      unreadCount = activeEmail.unread_count;
    }
  }

  const text = messagesViews.mainMenuMessage(activeEmailAddress, unreadCount);
  const keyboard = mainMenuKeyboard();

  if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery();
    try {
      await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard });
    } catch (e) {
      await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
    }
  } else {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
  }
};
