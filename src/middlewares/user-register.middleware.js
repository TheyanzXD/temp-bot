/**
 * User registration & activity update middleware.
 */
const usersRepo = require('../database/repositories/users.repo');
const statsRepo = require('../database/repositories/stats.repo');

module.exports = async function userRegisterMiddleware(ctx, next) {
  if (!ctx.from || ctx.from.is_bot) return next();

  const user = usersRepo.upsertFromTelegram(ctx);
  ctx.dbUser = user;

  if (user) {
    statsRepo.recordDailyStat('active_users');
    if (ctx.message && ctx.message.text && ctx.message.text.startsWith('/')) {
      usersRepo.incrementCounter(user.id, 'total_commands');
      statsRepo.recordDailyStat('commands_used');
    }
  }

  return next();
};
