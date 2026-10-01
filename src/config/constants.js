/**
 * Application constants, callback prefixes, limits, and defaults.
 */

module.exports = {
  // Domain enforce requirement
  REQUIRED_DOMAIN: 'yaoi.web.id',

  // Callback Query Namespaces / Prefixes
  CALLBACKS: {
    MENU: 'menu',
    EMAIL: 'email',
    INBOX: 'inbox',
    MSG: 'msg',
    LIVE: 'live',
    JOIN: 'join',
    ADMIN: 'admin',
    PROFILE: 'profile',
    HISTORY: 'history',
    HELP: 'help',
  },

  // Blacklist words for custom emails
  CUSTOM_EMAIL_BLACKLIST: [
    'admin', 'administrator', 'root', 'postmaster', 'support',
    'abuse', 'webmaster', 'security', 'info', 'mail', 'system',
    'help', 'helpdesk', 'yaoi', 'owner', 'bot', 'official'
  ],

  // Pagination sizes
  PAGE_SIZE_EMAILS: 5,
  PAGE_SIZE_MESSAGES: 5,
  PAGE_SIZE_USERS: 8,

  // Endpoint constants for temp.yaoi.web.id API (SESUAIKAN DENGAN API ASLI BILA ADA)
  YAOI_ENDPOINTS: {
    CREATE_MAILBOX: '/mailbox',      // POST
    LIST_MESSAGES: '/mailbox/:ref/messages', // GET
    GET_MESSAGE: '/messages/:id',    // GET
    DELETE_MAILBOX: '/mailbox/:ref', // DELETE
    HEALTH_CHECK: '/health',         // GET
  },
};
