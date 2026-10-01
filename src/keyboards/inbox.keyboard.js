/**
 * Inbox and Message reading keyboards.
 */
const { InlineKeyboard } = require('grammy');
const { CALLBACKS } = require('../config/constants');

module.exports = {
  inboxListKeyboard(emailId, messages, currentPage, totalPages) {
    const kb = new InlineKeyboard();

    messages.forEach((m, idx) => {
      const label = `${idx + 1}. ${m.is_read ? '' : '🆕 '}${m.subject ? m.subject.substring(0, 25) : 'Tanpa Subjek'}`;
      kb.text(label, `${CALLBACKS.MSG}:read:${m.id}`).row();
    });

    if (totalPages > 1) {
      const prevPage = currentPage > 1 ? currentPage - 1 : totalPages;
      const nextPage = currentPage < totalPages ? currentPage + 1 : 1;
      kb.text('◀️', `${CALLBACKS.INBOX}:open:${emailId}:${prevPage}`)
        .text(`${currentPage}/${totalPages}`, 'noop')
        .text('▶️', `${CALLBACKS.INBOX}:open:${emailId}:${nextPage}`)
        .row();
    }

    kb.text('🔄 Refresh Manual', `${CALLBACKS.INBOX}:open:${emailId}:${currentPage}`)
      .text('📡 Mode Live', `${CALLBACKS.LIVE}:start:${emailId}`)
      .row()
      .text('🏠 Menu Utama', `${CALLBACKS.MENU}:home`);

    return kb;
  },

  messageDetailKeyboard(msgId, emailId, links = []) {
    const kb = new InlineKeyboard();

    if (links && links.length > 0) {
      links.slice(0, 3).forEach((link, idx) => {
        kb.url(`🔗 Open ${link.text}`, link.url).row();
      });
    }

    kb.text('🗑 Hapus Pesan', `${CALLBACKS.MSG}:delete:${msgId}`)
      .text('⬅️ Kembali Ke Inbox', `${CALLBACKS.INBOX}:open:${emailId}:1`);

    return kb;
  },

  newMessageNotificationKeyboard(msgId, otpCode = null) {
    const kb = new InlineKeyboard();
    kb.text('📖 Baca Lengkap', `${CALLBACKS.MSG}:read:${msgId}`);
    if (otpCode) {
      kb.text('🔑 Salin OTP', `noop`);
    }
    kb.row().text('🗑 Hapus Pesan', `${CALLBACKS.MSG}:delete:${msgId}`);
    return kb;
  },

  liveInboxKeyboard(emailId) {
    return new InlineKeyboard()
      .text('⏸ Stop Live', `${CALLBACKS.LIVE}:stop:${emailId}`)
      .text('🔄 Refresh Manual', `${CALLBACKS.LIVE}:refresh:${emailId}`)
      .row()
      .text('📥 Buka Inbox', `${CALLBACKS.INBOX}:open:${emailId}:1`)
      .text('🗑 Hapus Email', `${CALLBACKS.EMAIL}:delete:${emailId}`)
      .row()
      .text('🏠 Menu Utama', `${CALLBACKS.MENU}:home`);
  },

  liveStoppedKeyboard(emailId) {
    return new InlineKeyboard()
      .text('▶️ Mulai Live Lagi', `${CALLBACKS.LIVE}:start:${emailId}`)
      .text('🏠 Menu Utama', `${CALLBACKS.MENU}:home`);
  },
};
