/**
 * Admin Panel Handler (/admin).
 * Restricted strictly to Owner / Admin users.
 */
const statsRepo = require('../database/repositories/stats.repo');
const usersRepo = require('../database/repositories/users.repo');
const bansRepo = require('../database/repositories/bans.repo');
const settingsRepo = require('../database/repositories/settings.repo');
const activityRepo = require('../database/repositories/activity.repo');
const broadcastEngine = require('../services/broadcast');
const messagesViews = require('../views/messages');
const adminKeyboard = require('../keyboards/admin.keyboard');
const fs = require('fs');

const botStartTime = Math.floor(Date.now() / 1000);

module.exports = {
  async isAuthorized(ctx) {
    if (!ctx.dbUser || (ctx.dbUser.role !== 'owner' && ctx.dbUser.role !== 'admin')) {
      if (ctx.callbackQuery) {
        await ctx.answerCallbackQuery({ text: '⛔ Akses ditolak! Perintah khusus Owner / Admin.', show_alert: true });
      } else {
        await ctx.reply('⛔ <b>Akses ditolak!</b> Perintah ini hanya untuk Owner / Admin bot.', { parse_mode: 'HTML' });
      }
      return false;
    }
    return true;
  },

  async handleMainDashboard(ctx) {
    if (!await this.isAuthorized(ctx)) return;
    if (ctx.callbackQuery) await ctx.answerCallbackQuery();

    const uptime = Math.floor(Date.now() / 1000) - botStartTime;
    const stats = statsRepo.getDashboardStats(uptime);

    const text = messagesViews.adminDashboardMessage(stats);
    const keyboard = adminKeyboard.adminMainKeyboard();

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

  async handleUsersList(ctx, pageParam = 1) {
    if (!await this.isAuthorized(ctx)) return;
    if (ctx.callbackQuery) await ctx.answerCallbackQuery();

    const page = parseInt(pageParam || '1', 10);
    const { items, totalPages } = usersRepo.listPaged(page, 8);

    const text = `👥 <b>DAFTAR USER BOT</b> (Halaman ${page}/${totalPages})\n${messagesViews.SEPARATOR}\nPilih user di bawah untuk mengelola:`;
    const keyboard = adminKeyboard.adminUsersKeyboard(items, page, totalPages);

    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard });
    } else {
      await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
    }
  },

  async handleUserDetail(ctx, userIdParam) {
    if (!await this.isAuthorized(ctx)) return;
    if (ctx.callbackQuery) await ctx.answerCallbackQuery();

    const targetUser = usersRepo.findById(parseInt(userIdParam, 10));
    if (!targetUser) return ctx.reply('❌ User tidak ditemukan.');

    const text = (
      `👤 <b>DETAIL MANAJEMEN USER</b>\n` +
      `${messagesViews.SEPARATOR}\n` +
      `🆔 <b>ID Internal:</b> ${targetUser.id}\n` +
      `📲 <b>ID Telegram:</b> <code>${targetUser.telegram_id}</code>\n` +
      `📛 <b>Nama:</b> ${targetUser.first_name || '-'} ${targetUser.last_name || ''}\n` +
      `🏷 <b>Username:</b> @${targetUser.username || '-'}\n` +
      `👑 <b>Role:</b> ${targetUser.role}\n` +
      `🚫 <b>Status Ban:</b> ${targetUser.is_banned ? 'YA (DIBLOKIR)' : 'TIDAK'}\n` +
      `📧 <b>Email Dibuat:</b> ${targetUser.total_emails_created}\n` +
      `📨 <b>Pesan Diterima:</b> ${targetUser.total_messages_received}\n` +
      `${messagesViews.SEPARATOR}`
    );

    const keyboard = adminKeyboard.adminUserDetailKeyboard(targetUser);

    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard });
    } else {
      await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
    }
  },

  async handleBanUser(ctx, userIdParam) {
    if (!await this.isAuthorized(ctx)) return;
    const targetUser = usersRepo.findById(parseInt(userIdParam, 10));
    if (!targetUser) return ctx.answerCallbackQuery({ text: '❌ User tidak ditemukan.' });

    bansRepo.banUser({ userId: targetUser.id, bannedBy: ctx.dbUser.id, reason: 'Banned by owner via bot panel' });
    activityRepo.logActivity({ userId: ctx.dbUser.id, action: 'ban', detail: { targetTelegramId: targetUser.telegram_id } });

    await ctx.answerCallbackQuery({ text: `🚫 User ${targetUser.telegram_id} telah diban.` });
    await this.handleUserDetail(ctx, targetUser.id);
  },

  async handleUnbanUser(ctx, userIdParam) {
    if (!await this.isAuthorized(ctx)) return;
    const targetUser = usersRepo.findById(parseInt(userIdParam, 10));
    if (!targetUser) return ctx.answerCallbackQuery({ text: '❌ User tidak ditemukan.' });

    bansRepo.unbanUser(targetUser.id);
    activityRepo.logActivity({ userId: ctx.dbUser.id, action: 'unban', detail: { targetTelegramId: targetUser.telegram_id } });

    await ctx.answerCallbackQuery({ text: `✅ User ${targetUser.telegram_id} telah di-unban.` });
    await this.handleUserDetail(ctx, targetUser.id);
  },

  async handleBackup(ctx) {
    if (!await this.isAuthorized(ctx)) return;
    await ctx.answerCallbackQuery({ text: '💾 Membuat backup SQLite...' });

    try {
      const backupPath = statsRepo.backupDatabase();
      await ctx.replyWithDocument(
        { source: backupPath },
        { caption: `💾 <b>BACKUP DATABASE SUCCESS</b>\n${messagesViews.SEPARATOR}\nFile backup SQLite berhasil disalin.` }
      );
    } catch (err) {
      await ctx.reply(`❌ <b>Gagal backup database:</b> ${err.message}`, { parse_mode: 'HTML' });
    }
  },

  async handleBroadcastPrompt(ctx) {
    if (!await this.isAuthorized(ctx)) return;
    if (ctx.callbackQuery) await ctx.answerCallbackQuery();

    ctx.session = ctx.session || {};
    ctx.session.awaitingBroadcastText = true;

    await ctx.reply(
      `📣 <b>BROADCAST PESAN KE SEMUA USER</b>\n${messagesViews.SEPARATOR}\nKetik atau kirim teks pesan broadcast yang ingin disebarkan (dukung HTML formatting).`,
      { parse_mode: 'HTML' }
    );
  },

  async handleBroadcastInput(ctx) {
    if (!ctx.session || !ctx.session.awaitingBroadcastText) return false;
    ctx.session.awaitingBroadcastText = false;

    const broadcastText = ctx.message.text;
    await ctx.reply(`⏳ <b>Memulai pengiriman broadcast ke seluruh pengguna...</b>`, { parse_mode: 'HTML' });

    const result = await broadcastEngine.runBroadcast(ctx.bot, ctx.dbUser.id, broadcastText);
    activityRepo.logActivity({ userId: ctx.dbUser.id, action: 'broadcast', detail: result });

    await ctx.reply(
      `📣 <b>BROADCAST SELESAI!</b>\n` +
      `${messagesViews.SEPARATOR}\n` +
      `🎯 <b>Total Target:</b> ${result.totalTarget}\n` +
      `✅ <b>Berhasil Disampaikan:</b> ${result.successCount}\n` +
      `❌ <b>Gagal (Bot Diblokir/Err):</b> ${result.failedCount}`,
      { parse_mode: 'HTML' }
    );
    return true;
  },

  async handleSettingsView(ctx) {
    if (!await this.isAuthorized(ctx)) return;
    if (ctx.callbackQuery) await ctx.answerCallbackQuery();

    const allSettings = settingsRepo.getAll();
    const text = (
      `⚙️ <b>PENGATURAN BOT SYSTEM</b>\n` +
      `${messagesViews.SEPARATOR}\n` +
      `• <b>Force Join Channel:</b> ${allSettings.force_join_enabled === '1' ? '🟢 Aktif' : '🔴 Nonaktif'}\n` +
      `• <b>Mode Maintenance:</b> ${allSettings.maintenance_mode === '1' ? '🔴 Aktif' : '🟢 Normal'}\n` +
      `• <b>Max Email per User:</b> ${allSettings.max_emails_per_user || 5}\n` +
      `• <b>Email TTL Minutes:</b> ${allSettings.email_ttl_minutes || 60}\n` +
      `${messagesViews.SEPARATOR}`
    );

    const keyboard = adminKeyboard.adminSettingsKeyboard(allSettings);

    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard });
    } else {
      await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
    }
  },

  async handleSettingsToggle(ctx, keyParam) {
    if (!await this.isAuthorized(ctx)) return;
    const currentVal = settingsRepo.get(keyParam, '0');
    const newVal = currentVal === '1' ? '0' : '1';

    settingsRepo.set(keyParam, newVal);
    await ctx.answerCallbackQuery({ text: `⚙️ Pengaturan ${keyParam} diubah ke ${newVal}.` });
    await this.handleSettingsView(ctx);
  },

  async handleLogsView(ctx) {
    if (!await this.isAuthorized(ctx)) return;
    if (ctx.callbackQuery) await ctx.answerCallbackQuery();

    const logs = activityRepo.listRecent(10);
    let text = `📜 <b>LOG AKTIVITAS TERBARU (10 Terakhir)</b>\n${messagesViews.SEPARATOR}\n`;

    logs.forEach((l) => {
      text += `• <b>[${l.action}]</b> user ID: ${l.user_id || 'sys'} (${l.username ? '@' + l.username : ''})\n  <i>${l.detail || ''}</i>\n`;
    });
    text += messagesViews.SEPARATOR;

    const keyboard = adminKeyboard.adminMainKeyboard();

    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard });
    } else {
      await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
    }
  },
};
