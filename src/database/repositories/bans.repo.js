/**
 * Bans repository.
 */
const db = require('../connection');
const { nowSeconds } = require('../../utils/time');

module.exports = {
  banUser({ userId, bannedBy, reason = 'Violation of rules' }) {
    const now = nowSeconds();
    db.prepare('UPDATE users SET is_banned = 1 WHERE id = ?').run(userId);
    return db.prepare(`
      INSERT INTO bans (user_id, banned_by, reason, banned_at, is_active)
      VALUES (?, ?, ?, ?, 1)
    `).run(userId, bannedBy, reason, now);
  },

  unbanUser(userId) {
    const now = nowSeconds();
    db.prepare('UPDATE users SET is_banned = 0 WHERE id = ?').run(userId);
    return db.prepare('UPDATE bans SET is_active = 0, unbanned_at = ? WHERE user_id = ? AND is_active = 1')
      .run(now, userId);
  },

  isBanned(userId) {
    const user = db.prepare('SELECT is_banned FROM users WHERE id = ?').get(userId);
    return user ? user.is_banned === 1 : false;
  },
};
