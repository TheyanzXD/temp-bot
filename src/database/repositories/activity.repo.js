/**
 * Activity logs repository.
 */
const db = require('../connection');
const { nowSeconds } = require('../../utils/time');

module.exports = {
  logActivity({ userId, action, detail = null, emailId = null, messageId = null, chatId = null }) {
    const now = nowSeconds();
    const detailStr = typeof detail === 'object' ? JSON.stringify(detail) : detail;
    const stmt = db.prepare(`
      INSERT INTO activity_logs (user_id, action, detail, email_id, message_id, chat_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(userId || null, action, detailStr, emailId, messageId, chatId, now);
  },

  listRecent(limit = 20) {
    return db.prepare(`
      SELECT a.*, u.username, u.telegram_id 
      FROM activity_logs a
      LEFT JOIN users u ON u.id = a.user_id
      ORDER BY a.id DESC LIMIT ?
    `).all(limit);
  },

  cleanOldLogs(days = 90) {
    const cutoff = nowSeconds() - (days * 86400);
    return db.prepare('DELETE FROM activity_logs WHERE created_at < ?').run(cutoff);
  },
};
