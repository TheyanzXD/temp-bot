/**
 * Email management keyboard builder.
 */
const { InlineKeyboard } = require('grammy');
const { CALLBACKS } = require('../config/constants');

module.exports = {
  myEmailsListKeyboard(emails, activeEmailId, currentPage, totalPages) {
    const kb = new InlineKeyboard();

    emails.forEach((e) => {
      const isActive = e.id === activeEmailId ? '🟢 ' : '';
      kb.text(`${isActive}${e.address}`, `${CALLBACKS.EMAIL}:select:${e.id}`).row();
    });

    // Pagination
    if (totalPages > 1) {
      const prevPage = currentPage > 1 ? currentPage - 1 : totalPages;
      const nextPage = currentPage < totalPages ? currentPage + 1 : 1;
      kb.text('◀️ Sebelumnya', `${CALLBACKS.EMAIL}:list:${prevPage}`)
        .text(`Halaman ${currentPage}/${totalPages}`, 'noop')
        .text('Berikutnya ▶️', `${CALLBACKS.EMAIL}:list:${nextPage}`)
        .row();
    }

    kb.text('➕ Buat Email Baru', `${CALLBACKS.EMAIL}:new`)
      .text('🏠 Menu Utama', `${CALLBACKS.MENU}:home`);

    return kb;
  },

  emailDetailKeyboard(emailId, isActive) {
    const kb = new InlineKeyboard();

    if (!isActive) {
      kb.text('✅ Jadikan Aktif', `${CALLBACKS.EMAIL}:make_active:${emailId}`).row();
    }

    kb.text('📥 Buka Inbox', `${CALLBACKS.INBOX}:open:${emailId}:1`)
      .text('📡 Live Inbox', `${CALLBACKS.LIVE}:start:${emailId}`)
      .row()
      .text('🗑 Hapus Email', `${CALLBACKS.EMAIL}:delete:${emailId}`)
      .text('⬅️ Kembali', `${CALLBACKS.EMAIL}:list:1`);

    return kb;
  },

  deleteConfirmKeyboard(emailId) {
    return new InlineKeyboard()
      .text('✅ Ya, Hapus', `${CALLBACKS.EMAIL}:delete_confirm:${emailId}`)
      .text('❌ Batal', `${CALLBACKS.EMAIL}:select:${emailId}`);
  },
};
