/**
 * Users repository for database queries.
 */
const db = require('../connection');
const { nowSeconds } = require('../../utils/time');
const config = require('../../config');

module.exports = {
  findByTelegramId(telegramId) {
    return db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);
  },

  findById(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  },

  upsertFromTelegram(ctx) {
    const tgUser = ctx.from;
    if (!tgUser) return null;

    const now = nowSeconds();
    const existing = this.findByTelegramId(tgUser.id);
    const role = tgUser.id === config.ownerTelegramId ? 'owner' : (existing ? existing.role : 'user');

    if (!existing) {
      const stmt = db.prepare(`
        INSERT INTO users (
          telegram_id, username, first_name, last_name, language_code,
          is_premium, is_bot, role, first_seen_at, last_seen_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const res = stmt.run(
        tgUser.id,
        tgUser.username || null,
        tgUser.first_name || null,
        tgUser.last_name || null,
        tgUser.language_code || 'id',
        tgUser.is_premium ? 1 : 0,
        tgUser.is_bot ? 1 : 0,
        role,
        now,
        now,
        now,
        now
      );
      return this.findById(res.lastInsertRowid);
    } else {
      db.prepare(`
        UPDATE users SET
          username = ?,
          first_name = ?,
          last_name = ?,
          language_code = ?,
          is_premium = ?,
          last_seen_at = ?,
          updated_at = ?
        WHERE id = ?
      `).run(
        tgUser.username || null,
        tgUser.first_name || null,
        tgUser.last_name || null,
        tgUser.language_code || 'id',
        tgUser.is_premium ? 1 : 0,
        now,
        now,
        existing.id
      );
      return this.findById(existing.id);
    }
  },

  setActiveEmail(userId, emailId) {
    const now = nowSeconds();
    return db.prepare('UPDATE users SET active_email_id = ?, updated_at = ? WHERE id = ?')
      .run(emailId, now, userId);
  },

  updateChannelJoinStatus(userId, hasJoined) {
    const now = nowSeconds();
    return db.prepare('UPDATE users SET has_joined_channel = ?, last_join_check_at = ?, updated_at = ? WHERE id = ?')
      .run(hasJoined ? 1 : 0, now, now, userId);
  },

  incrementCounter(userId, field) {
    const validFields = ['total_emails_created', 'total_messages_received', 'total_commands'];
    if (!validFields.includes(field)) return;
    const now = nowSeconds();
    db.prepare(`UPDATE users SET ${field} = ${field} + 1, updated_at = ? WHERE id = ?`)
      .run(now, userId);
  },

  setRole(userId, role) {
    const now = nowSeconds();
    return db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?')
      .run(role, now, userId);
  },

  setBanStatus(userId, isBanned) {
    const now = nowSeconds();
    return db.prepare('UPDATE users SET is_banned = ?, updated_at = ? WHERE id = ?')
      .run(isBanned ? 1 : 0, now, userId);
  },

  listPaged(page = 1, pageSize = 8) {
    const offset = (page - 1) * pageSize;
    const items = db.prepare('SELECT * FROM users ORDER BY id DESC LIMIT ? OFFSET ?').all(pageSize, offset);
    const count = db.prepare('SELECT COUNT(*) as total FROM users').get().total;
    return { items, count, totalPages: Math.ceil(count / pageSize) };
  },
};
