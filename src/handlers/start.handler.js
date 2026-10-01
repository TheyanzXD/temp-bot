/**
 * Handler for /start command.
 */
const messagesViews = require('../views/messages');
const { mainMenuKeyboard } = require('../keyboards/main.keyboard');
const emailsRepo = require('../database/repositories/emails.repo');
const activityRepo = require('../database/repositories/activity.repo');

module.exports = async function startHandler(ctx) {
  const firstName = ctx.from.first_name || 'Teman';
  let activeEmailAddress = null;
  let unreadCount = 0;

  if (ctx.dbUser && ctx.dbUser.active_email_id) {
    const activeEmail = emailsRepo.findById(ctx.dbUser.active_email_id);
    if (activeEmail && activeEmail.status === 'active') {
      activeEmailAddress = activeEmail.address;
      unreadCount = activeEmail.unread_count;
    }
  }

  activityRepo.logActivity({ userId: ctx.dbUser ? ctx.dbUser.id : null, action: 'start' });

  await ctx.reply(
    messagesViews.startMessage(firstName),
    {
      parse_mode: 'HTML',
      reply_markup: mainMenuKeyboard(),
    }
  );
};
