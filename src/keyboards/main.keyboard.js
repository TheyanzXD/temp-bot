/**
 * Main menu keyboard builder.
 */
const { InlineKeyboard } = require('grammy');
const config = require('../config');
const { CALLBACKS } = require('../config/constants');

module.exports = {
  mainMenuKeyboard() {
    return new InlineKeyboard()
      .text('➕ Buat Email Baru', `${CALLBACKS.EMAIL}:new`)
      .text('✏️ Email Custom', `${CALLBACKS.EMAIL}:custom`)
      .row()
      .text('📥 Inbox', `${CALLBACKS.INBOX}:open:active:1`)
      .text('📡 Live Inbox', `${CALLBACKS.LIVE}:start`)
      .row()
      .text('📧 Email Saya', `${CALLBACKS.EMAIL}:list:1`)
      .text('🕘 Riwayat', `${CALLBACKS.HISTORY}:view:1`)
      .row()
      .text('👤 Profil', `${CALLBACKS.PROFILE}:view`)
      .text('❓ Bantuan', `${CALLBACKS.HELP}:view`)
      .row()
      .url('📢 Channel Owner', config.forceJoinUrl || 'https://t.me/telegram')
      .url('🌐 Buka Web Temp Mail', config.mailWebUrl);
  },
};
