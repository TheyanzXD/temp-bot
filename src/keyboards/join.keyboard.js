/**
 * Force Join channel keyboard builder.
 */
const { InlineKeyboard } = require('grammy');
const config = require('../config');
const { CALLBACKS } = require('../config/constants');

module.exports = {
  joinChannelKeyboard() {
    return new InlineKeyboard()
      .url('📢 Join Channel', config.forceJoinUrl || 'https://t.me/telegram')
      .row()
      .text('✅ Saya Sudah Join', `${CALLBACKS.JOIN}:check`);
  },
};
