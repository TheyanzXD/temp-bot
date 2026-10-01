/**
 * Polyfill globalThis.File for environments (Node 18/Docker) where undici/cheerio requires File
 */
if (typeof globalThis.File === 'undefined') {
  const { Blob, File } = require('node:buffer');
  globalThis.File = File || class File extends Blob {
    constructor(sources, name, options = {}) {
      super(sources, options);
      this.name = name;
      this.lastModified = options.lastModified || Date.now();
    }
  };
}

/**
 * Application Entry Point.
 */
const { createBot } = require('./bot');
const { runMigrations } = require('./database/migrate');
const inboxPoller = require('./services/inbox-poller');
const logger = require('./utils/logger');
const db = require('./database/connection');

async function main() {
  logger.info('==================================================');
  logger.info('Starting Yaoi Temp Mail Telegram Bot (@yaoi.web.id)...');
  logger.info('==================================================');

  // 1. Run database schema migrations
  runMigrations();

  // 2. Initialize Bot
  const bot = createBot();

  // 3. Start Centralized Inbox Polling Engine (5-second interval)
  inboxPoller.start(bot);

  // 4. Start Bot polling
  bot.start({
    onStart: (info) => {
      logger.info({ username: info.username }, `Bot @${info.username} is now online and listening for updates.`);
    },
  });

  // 5. Graceful Shutdown Handlers
  const shutdown = async (signal) => {
    logger.info({ signal }, `Received shutdown signal ${signal}. Cleaning up resources...`);
    try {
      inboxPoller.stop();
      await bot.stop();
      db.close();
      logger.info('Graceful shutdown completed successfully.');
      process.exit(0);
    } catch (err) {
      logger.error({ err: err.message }, 'Error during graceful shutdown');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason: reason ? reason.message || reason : 'Unknown' }, 'Unhandled Promise Rejection caught');
  });

  process.on('uncaughtException', (err) => {
    logger.error({ err: err.message, stack: err.stack }, 'Uncaught Exception caught');
  });
}

main();
