/**
 * Random string generator utilities.
 */
const crypto = require('crypto');

/**
 * Generate random lowercase alphanumeric local part (e.g. k7x2m9qa)
 * @param {number} length 
 * @returns {string}
 */
function generateRandomLocalPart(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

module.exports = {
  generateRandomLocalPart,
};
