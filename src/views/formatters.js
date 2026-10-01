/**
 * Text and file formatters for Telegram messages.
 */

/**
 * Format bytes into human-readable size string (e.g. 1.2 MB).
 * @param {number} bytes 
 * @returns {string}
 */
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Truncates string to a maximum length with ellipsis.
 * @param {string} str 
 * @param {number} maxLength 
 * @returns {string}
 */
function truncateText(str, maxLength = 100) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Extract links from body text or HTML.
 * @param {string} text 
 * @returns {Array<{text: string, url: string}>}
 */
function extractLinks(text) {
  if (!text) return [];
  const urlRegex = /(https?:\/\/[^\s<"']+)/g;
  const matches = text.match(urlRegex) || [];
  const uniqueUrls = Array.from(new Set(matches));
  return uniqueUrls.map((url, idx) => ({
    text: `Link #${idx + 1}`,
    url: url,
  }));
}

module.exports = {
  formatBytes,
  truncateText,
  extractLinks,
};
