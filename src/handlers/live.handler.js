/**
 * Live 5-second streaming inbox handler.
 */
const emailsRepo = require('../database/repositories/emails.repo');
const messagesRepo = require('../database/repositories/messages.repo');
const activityRepo = require('../database/repositories/activity.repo');
const statsRepo = require('../database/repositories/stats.repo');
const db = require('../database/connection');
const messagesViews = require('../views/messages');
const inboxKeyboard = require('../keyboards/inbox.keyboard');
const { nowSeconds } = require('../utils/time');

module.exports = {
  async handleStartLive(ctx, targetEmailIdParam) {
    if (ctx.callbackQuery) await ctx.answerCallbackQuery({ text: '📡 Memulai mode live 5 dtk...' });

    let email = null;
    if (!targetEmailIdParam || targetEmailIdParam === 'active') {
      if (ctx.dbUser.active_email_id) {
        email = emailsRepo.findById(ctx.dbUser.active_email_id);
      }
    } else {
      const emailId = parseInt(targetEmailIdParam, 10);
      email = emailsRepo.findById(emailId);
    }

    if (!email || email.user_id !== ctx.dbUser.id || email.status !== 'active') {
      return ctx.reply('❌ Tidak ada email aktif untuk mode live.');
    }

    // Stop existing active live sessions for this user
    db.prepare(`
      UPDATE live_sessions
      SET is_active = 0, ended_at = ?, end_reason = 'user_switch'
      WHERE user_id = ? AND is_active = 1
    `).run(nowSeconds(), ctx.dbUser.id);

    const pageResult = messagesRepo.listByEmailPaged(email.id, 1, 5);
    const text = messagesViews.inboxViewMessage(email.address, pageResult.items, 1, pageResult.totalPages, true);
    const keyboard = inboxKeyboard.liveInboxKeyboard(email.id);

    let sentMsg = null;
    if (ctx.callbackQuery) {
      try {
        sentMsg = await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard });
      } catch (e) {
        sentMsg = await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
      }
    } else {
      sentMsg = await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
    }

    const chatId = sentMsg.chat.id;
    const messageId = sentMsg.message_id;
    const now = nowSeconds();

    db.prepare(`
      INSERT INTO live_sessions (user_id, email_id, chat_id, message_id, started_at, last_refresh_at, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(ctx.dbUser.id, email.id, chatId, messageId, now, now);

    activityRepo.logActivity({ userId: ctx.dbUser.id, action: 'start_live', emailId: email.id, chatId });
    statsRepo.recordDailyStat('live_sessions');
  },

  async handleStopLive(ctx, targetEmailIdParam) {
    if (ctx.callbackQuery) await ctx.answerCallbackQuery({ text: '⏸ Mode live dihentikan.' });

    db.prepare(`
      UPDATE live_sessions
      SET is_active = 0, ended_at = ?, end_reason = 'user_stop'
      WHERE user_id = ? AND is_active = 1
    `).run(nowSeconds(), ctx.dbUser.id);

    activityRepo.logActivity({ userId: ctx.dbUser.id, action: 'stop_live' });

    const emailId = parseInt(targetEmailIdParam, 10);
    const text = `⏸ <b>MODE LIVE DIHENTIKAN</b>\n${messagesViews.SEPARATOR}\nMode live streaming telah dihentikan secara manual.\nTekan tombol di bawah jika ingin melanjutkan.`;
    const keyboard = inboxKeyboard.liveStoppedKeyboard(emailId);

    if (ctx.callbackQuery) {
      try {
        await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard });
      } catch (e) {
        await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
      }
    } else {
      await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
    }
  },
};
