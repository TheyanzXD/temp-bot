/**
 * Unified Callback Query Router handler.
 * Format: namespace:action:param1:param2...
 */
const menuHandler = require('./menu.handler');
const emailHandler = require('./email.handler');
const inboxHandler = require('./inbox.handler');
const liveHandler = require('./live.handler');
const historyHandler = require('./history.handler');
const profileHandler = require('./profile.handler');
const helpHandler = require('./help.handler');
const adminHandler = require('./admin.handler');
const forceJoinService = require('../services/force-join');
const messagesViews = require('../views/messages');

const downloaderHandler = require('./downloader.handler');

module.exports = async function callbackQueryHandler(ctx) {
  const data = ctx.callbackQuery.data;

  if (data === 'noop') {
    return ctx.answerCallbackQuery();
  }

  if (data.startsWith('ig_')) {
    return downloaderHandler.handleInstagramCallback(ctx);
  }

  const parts = data.split(':');
  const namespace = parts[0];
  const action = parts[1];

  switch (namespace) {
    case 'join':
      if (action === 'check') {
        const { isMember } = await forceJoinService.checkMember(ctx.bot, ctx.dbUser);
        if (isMember) {
          await ctx.answerCallbackQuery({ text: '🎉 Terima kasih! Akses Anda telah dibuka.', show_alert: true });
          return menuHandler(ctx);
        } else {
          return ctx.answerCallbackQuery({
            text: '❌ Kamu belum bergabung ke channel kami. Silakan klik tombol Join Channel terlebih dahulu.',
            show_alert: true,
          });
        }
      }
      break;

    case 'menu':
      if (action === 'home') return menuHandler(ctx);
      break;

    case 'email':
      if (action === 'new') return emailHandler.handleNewRandom(ctx);
      if (action === 'custom') return emailHandler.handleCustomPrompt(ctx);
      if (action === 'list') return emailHandler.handleList(ctx, parts[2]);
      if (action === 'select') return emailHandler.handleSelect(ctx, parts[2]);
      if (action === 'make_active') return emailHandler.handleMakeActive(ctx, parts[2]);
      if (action === 'delete') return emailHandler.handleDeleteRequest(ctx, parts[2]);
      if (action === 'delete_confirm') return emailHandler.handleDeleteConfirm(ctx, parts[2]);
      break;

    case 'inbox':
      if (action === 'open') return inboxHandler.handleOpenInbox(ctx, parts[2], parts[3]);
      break;

    case 'msg':
      if (action === 'read') return inboxHandler.handleReadMessage(ctx, parts[2]);
      if (action === 'delete') return inboxHandler.handleDeleteMessage(ctx, parts[2]);
      break;

    case 'live':
      if (action === 'start') return liveHandler.handleStartLive(ctx, parts[2]);
      if (action === 'stop') return liveHandler.handleStopLive(ctx, parts[2]);
      if (action === 'refresh') return liveHandler.handleStartLive(ctx, parts[2]);
      break;

    case 'history':
      if (action === 'view') return historyHandler(ctx, parts[2]);
      break;

    case 'profile':
      if (action === 'view') return profileHandler(ctx);
      break;

    case 'help':
      if (action === 'view') return helpHandler(ctx);
      break;

    case 'admin':
      if (action === 'main') return adminHandler.handleMainDashboard(ctx);
      if (action === 'stats') return adminHandler.handleMainDashboard(ctx);
      if (action === 'users') return adminHandler.handleUsersList(ctx, parts[2]);
      if (action === 'user_detail') return adminHandler.handleUserDetail(ctx, parts[2]);
      if (action === 'ban') return adminHandler.handleBanUser(ctx, parts[2]);
      if (action === 'unban') return adminHandler.handleUnbanUser(ctx, parts[2]);
      if (action === 'backup') return adminHandler.handleBackup(ctx);
      if (action === 'broadcast_prompt') return adminHandler.handleBroadcastPrompt(ctx);
      if (action === 'settings') return adminHandler.handleSettingsView(ctx);
      if (action === 'toggle') return adminHandler.handleSettingsToggle(ctx, parts[2]);
      if (action === 'logs') return adminHandler.handleLogsView(ctx);
      break;

    default:
      await ctx.answerCallbackQuery();
      break;
  }
};
