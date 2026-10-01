/**
 * Emails repository for database queries.
 */
const db = require('../connection');
const { nowSeconds } = require('../../utils/time');
const { REQUIRED_DOMAIN } = require('../../config/constants');

module.exports = {
  createEmail({ userId, localPart, generationType, provider = 'yaoi', providerRef = null, ttlMinutes = 60 }) {
    const now = nowSeconds();
    const address = `${localPart}@${REQUIRED_DOMAIN}`;
    const expiresAt = ttlMinutes ? now + (ttlMinutes * 60) : null;

    const stmt = db.prepare(`
      INSERT INTO emails (
        user_id, address, local_part, domain, generation_type,
        provider, provider_ref, status, expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
    `);

    const res = stmt.run(
      userId,
      address,
      localPart,
      REQUIRED_DOMAIN,
      generationType,
      provider,
      providerRef,
      expiresAt,
      now,
      now
    );

    return this.findById(res.lastInsertRowid);
  },

  findById(id) {
    return db.prepare('SELECT * FROM emails WHERE id = ?').get(id);
  },

  findByAddress(address) {
    return db.prepare('SELECT * FROM emails WHERE address = ?').get(address);
  },

  listActiveByUser(userId) {
    return db.prepare("SELECT * FROM emails WHERE user_id = ? AND status = 'active' ORDER BY id DESC").all(userId);
  },

  listAllByUserPaged(userId, page = 1, pageSize = 5) {
    const offset = (page - 1) * pageSize;
    const items = db.prepare("SELECT * FROM emails WHERE user_id = ? AND status = 'active' ORDER BY id DESC LIMIT ? OFFSET ?").all(userId, pageSize, offset);
    const count = db.prepare("SELECT COUNT(*) as total FROM emails WHERE user_id = ? AND status = 'active'").get(userId).total;
    return { items, count, totalPages: Math.ceil(count / pageSize) || 1 };
  },

  listHistoryByUserPaged(userId, page = 1, pageSize = 5) {
    const offset = (page - 1) * pageSize;
    const items = db.prepare('SELECT * FROM emails WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?').all(userId, pageSize, offset);
    const count = db.prepare('SELECT COUNT(*) as total FROM emails WHERE user_id = ?').get(userId).total;
    return { items, count, totalPages: Math.ceil(count / pageSize) || 1 };
  },

  countActiveByUser(userId) {
    return db.prepare("SELECT COUNT(*) as total FROM emails WHERE user_id = ? AND status = 'active'").get(userId).total;
  },

  deleteEmail(emailId, userId) {
    const now = nowSeconds();
    return db.prepare("UPDATE emails SET status = 'deleted', deleted_at = ?, updated_at = ? WHERE id = ? AND user_id = ?")
      .run(now, now, emailId, userId);
  },

  touchLastChecked(emailId) {
    const now = nowSeconds();
    return db.prepare('UPDATE emails SET last_checked_at = ?, updated_at = ? WHERE id = ?')
      .run(now, now, emailId);
  },

  resetUnreadCount(emailId) {
    const now = nowSeconds();
    return db.prepare('UPDATE emails SET unread_count = 0, updated_at = ? WHERE id = ?')
      .run(now, emailId);
  },

  expireOldEmails() {
    const now = nowSeconds();
    return db.prepare("UPDATE emails SET status = 'expired', updated_at = ? WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at < ?")
      .run(now, now);
  },
};
