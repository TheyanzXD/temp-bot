/**
 * Messages repository for database queries.
 */
const db = require('../connection');
const { nowSeconds } = require('../../utils/time');

module.exports = {
  createMessage({
    emailId,
    userId,
    providerMessageId,
    fromAddress,
    fromName,
    toAddress,
    subject,
    bodyText,
    bodyHtml,
    snippet,
    otpDetected = null,
    linksJson = null,
    hasAttachments = 0,
    sizeBytes = 0,
    receivedAt,
  }) {
    const now = nowSeconds();

    const stmt = db.prepare(`
      INSERT OR IGNORE INTO messages (
        email_id, user_id, provider_message_id, from_address, from_name,
        to_address, subject, body_text, body_html, snippet, otp_detected,
        links_json, has_attachments, size_bytes, received_at, fetched_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const res = stmt.run(
      emailId,
      userId,
      providerMessageId,
      fromAddress,
      fromName,
      toAddress,
      subject,
      bodyText,
      bodyHtml,
      snippet,
      otpDetected,
      linksJson,
      hasAttachments,
      sizeBytes,
      receivedAt || now,
      now,
      now
    );

    if (res.changes > 0) {
      return this.findById(res.lastInsertRowid);
    }
    return null; // Ignore duplicate
  },

  findById(id) {
    return db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
  },

  listByEmailPaged(emailId, page = 1, pageSize = 5) {
    const offset = (page - 1) * pageSize;
    const items = db.prepare('SELECT * FROM messages WHERE email_id = ? ORDER BY received_at DESC, id DESC LIMIT ? OFFSET ?').all(emailId, pageSize, offset);
    const count = db.prepare('SELECT COUNT(*) as total FROM messages WHERE email_id = ?').get(emailId).total;
    return { items, count, totalPages: Math.ceil(count / pageSize) || 1 };
  },

  markAsRead(id) {
    return db.prepare('UPDATE messages SET is_read = 1 WHERE id = ?').run(id);
  },

  markAsNotified(id) {
    return db.prepare('UPDATE messages SET is_notified = 1 WHERE id = ?').run(id);
  },

  deleteMessage(id, userId) {
    return db.prepare('DELETE FROM messages WHERE id = ? AND user_id = ?').run(id, userId);
  },
};
