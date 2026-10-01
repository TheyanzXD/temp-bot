/**
 * SQLite Connection setup using better-sqlite3 with standard PRAGMAs.
 */
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

// Ensure parent data directory exists
const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(config.dbPath, {
  fileMustExist: false,
  timeout: 5000,
  verbose: config.nodeEnv === 'development' ? console.log : null,
});

// Execute mandatory PRAGMAs
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');
db.pragma('busy_timeout = 5000');
db.pragma('temp_store = MEMORY');

logger.info({ dbPath: config.dbPath }, 'SQLite Database connection established with WAL enabled.');

module.exports = db;
