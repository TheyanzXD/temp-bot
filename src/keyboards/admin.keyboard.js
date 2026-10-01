/**
 * Admin Panel Keyboards.
 */
const { InlineKeyboard } = require('grammy');
const { CALLBACKS } = require('../config/constants');

module.exports = {
  adminMainKeyboard() {
    return new InlineKeyboard()
      .text('📊 Refresh Statistik', `${CALLBACKS.ADMIN}:stats`)
      .text('👥 Daftar User', `${CALLBACKS.ADMIN}:users:1`)
      .row()
      .text('📣 Broadcast Pesan', `${CALLBACKS.ADMIN}:broadcast_prompt`)
      .text('⚙️ Pengaturan Bot', `${CALLBACKS.ADMIN}:settings`)
      .row()
      .text('💾 Backup Database', `${CALLBACKS.ADMIN}:backup`)
      .text('📜 Log Aktivitas', `${CALLBACKS.ADMIN}:logs`)
      .row()
      .text('🏠 Menu Utama', `${CALLBACKS.MENU}:home`);
  },

  adminUsersKeyboard(users, currentPage, totalPages) {
    const kb = new InlineKeyboard();

    users.forEach((u) => {
      const banText = u.is_banned ? '🚫' : '✅';
      kb.text(`${banText} ${u.first_name || 'User'} (${u.telegram_id})`, `${CALLBACKS.ADMIN}:user_detail:${u.id}`).row();
    });

    if (totalPages > 1) {
      const prevPage = currentPage > 1 ? currentPage - 1 : totalPages;
      const nextPage = currentPage < totalPages ? currentPage + 1 : 1;
      kb.text('◀️', `${CALLBACKS.ADMIN}:users:${prevPage}`)
        .text(`${currentPage}/${totalPages}`, 'noop')
        .text('▶️', `${CALLBACKS.ADMIN}:users:${nextPage}`)
        .row();
    }

    kb.text('⬅️ Admin Panel', `${CALLBACKS.ADMIN}:main`);
    return kb;
  },

  adminUserDetailKeyboard(user) {
    const kb = new InlineKeyboard();
    if (user.is_banned) {
      kb.text('✅ Unban User', `${CALLBACKS.ADMIN}:unban:${user.id}`);
    } else {
      kb.text('🚫 Ban User', `${CALLBACKS.ADMIN}:ban:${user.id}`);
    }
    kb.row().text('⬅️ Kembali', `${CALLBACKS.ADMIN}:users:1`);
    return kb;
  },

  adminSettingsKeyboard(settings) {
    const forceJoinText = settings.force_join_enabled === '1' ? '🟢 Aktif' : '🔴 Nonaktif';
    const maintText = settings.maintenance_mode === '1' ? '🔴 Maintenance' : '🟢 Normal';

    return new InlineKeyboard()
      .text(`Force Join: ${forceJoinText}`, `${CALLBACKS.ADMIN}:toggle:force_join_enabled`)
      .row()
      .text(`Mode Maintenance: ${maintText}`, `${CALLBACKS.ADMIN}:toggle:maintenance_mode`)
      .row()
      .text('⬅️ Admin Panel', `${CALLBACKS.ADMIN}:main`);
  },
};
