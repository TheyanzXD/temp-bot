/**
 * Email management handlers (/new, /custom, email listing, deleting).
 */
const emailGenerator = require('../services/email-generator');
const emailsRepo = require('../database/repositories/emails.repo');
const usersRepo = require('../database/repositories/users.repo');
const activityRepo = require('../database/repositories/activity.repo');
const messagesViews = require('../views/messages');
const emailKeyboard = require('../keyboards/email.keyboard');
const { mainMenuKeyboard } = require('../keyboards/main.keyboard');

module.exports = {
  async handleNewRandom(ctx) {
    if (ctx.callbackQuery) await ctx.answerCallbackQuery({ text: '⏳ Membuat email baru...' });

    try {
      const email = await emailGenerator.generateRandomEmail(ctx.dbUser);
      const text = messagesViews.emailCreatedSuccess(email.address, email.expires_at);
      await ctx.reply(text, { parse_mode: 'HTML', reply_markup: mainMenuKeyboard() });
    } catch (err) {
      await ctx.reply(`❌ <b>Gagal membuat email:</b> ${err.message}`, { parse_mode: 'HTML' });
    }
  },

  async handleCustomPrompt(ctx) {
    if (ctx.callbackQuery) await ctx.answerCallbackQuery();

    // Check if user passed parameter directly: /custom username or /custom username@yaoi.web.id
    const match = ctx.message && ctx.message.text ? ctx.message.text.trim().split(/\s+/) : [];
    if (match.length > 1) {
      const inputArg = match.slice(1).join(' ');
      try {
        const email = await emailGenerator.generateCustomEmail(ctx.dbUser, inputArg);
        const text = messagesViews.emailCreatedSuccess(email.address, email.expires_at);
        return await ctx.reply(text, { parse_mode: 'HTML', reply_markup: mainMenuKeyboard() });
      } catch (err) {
        return await ctx.reply(`❌ <b>Gagal membuat email custom:</b> ${err.message}`, { parse_mode: 'HTML' });
      }
    }

    ctx.session = ctx.session || {};
    ctx.session.awaitingCustomEmail = true;

    await ctx.reply(messagesViews.customEmailPrompt(), { parse_mode: 'HTML' });
  },

  async handleCustomInput(ctx) {
    if (!ctx.session || !ctx.session.awaitingCustomEmail) return false;
    ctx.session.awaitingCustomEmail = false;

    const input = ctx.message.text;
    try {
      const email = await emailGenerator.generateCustomEmail(ctx.dbUser, input);
      const text = messagesViews.emailCreatedSuccess(email.address, email.expires_at);
      await ctx.reply(text, { parse_mode: 'HTML', reply_markup: mainMenuKeyboard() });
    } catch (err) {
      await ctx.reply(`❌ <b>Gagal membuat email custom:</b> ${err.message}`, { parse_mode: 'HTML' });
    }
    return true;
  },

  async handleList(ctx, page = 1) {
    if (ctx.callbackQuery) await ctx.answerCallbackQuery();
    const p = parseInt(page || '1', 10);
    const { items, totalPages } = emailsRepo.listAllByUserPaged(ctx.dbUser.id, p, 5);

    const text = messagesViews.myEmailsMessage(items, ctx.dbUser.active_email_id, p, totalPages);
    const keyboard = emailKeyboard.myEmailsListKeyboard(items, ctx.dbUser.active_email_id, p, totalPages);

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

  async handleSelect(ctx, emailId) {
    if (ctx.callbackQuery) await ctx.answerCallbackQuery();
    const id = parseInt(emailId, 10);
    const email = emailsRepo.findById(id);

    if (!email || email.user_id !== ctx.dbUser.id) {
      return ctx.reply('❌ Email tidak ditemukan.');
    }

    const isActive = ctx.dbUser.active_email_id === email.id;
    const text = messagesViews.emailDetailMessage(email, isActive);
    const keyboard = emailKeyboard.emailDetailKeyboard(email.id, isActive);

    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard });
    } else {
      await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
    }
  },

  async handleMakeActive(ctx, emailId) {
    const id = parseInt(emailId, 10);
    const email = emailsRepo.findById(id);

    if (!email || email.user_id !== ctx.dbUser.id) {
      return ctx.answerCallbackQuery({ text: '❌ Email tidak ditemukan.', show_alert: true });
    }

    usersRepo.setActiveEmail(ctx.dbUser.id, email.id);
    ctx.dbUser.active_email_id = email.id;

    await ctx.answerCallbackQuery({ text: `🟢 Email ${email.address} sekarang menjadi email aktif!` });
    await this.handleSelect(ctx, emailId);
  },

  async handleDeleteRequest(ctx, emailId) {
    await ctx.answerCallbackQuery();
    const id = parseInt(emailId, 10);
    const email = emailsRepo.findById(id);

    if (!email || email.user_id !== ctx.dbUser.id) {
      return ctx.reply('❌ Email tidak ditemukan.');
    }

    await ctx.editMessageText(
      `❓ <b>Konfirmasi Hapus Email</b>\n━━━━━━━━━━━━━━━━━━\nApakah Anda yakin ingin menghapus <code>${email.address}</code>? Semua pesan di dalamnya akan ikut terhapus.`,
      {
        parse_mode: 'HTML',
        reply_markup: emailKeyboard.deleteConfirmKeyboard(email.id),
      }
    );
  },

  async handleDeleteConfirm(ctx, emailId) {
    const id = parseInt(emailId, 10);
    const email = emailsRepo.findById(id);

    if (!email || email.user_id !== ctx.dbUser.id) {
      return ctx.answerCallbackQuery({ text: '❌ Email tidak ditemukan.', show_alert: true });
    }

    emailsRepo.deleteEmail(email.id, ctx.dbUser.id);
    if (ctx.dbUser.active_email_id === email.id) {
      const remaining = emailsRepo.listActiveByUser(ctx.dbUser.id);
      usersRepo.setActiveEmail(ctx.dbUser.id, remaining.length > 0 ? remaining[0].id : null);
    }

    activityRepo.logActivity({ userId: ctx.dbUser.id, action: 'delete_email', detail: { address: email.address } });
    await ctx.answerCallbackQuery({ text: '✅ Email berhasil dihapus.' });
    await this.handleList(ctx, 1);
  },
};
