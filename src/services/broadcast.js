/**
 * Admin broadcast messaging engine with rate throttling.
 */
const db = require('../database/connection');
const { nowSeconds } = require('../utils/time');
const sleep = require('../utils/sleep');
const logger = require('../utils/logger');

class BroadcastEngine {
  /**
   * Broadcast message to all non-banned users
   * @param {Object} bot grammY bot instance
   * @param {number} adminId Admin DB user ID
   * @param {string} text Broadcast message text
   */
  async runBroadcast(bot, adminId, text) {
    const users = db.prepare('SELECT telegram_id FROM users WHERE is_banned = 0').all();
    const totalTarget = users.length;
    const now = nowSeconds();

    const res = db.prepare(`
      INSERT INTO broadcasts (admin_id, text, total_target, total_success, total_failed, started_at)
      VALUES (?, ?, ?, 0, 0, ?)
    `).run(adminId, text, totalTarget, now);

    const broadcastId = res.lastInsertRowid;
    let successCount = 0;
    let failedCount = 0;

    for (const u of users) {
      try {
        await bot.api.sendMessage(u.telegram_id, text, { parse_mode: 'HTML' });
        successCount++;
      } catch (err) {
        failedCount++;
        logger.warn({ err: err.message, telegramId: u.telegram_id }, 'Broadcast delivery failed');
      }

      // Throttle: 30 messages / sec maximum (35ms delay)
      await sleep(35);
    }

    const finishedAt = nowSeconds();
    db.prepare(`
      UPDATE broadcasts
      SET total_success = ?, total_failed = ?, finished_at = ?
      WHERE id = ?
    `).run(successCount, failedCount, finishedAt, broadcastId);

    return { totalTarget, successCount, failedCount };
  }
}

module.exports = new BroadcastEngine();
