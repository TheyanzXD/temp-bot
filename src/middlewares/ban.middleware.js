/**
 * Ban enforcement middleware.
 */
const bansRepo = require('../database/repositories/bans.repo');

module.exports = async function banMiddleware(ctx, next) {
  if (!ctx.dbUser) return next();

  if (ctx.dbUser.is_banned === 1) {
    if (ctx.callbackQuery) {
      return ctx.answerCallbackQuery({
        text: '🚫 Akun Anda telah diblokir dari penggunaan bot ini.',
        show_alert: true,
      });
    } else {
      return ctx.reply('🚫 <b>Akun Anda telah diblokir dari penggunaan bot ini.</b>', { parse_mode: 'HTML' });
    }
  }

  return next();
};
