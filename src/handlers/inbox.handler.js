/**
 * Inbox and message reading handlers.
 */
const emailsRepo = require('../database/repositories/emails.repo');
const messagesRepo = require('../database/repositories/messages.repo');
const activityRepo = require('../database/repositories/activity.repo');
const messagesViews = require('../views/messages');
const inboxKeyboard = require('../keyboards/inbox.keyboard');

module.exports = {
  async handleOpenInbox(ctx, targetEmailIdParam, pageParam = 1) {
    if (ctx.callbackQuery) await ctx.answerCallbackQuery();

    let email = null;
    if (targetEmailIdParam === 'active' || !targetEmailIdParam) {
      if (ctx.dbUser.active_email_id) {
        email = emailsRepo.findById(ctx.dbUser.active_email_id);
      }
    } else {
      const emailId = parseInt(targetEmailIdParam, 10);
      email = emailsRepo.findById(emailId);
    }

    if (!email || email.user_id !== ctx.dbUser.id || email.status !== 'active') {
      const text = `❌ <b>Tidak Ada Email Aktif</b>\n━━━━━━━━━━━━━━━━━━\nSilakan buat email baru terlebih dahulu.`;
      if (ctx.callbackQuery) {
        return ctx.editMessageText(text, { parse_mode: 'HTML' });
      } else {
        return ctx.reply(text, { parse_mode: 'HTML' });
      }
    }

    const page = parseInt(pageParam || '1', 10);
    const pageResult = messagesRepo.listByEmailPaged(email.id, page, 5);

    const text = messagesViews.inboxViewMessage(email.address, pageResult.items, page, pageResult.totalPages, false);
    const keyboard = inboxKeyboard.inboxListKeyboard(email.id, pageResult.items, page, pageResult.totalPages);

    activityRepo.logActivity({ userId: ctx.dbUser.id, action: 'view_inbox', emailId: email.id });

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

  async handleReadMessage(ctx, messageIdParam) {
    if (ctx.callbackQuery) await ctx.answerCallbackQuery();

    const msgId = parseInt(messageIdParam, 10);
    const msg = messagesRepo.findById(msgId);

    if (!msg || msg.user_id !== ctx.dbUser.id) {
      return ctx.reply('❌ Pesan tidak ditemukan.');
    }

    messagesRepo.markAsRead(msg.id);
    activityRepo.logActivity({ userId: ctx.dbUser.id, action: 'read_message', messageId: msg.id });

    let links = [];
    if (msg.links_json) {
      try {
        links = JSON.parse(msg.links_json);
      } catch (e) {}
    }

    const text = messagesViews.messageDetailMessage(msg);
    const keyboard = inboxKeyboard.messageDetailKeyboard(msg.id, msg.email_id, links);

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

  async handleDeleteMessage(ctx, messageIdParam) {
    const msgId = parseInt(messageIdParam, 10);
    const msg = messagesRepo.findById(msgId);

    if (!msg || msg.user_id !== ctx.dbUser.id) {
      return ctx.answerCallbackQuery({ text: '❌ Pesan tidak ditemukan.', show_alert: true });
    }

    messagesRepo.deleteMessage(msg.id, ctx.dbUser.id);
    await ctx.answerCallbackQuery({ text: '✅ Pesan telah dihapus.' });
    await this.handleOpenInbox(ctx, msg.email_id, 1);
  },
};
