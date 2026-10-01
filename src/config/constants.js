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

  // Endpoint constants for temp.yaoi.web.id API v1
  YAOI_ENDPOINTS: {
    CREATE_MAILBOX: '/mailbox',                     // POST /api/v1/mailbox
    LIST_MESSAGES: '/mailbox/:address/messages',    // GET /api/v1/mailbox/:address/messages
    GET_MESSAGE: '/mailbox/:address/messages/:id', // GET /api/v1/mailbox/:address/messages/:id
    DELETE_MAILBOX: '/mailbox/:address',           // DELETE /api/v1/mailbox/:address
    HEALTH_CHECK: '/health',                       // GET /api/health
  },
};
