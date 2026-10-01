/**
 * grammY Bot initialization & middleware pipeline registration.
 */
const { Bot, session } = require('grammy');
const config = require('./config');
const logger = require('./utils/logger');

// Middlewares
const errorMiddleware = require('./middlewares/error.middleware');
const userRegisterMiddleware = require('./middlewares/user-register.middleware');
const banMiddleware = require('./middlewares/ban.middleware');
const rateLimitMiddleware = require('./middlewares/rate-limit.middleware');
const forceJoinMiddleware = require('./middlewares/force-join.middleware');

// Handlers
const startHandler = require('./handlers/start.handler');
const menuHandler = require('./handlers/menu.handler');
const emailHandler = require('./handlers/email.handler');
const inboxHandler = require('./handlers/inbox.handler');
const liveHandler = require('./handlers/live.handler');
const historyHandler = require('./handlers/history.handler');
const profileHandler = require('./handlers/profile.handler');
const helpHandler = require('./handlers/help.handler');
const adminHandler = require('./handlers/admin.handler');
const downloaderHandler = require('./handlers/downloader.handler');
const serverHandler = require('./handlers/server.handler');
const callbackQueryHandler = require('./handlers/callbacks.handler');

function createBot() {
  const bot = new Bot(config.botToken);

  // Attach bot instance to ctx
  bot.use(async (ctx, next) => {
    ctx.bot = bot;
    return next();
  });

  // Built-in session middleware for multi-step prompts (custom email, broadcast text)
  bot.use(session({ initial: () => ({}) }));

  // Middleware pipeline registration order
  bot.use(userRegisterMiddleware);
  bot.use(banMiddleware);
  bot.use(rateLimitMiddleware);
  bot.use(forceJoinMiddleware);

  // Command Registrations
  bot.command('start', startHandler);
  bot.command('menu', menuHandler);
  bot.command('new', (ctx) => emailHandler.handleNewRandom(ctx));
  bot.command('custom', (ctx) => emailHandler.handleCustomPrompt(ctx));
  bot.command('inbox', (ctx) => inboxHandler.handleOpenInbox(ctx, 'active', 1));
  bot.command('live', (ctx) => liveHandler.handleStartLive(ctx, 'active'));
  bot.command('history', (ctx) => historyHandler(ctx, 1));
  bot.command('profile', profileHandler);
  bot.command('help', helpHandler);
  bot.command('server', serverHandler);
  bot.command('admin', (ctx) => adminHandler.handleMainDashboard(ctx));

  // Downloader commands
  bot.command('twitter', (ctx) => downloaderHandler.handleTwitter(ctx));
  bot.command('x', (ctx) => downloaderHandler.handleTwitter(ctx));

  // Text message handlers for prompt steps (custom email & broadcast)
  bot.on('message:text', async (ctx, next) => {
    const handledCustom = await emailHandler.handleCustomInput(ctx);
    if (handledCustom) return;

    const handledBroadcast = await adminHandler.handleBroadcastInput(ctx);
    if (handledBroadcast) return;

    return next();
  });

  // Callback query router
  bot.on('callback_query:data', callbackQueryHandler);

  // Catch errors
  bot.catch(errorMiddleware);

  return bot;
}

module.exports = { createBot };
