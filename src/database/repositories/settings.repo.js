/**
 * Settings repository (key-value store).
 */
const db = require('../connection');
const { nowSeconds } = require('../../utils/time');

module.exports = {
  get(key, defaultValue = null) {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : defaultValue;
  },

  set(key, value) {
    const now = nowSeconds();
    return db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(key, String(value), now);
  },

  getAll() {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const map = {};
    rows.forEach((r) => { map[r.key] = r.value; });
    return map;
  },
};
