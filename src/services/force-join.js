/**
 * Force Join Channel Verification service.
 */
const config = require('../config');
const usersRepo = require('../database/repositories/users.repo');
const settingsRepo = require('../database/repositories/settings.repo');
const activityRepo = require('../database/repositories/activity.repo');
const db = require('../database/connection');
const { nowSeconds } = require('../utils/time');
const logger = require('../utils/logger');

class ForceJoinService {
  /**
   * Check if user is member of required channel
   * @param {Object} bot grammY bot instance
   * @param {Object} user DB User record
   * @returns {Promise<{ isMember: boolean, reason?: string }>}
   */
  async checkMember(bot, user) {
    const isEnabled = settingsRepo.get('force_join_enabled', '1') === '1';

    // Exclude owner & admins, or if force join is disabled globally
    if (!isEnabled || user.role === 'owner' || user.role === 'admin') {
      return { isMember: true };
    }

    // Cache check: 60 seconds TTL
    const now = nowSeconds();
    if (user.has_joined_channel === 1 && user.last_join_check_at && (now - user.last_join_check_at < 60)) {
      return { isMember: true };
    }

    const channelUsername = config.forceJoinChannel;
    if (!channelUsername) {
      return { isMember: true };
    }

    try {
      const member = await bot.api.getChatMember(channelUsername, user.telegram_id);
      const validStatuses = ['member', 'administrator', 'creator'];
      const isMember = validStatuses.includes(member.status);

      // Record check history
      db.prepare(`
        INSERT INTO channel_checks (user_id, channel, status, checked_at)
        VALUES (?, ?, ?, ?)
      `).run(user.id, channelUsername, member.status, now);

      usersRepo.updateChannelJoinStatus(user.id, isMember);

      if (isMember) {
        activityRepo.logActivity({ userId: user.id, action: 'join_check_pass', detail: { channel: channelUsername } });
      } else {
        activityRepo.logActivity({ userId: user.id, action: 'join_check_fail', detail: { status: member.status } });
      }

      return { isMember };
    } catch (err) {
      logger.error({ err: err.message, userId: user.telegram_id, channel: channelUsername }, 'Error checking chat member');
      // If bot fails to check due to configuration or missing admin rights, log warning
      return { isMember: false, reason: err.message };
    }
  }
}

module.exports = new ForceJoinService();
