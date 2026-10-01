/**
 * Schema migration runner.
 */
const fs = require('fs');
const path = require('path');
const db = require('./connection');
const logger = require('../utils/logger');
const { nowSeconds } = require('../utils/time');

function runMigrations() {
  logger.info('Running database schema initialization and migrations...');

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Execute schema.sql inside a transaction
  db.exec(schemaSql);

  // Check migration version
  const initialMigration = db.prepare('SELECT version FROM schema_migrations WHERE version = 1').get();
  if (!initialMigration) {
    db.prepare(`
      INSERT INTO schema_migrations (version, name, applied_at)
      VALUES (1, 'initial_schema', ?)
    `).run(nowSeconds());
    logger.info('Applied initial migration v1 successfully.');
  } else {
    logger.info('Database schema is up to date (v1).');
  }

  // Insert default settings if not exists
  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?, ?, ?)
  `);

  const now = nowSeconds();
  insertSetting.run('force_join_enabled', '1', now);
  insertSetting.run('max_emails_per_user', '5', now);
  insertSetting.run('email_ttl_minutes', '60', now);
  insertSetting.run('live_timeout_minutes', '10', now);
  insertSetting.run('poll_interval_ms', '5000', now);
  insertSetting.run('maintenance_mode', '0', now);
  insertSetting.run('welcome_text', 'Selamat datang di Yaoi Temp Mail Bot!', now);
}

if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
