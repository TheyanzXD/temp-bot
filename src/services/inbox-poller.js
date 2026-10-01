/**
 * Centralized 5-second Inbox Polling Engine & Live Session Manager.
 */
const { getMailProvider } = require('./mail');
const emailsRepo = require('../database/repositories/emails.repo');
const messagesRepo = require('../database/repositories/messages.repo');
const usersRepo = require('../database/repositories/users.repo');
const settingsRepo = require('../database/repositories/settings.repo');
const statsRepo = require('../database/repositories/stats.repo');
const activityRepo = require('../database/repositories/activity.repo');
const db = require('../database/connection');
const { nowSeconds, formatWib } = require('../utils/time');
const { extractLinks } = require('../views/formatters');
const messagesViews = require('../views/messages');
const inboxKeyboard = require('../keyboards/inbox.keyboard');
const logger = require('../utils/logger');
const sleep = require('../utils/sleep');

class InboxPollerEngine {
  constructor() {
    this.isRunning = false;
    this.timerId = null;
    this.bot = null;
    this.lastRenderedHashes = new Map(); // Tracks last rendered message text per session to avoid duplicate Telegram edits
  }

  /**
   * Start polling engine
   * @param {Object} bot grammY bot instance
   */
  start(bot) {
    this.bot = bot;
    logger.info('Starting Centralized Inbox Poller Engine...');
    this.pollLoop();
  }

  stop() {
    this.isRunning = false;
    if (this.timerId) clearTimeout(this.timerId);
    logger.info('Inbox Poller Engine stopped.');
  }

  /**
   * Extract OTP code from subject/body text using regex patterns
   * @param {string} subject 
   * @param {string} body 
   * @returns {string|null}
   */
  detectOtp(subject = '', body = '') {
    const text = `${subject}\n${body}`;
    const keywords = ['kode', 'code', 'otp', 'verification', 'verifikasi', 'pin', 'security'];
    const hasKeyword = keywords.some((kw) => text.toLowerCase().includes(kw));

    if (!hasKeyword) return null;

    // Standard 4 to 8 digit numeric OTP
    const numMatch = text.match(/\b\d{4,8}\b/);
    if (numMatch) return numMatch[0];

    // Alphanumeric verification code (e.g. A9B-231 or 8X2K9P)
    const alphaNumMatch = text.match(/\b[A-Z0-9]{4,8}\b/i);
    if (alphaNumMatch) return alphaNumMatch[0];

    return null;
  }

