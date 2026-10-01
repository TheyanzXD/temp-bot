/**
 * Time formatting helpers for Unix epoch seconds and Asia/Jakarta (WIB) time.
 */

/**
 * Returns current Unix timestamp in seconds.
 * @returns {number}
 */
function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

/**
 * Formats epoch seconds into WIB string (DD MMM YYYY, HH:mm:ss WIB).
 * @param {number} epochSec 
 * @returns {string}
 */
function formatWib(epochSec) {
  if (!epochSec) return '-';
  const date = new Date(epochSec * 1000);
  return date.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }) + ' WIB';
}

/**
 * Formats relative time string (e.g. "2 menit lalu").
 * @param {number} epochSec 
 * @returns {string}
 */
function formatRelative(epochSec) {
  if (!epochSec) return '-';
  const diff = nowSeconds() - epochSec;
  if (diff < 10) return 'baru saja';
  if (diff < 60) return `${diff} dtk lalu`;
  const minutes = Math.floor(diff / 60);
  if (minutes < 60) return `${minutes} min lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

/**
 * Get current date string in YYYY-MM-DD format.
 * @returns {string}
 */
function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

module.exports = {
  nowSeconds,
  formatWib,
  formatRelative,
  getTodayString,
};
