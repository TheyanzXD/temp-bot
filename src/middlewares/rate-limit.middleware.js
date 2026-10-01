/**
 * Rate limiting middleware using RateLimiterService.
 */
const rateLimiter = require('../services/rate-limiter');

module.exports = async function rateLimitMiddleware(ctx, next) {
  if (!ctx.dbUser) return next();

  if (!rateLimiter.isAllowed(ctx.dbUser.id)) {
    if (ctx.callbackQuery) {
      return ctx.answerCallbackQuery({
        text: '⚠️ Anda terlalu cepat! Silakan tunggu beberapa detik.',
        show_alert: true,
      });
    } else {
      return ctx.reply('⚠️ <b>Anda terlalu cepat melakukan permintaan!</b> Silakan tunggu beberapa saat.', { parse_mode: 'HTML' });
    }
  }

  return next();
};