  /**
   * Core recursive polling loop with anti-overlap model
   */
  async pollLoop() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      await this.processPollCycle();
    } catch (err) {
      logger.error({ err: err.message }, 'Error in Inbox Poller cycle');
    } finally {
      this.isRunning = false;
      const intervalMs = parseInt(settingsRepo.get('poll_interval_ms', '5000'), 10);
      this.timerId = setTimeout(() => this.pollLoop(), intervalMs);
    }
  }

  /**
   * Single polling cycle execution
   */
  async processPollCycle() {
    // 1. Expire old emails and clean stale live sessions
    emailsRepo.expireOldEmails();
    this.cleanupStaleLiveSessions();

    // 2. Fetch active live sessions
    const activeSessions = db.prepare(`
      SELECT ls.*, e.address, e.provider_ref, u.telegram_id
      FROM live_sessions ls
      JOIN emails e ON e.id = ls.email_id
      JOIN users u ON u.id = ls.user_id
      WHERE ls.is_active = 1
    `).all();

    if (activeSessions.length === 0) return;

    // 3. Group sessions by email_id to prevent duplicate API calls
    const emailGroups = new Map();
    activeSessions.forEach((s) => {
      if (!emailGroups.has(s.email_id)) {
        emailGroups.set(s.email_id, {
          emailId: s.email_id,
          address: s.address,
          providerRef: s.provider_ref,
          sessions: [],
        });
      }
      emailGroups.get(s.email_id).sessions.push(s);
    });

    const provider = getMailProvider();
    const groupEntries = Array.from(emailGroups.values());

    // 4. Concurrency limit of 5 parallel requests
    const CHUNK_SIZE = 5;
    for (let i = 0; i < groupEntries.length; i += CHUNK_SIZE) {
      const chunk = groupEntries.slice(i, i + CHUNK_SIZE);
      await Promise.all(chunk.map((group) => this.pollSingleEmail(provider, group)));
    }
  }

  /**
   * Poll single email mailbox and update associated live sessions
   */
  async pollSingleEmail(provider, group) {
    const { emailId, address, providerRef, sessions } = group;

    try {
      emailsRepo.touchLastChecked(emailId);
      const remoteMessages = await provider.listMessages({ address, providerRef });

      let newlyFetchedMessages = [];

      for (const remoteMsg of remoteMessages) {
        const fullMsg = await provider.getMessage({
          address,
          providerRef,
          id: remoteMsg.id,
        });

        const otp = this.detectOtp(fullMsg.subject, fullMsg.bodyText);
        const links = extractLinks(fullMsg.bodyText);

        const savedMsg = messagesRepo.createMessage({
          emailId,
          userId: sessions[0].user_id,
          providerMessageId: remoteMsg.id,
          fromAddress: fullMsg.fromAddress,
          fromName: fullMsg.fromName,
          toAddress: address,
          subject: fullMsg.subject,
          bodyText: fullMsg.bodyText,
          bodyHtml: fullMsg.bodyHtml,
          snippet: fullMsg.snippet,
          otpDetected: otp,
          linksJson: JSON.stringify(links),
          hasAttachments: fullMsg.attachments && fullMsg.attachments.length > 0 ? 1 : 0,
          sizeBytes: 0,
          receivedAt: fullMsg.receivedAt,
        });

        if (savedMsg) {
          newlyFetchedMessages.push(savedMsg);
          statsRepo.recordDailyStat('messages_received');
        }
      }

      // Send notifications for newly fetched messages
      for (const newMsg of newlyFetchedMessages) {
        for (const session of sessions) {
          try {
            await this.bot.api.sendMessage(
              session.chat_id,
              messagesViews.newMessageNotification(newMsg),
              {
                parse_mode: 'HTML',
                reply_markup: inboxKeyboard.newMessageNotificationKeyboard(newMsg.id, newMsg.otp_detected),
              }
            );
            messagesRepo.markAsNotified(newMsg.id);
          } catch (err) {
            logger.warn({ err: err.message, chatId: session.chat_id }, 'Failed to send new message notification');
          }
        }
      }

      // Update live session Telegram messages
      for (const session of sessions) {
        await this.updateLiveMessage(session, address);
      }

    } catch (err) {
      logger.error({ err: err.message, emailId, address }, 'Failed during email polling cycle');
    }
  }

  /**
   * Update live message UI on Telegram if text content changed
   */
  async updateLiveMessage(session, address) {
    const pageResult = messagesRepo.listByEmailPaged(session.email_id, 1, 5);
    const textContent = messagesViews.inboxViewMessage(address, pageResult.items, 1, pageResult.totalPages, true);
    const keyboard = inboxKeyboard.liveInboxKeyboard(session.email_id);

    // Hash text to only edit Telegram message when content changes
    const hashKey = `${session.chat_id}_${session.message_id}`;
    const newHash = `${textContent}_${JSON.stringify(keyboard)}`;

    if (this.lastRenderedHashes.get(hashKey) === newHash) {
      return; // Skip edit if content hasn't changed
    }

    try {
      await this.bot.api.editMessageText(
        session.chat_id,
        session.message_id,
        textContent,
        {
          parse_mode: 'HTML',
          reply_markup: keyboard,
        }
      );

      this.lastRenderedHashes.set(hashKey, newHash);
      const now = nowSeconds();

      db.prepare(`
        UPDATE live_sessions
        SET last_refresh_at = ?, refresh_count = refresh_count + 1
        WHERE id = ?
      `).run(now, session.id);

    } catch (err) {
      if (err.message && err.message.includes('message is not modified')) {
        this.lastRenderedHashes.set(hashKey, newHash);
      } else {
        logger.warn({ err: err.message, session }, 'Failed to edit live message');
      }
    }
  }

  /**
   * Auto close live sessions exceeding timeout
   */
  cleanupStaleLiveSessions() {
    const timeoutMinutes = parseInt(settingsRepo.get('live_timeout_minutes', '10'), 10);
    const cutoff = nowSeconds() - (timeoutMinutes * 60);

    const stale = db.prepare(`
      SELECT * FROM live_sessions WHERE is_active = 1 AND started_at < ?
    `).all(cutoff);

    for (const s of stale) {
      db.prepare(`
        UPDATE live_sessions
        SET is_active = 0, ended_at = ?, end_reason = 'timeout'
        WHERE id = ?
      `).run(nowSeconds(), s.id);

      if (this.bot) {
        this.bot.api.editMessageText(
          s.chat_id,
          s.message_id,
          `⏸ <b>MODE LIVE DIHENTIKAN</b>\n${messagesViews.SEPARATOR}\nSesi live otomatis berakhir setelah ${timeoutMinutes} menit.\nTekan <b>📡 Live Inbox</b> untuk memulai lagi.`,
          {
            parse_mode: 'HTML',
            reply_markup: inboxKeyboard.liveStoppedKeyboard(s.email_id),
          }
        ).catch(() => {});
      }
    }
  }
}

module.exports = new InboxPollerEngine();
