/**
 * Stats repository for analytics and database backups.
 */
const db = require('../connection');
const fs = require('fs');
const path = require('path');
const config = require('../../config');
const { getTodayString, nowSeconds } = require('../../utils/time');
const logger = require('../../utils/logger');

module.exports = {
  recordDailyStat(field) {
    const today = getTodayString();
    const validFields = ['new_users', 'active_users', 'emails_created', 'messages_received', 'commands_used', 'live_sessions'];
    if (!validFields.includes(field)) return;

    db.prepare(`
      INSERT INTO daily_stats (date, ${field}) VALUES (?, 1)
      ON CONFLICT(date) DO UPDATE SET ${field} = ${field} + 1
    `).run(today);
  },

  getDashboardStats(uptimeSeconds = 0) {
    const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
    const todayStr = getTodayString();
    const todayRow = db.prepare('SELECT active_users FROM daily_stats WHERE date = ?').get(todayStr);
    const activeUsersToday = todayRow ? todayRow.active_users : 0;

    const totalEmails = db.prepare('SELECT COUNT(*) as c FROM emails').get().c;
    const totalMessages = db.prepare('SELECT COUNT(*) as c FROM messages').get().c;
    const activeLiveSessions = db.prepare('SELECT COUNT(*) as c FROM live_sessions WHERE is_active = 1').get().c;

    let dbSizeBytes = 0;
    try {
      const stat = fs.statSync(config.dbPath);
      dbSizeBytes = stat.size;
    } catch (e) {
      dbSizeBytes = 0;
    }

    const hours = Math.floor(uptimeSeconds / 3600);
    const mins = Math.floor((uptimeSeconds % 3600) / 60);
    const uptimeFormatted = `${hours}j ${mins}m`;

    return {
      totalUsers,
      activeUsersToday,
      totalEmails,
      totalMessages,
      activeLiveSessions,
      dbSizeBytes,
      uptimeFormatted,
    };
  },

  backupDatabase() {
    const backupDir = path.resolve(process.cwd(), './data/backup');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const filename = `backup_${Date.now()}.sqlite`;
    const backupPath = path.join(backupDir, filename);

    db.prepare(`VACUUM INTO ?`).run(backupPath);
    logger.info({ backupPath }, 'Database VACUUM backup completed.');
    return backupPath;
  },
};
