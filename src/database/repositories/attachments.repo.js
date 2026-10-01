/**
 * Attachments repository.
 */
const db = require('../connection');
const { nowSeconds } = require('../../utils/time');

module.exports = {
  createAttachment({ messageId, filename, mimeType, sizeBytes, providerRef }) {
    const now = nowSeconds();
    const stmt = db.prepare(`
      INSERT INTO attachments (message_id, filename, mime_type, size_bytes, provider_ref, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const res = stmt.run(messageId, filename, mimeType, sizeBytes, providerRef, now);
    return db.prepare('SELECT * FROM attachments WHERE id = ?').get(res.lastInsertRowid);
  },

  listByMessageId(messageId) {
    return db.prepare('SELECT * FROM attachments WHERE message_id = ?').all(messageId);
  },

  updateTelegramFileId(id, fileId) {
    return db.prepare('UPDATE attachments SET telegram_file_id = ? WHERE id = ?').run(fileId, id);
  },
};
