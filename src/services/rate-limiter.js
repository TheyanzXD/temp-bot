/**
 * In-memory sliding window rate limiter service per user.
 */
const config = require('../config');

class RateLimiterService {
  constructor() {
    this.userWindows = new Map();
  }

  /**
   * Check if user exceeded rate limit
   * @param {number} userId 
   * @returns {boolean} true if allowed, false if rate limited
   */
  isAllowed(userId) {
    const now = Date.now();
    const windowMs = config.rateLimitWindowSec * 1000;
    const maxActions = config.rateLimitActions;

    if (!this.userWindows.has(userId)) {
      this.userWindows.set(userId, [now]);
      return true;
    }

    const timestamps = this.userWindows.get(userId).filter((ts) => now - ts < windowMs);
    if (timestamps.length >= maxActions) {
      return false;
    }

    timestamps.push(now);
    this.userWindows.set(userId, timestamps);
    return true;
  }
}

module.exports = new RateLimiterService();
