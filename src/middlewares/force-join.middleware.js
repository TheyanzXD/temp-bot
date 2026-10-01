/**
 * Force Join channel middleware.
 */
const forceJoinService = require('../services/force-join');
const messagesViews = require('../views/messages');
const { joinChannelKeyboard } = require('../keyboards/join.keyboard');

module.exports = async function forceJoinMiddleware(ctx, next) {
  if (!ctx.dbUser) return next();

  // Allow join callback check to pass through
  if (ctx.callbackQuery && ctx.callbackQuery.data === 'join:check') {
    return next();
  }

  const { isMember } = await forceJoinService.checkMember(ctx.bot, ctx.dbUser);

  if (!isMember) {
    if (ctx.callbackQuery) {
      await ctx.answerCallbackQuery({
        text: '🔒 Akses terkunci! Kamu wajib bergabung ke channel kami terlebih dahulu.',
        show_alert: true,
      });
      try {
        await ctx.editMessageText(messagesViews.forceJoinLockMessage(), {
          parse_mode: 'HTML',
          reply_markup: joinChannelKeyboard(),
        });
      } catch (e) {
        await ctx.reply(messagesViews.forceJoinLockMessage(), {
          parse_mode: 'HTML',
          reply_markup: joinChannelKeyboard(),
        });
      }
      return;
    } else {
      return ctx.reply(messagesViews.forceJoinLockMessage(), {
        parse_mode: 'HTML',
        reply_markup: joinChannelKeyboard(),
      });
    }
  }

  return next();
};
