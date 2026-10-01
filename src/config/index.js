/**
 * Config reader & validator for .env variables.
 */
require('dotenv').config();
const path = require('path');
const { REQUIRED_DOMAIN } = require('./constants');

const config = {
  botToken: process.env.BOT_TOKEN,
  ownerTelegramId: parseInt(process.env.OWNER_TELEGRAM_ID || '0', 10),
  ownerUsername: (process.env.OWNER_USERNAME || '').replace(/^@/, ''),
  forceJoinChannel: process.env.FORCE_JOIN_CHANNEL || '',
  forceJoinUrl: process.env.FORCE_JOIN_URL || '',

  mailProvider: process.env.MAIL_PROVIDER || 'yaoi',
  mailDomain: process.env.MAIL_DOMAIN || 'yaoi.web.id',
  mailWebUrl: process.env.MAIL_WEB_URL || 'https://temp.yaoi.web.id/',
  mailApiBase: process.env.MAIL_API_BASE || 'https://temp.yaoi.web.id/api',
  mailApiKey: process.env.MAIL_API_KEY || '',

  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '5000', 10),
  liveTimeoutMinutes: parseInt(process.env.LIVE_TIMEOUT_MINUTES || '10', 10),
  maxEmailsPerUser: parseInt(process.env.MAX_EMAILS_PER_USER || '5', 10),
  emailTtlMinutes: parseInt(process.env.EMAIL_TTL_MINUTES || '60', 10),
  rateLimitActions: parseInt(process.env.RATE_LIMIT_ACTIONS || '20', 10),
  rateLimitWindowSec: parseInt(process.env.RATE_LIMIT_WINDOW_SEC || '10', 10),

  dbPath: path.resolve(process.cwd(), process.env.DB_PATH || './data/tempmail.sqlite'),
  logLevel: process.env.LOG_LEVEL || 'info',
  timezone: process.env.TIMEZONE || 'Asia/Jakarta',
  nodeEnv: process.env.NODE_ENV || 'production',
};

// Strict Validation
function validateConfig() {
  if (!config.botToken) {
    throw new Error('[FATAL] BOT_TOKEN mandatory field missing in .env!');
  }
  if (!config.ownerTelegramId) {
    throw new Error('[FATAL] OWNER_TELEGRAM_ID mandatory field missing or invalid in .env!');
  }
  if (config.mailDomain.toLowerCase() !== REQUIRED_DOMAIN) {
    throw new Error(`[FATAL] MAIL_DOMAIN MUST be '${REQUIRED_DOMAIN}'! Provided: '${config.mailDomain}'`);
  }
}

validateConfig();

module.exports = config;
