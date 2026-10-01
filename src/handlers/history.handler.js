/**
 * History handler.
 */
const emailsRepo = require('../database/repositories/emails.repo');
const messagesViews = require('../views/messages');
const { InlineKeyboard } = require('grammy');
const { CALLBACKS } = require('../config/constants');
const { formatWib } = require('../utils/time');
const escapeHtml = require('../utils/escape-html');

module.exports = async function historyHandler(ctx, pageParam = 1) {
  if (ctx.callbackQuery) await ctx.answerCallbackQuery();

  const page = parseInt(pageParam || '1', 10);
  const { items, totalPages } = emailsRepo.listHistoryByUserPaged(ctx.dbUser.id, page, 5);

  let text = `🕘 <b>RIWAYAT EMAIL ANDA</b> (Halaman ${page}/${totalPages})\n${messagesViews.SEPARATOR}\n`;

  if (!items || items.length === 0) {
    text += `<i>Belum ada riwayat pembuatan email.</i>\n`;
  } else {
    items.forEach((e, idx) => {
      const statusBadge = e.status === 'active' ? '🟢 Active' : (e.status === 'expired' ? '🟡 Expired' : '🔴 Deleted');
      text += `${idx + 1}. <code>${escapeHtml(e.address)}</code> (${statusBadge})\n`;
      text += `   ├ Dibuat: ${formatWib(e.created_at)}\n`;
      text += `   └ Total Pesan: ${e.total_messages}\n\n`;
    });
  }
  text += messagesViews.SEPARATOR;

  const kb = new InlineKeyboard();
  if (totalPages > 1) {
    const prevPage = page > 1 ? page - 1 : totalPages;
    const nextPage = page < totalPages ? page + 1 : 1;
    kb.text('◀️', `${CALLBACKS.HISTORY}:view:${prevPage}`)
      .text(`${page}/${totalPages}`, 'noop')
      .text('▶️', `${CALLBACKS.HISTORY}:view:${nextPage}`)
      .row();
  }
  kb.text('🏠 Menu Utama', `${CALLBACKS.MENU}:home`);

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
