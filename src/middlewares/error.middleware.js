/**
 * Global error handling middleware for grammY.
 */
const logger = require('../utils/logger');
const config = require('../config');

module.exports = async function errorHandler(err) {
  const ctx = err.ctx;
  logger.error({ err: err.error, updateId: ctx.update.update_id }, 'Error caught during Telegram update execution');

  try {
    if (ctx.callbackQuery) {
      await ctx.answerCallbackQuery({ text: '⚠️ Terjadi kesalahan pada server. Silakan coba lagi.', show_alert: true });
    } else {
      await ctx.reply('⚠️ <b>Terjadi kesalahan internal.</b> Silakan coba beberapa saat lagi.', { parse_mode: 'HTML' });
    }
  } catch (e) {
    logger.error({ err: e.message }, 'Failed to send error notification message to user');
  }

  // Notify Owner if severe error
  try {
    if (config.ownerTelegramId && ctx.api) {
      await ctx.api.sendMessage(
        config.ownerTelegramId,
        `🚨 <b>ALERT SYSTEM ERROR</b>\n` +
        `<b>Update ID:</b> ${ctx.update.update_id}\n` +
        `<b>Error:</b> <code>${err.error ? err.error.message : 'Unknown'}</code>`,
        { parse_mode: 'HTML' }
      );
    }
  } catch (e) {
    // Ignore alert send failure
  }
};
