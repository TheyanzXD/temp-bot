-- Schema definition for Yaoi Temp Mail SQLite Database

-- Migrations table
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at INTEGER NOT NULL
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER UNIQUE NOT NULL,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    language_code TEXT,
    is_premium INTEGER DEFAULT 0,
    is_bot INTEGER DEFAULT 0,
    role TEXT DEFAULT 'user',
    is_banned INTEGER DEFAULT 0,
    has_joined_channel INTEGER DEFAULT 0,
    last_join_check_at INTEGER,
    total_emails_created INTEGER DEFAULT 0,
    total_messages_received INTEGER DEFAULT 0,
    total_commands INTEGER DEFAULT 0,
    active_email_id INTEGER,
    referred_by INTEGER REFERENCES users(id),
    first_seen_at INTEGER NOT NULL,
    last_seen_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Emails table
CREATE TABLE IF NOT EXISTS emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    address TEXT UNIQUE NOT NULL,
    local_part TEXT NOT NULL,
    domain TEXT NOT NULL CHECK(domain = 'yaoi.web.id'),
    generation_type TEXT NOT NULL, -- 'random', 'custom', 'custom_password'
    provider TEXT NOT NULL DEFAULT 'yaoi',
    provider_ref TEXT,
    status TEXT DEFAULT 'active', -- 'active', 'expired', 'deleted'
    expires_at INTEGER,
    total_messages INTEGER DEFAULT 0,
    unread_count INTEGER DEFAULT 0,
    last_message_at INTEGER,
    last_checked_at INTEGER,
    deleted_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    CHECK (address = local_part || '@' || domain)
);

CREATE INDEX IF NOT EXISTS idx_emails_user_id ON emails(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_address ON emails(address);
CREATE INDEX IF NOT EXISTS idx_emails_status ON emails(status);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email_id INTEGER NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    provider_message_id TEXT NOT NULL,
    from_address TEXT,
    from_name TEXT,
    to_address TEXT,
    subject TEXT,
    body_text TEXT,
    body_html TEXT,
    snippet TEXT,
    otp_detected TEXT,
    links_json TEXT,
    has_attachments INTEGER DEFAULT 0,
    size_bytes INTEGER DEFAULT 0,
    is_read INTEGER DEFAULT 0,
    is_notified INTEGER DEFAULT 0,
    received_at INTEGER,
    fetched_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(email_id, provider_message_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_email_id ON messages(email_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_received_at ON messages(received_at);

-- Attachments table
CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    mime_type TEXT,
    size_bytes INTEGER DEFAULT 0,
    provider_ref TEXT,
    telegram_file_id TEXT,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attachments_message_id ON attachments(message_id);

-- Activity Logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    detail TEXT,
    email_id INTEGER,
    message_id INTEGER,
    chat_id INTEGER,
    ip_note TEXT,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);

-- Channel Checks table
CREATE TABLE IF NOT EXISTS channel_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel TEXT NOT NULL,
    status TEXT NOT NULL,
    checked_at INTEGER NOT NULL
);

-- Live Sessions table
CREATE TABLE IF NOT EXISTS live_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email_id INTEGER NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
    chat_id INTEGER NOT NULL,
    message_id INTEGER NOT NULL,
    started_at INTEGER NOT NULL,
    last_refresh_at INTEGER NOT NULL,
    ended_at INTEGER,
    refresh_count INTEGER DEFAULT 0,
    end_reason TEXT,
    is_active INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_live_sessions_is_active ON live_sessions(is_active);

-- Bans table
CREATE TABLE IF NOT EXISTS bans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    banned_by INTEGER NOT NULL REFERENCES users(id),
    reason TEXT,
    banned_at INTEGER NOT NULL,
    unbanned_at INTEGER,
    is_active INTEGER DEFAULT 1
);

-- Settings table (key-value store)
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Daily Stats table
CREATE TABLE IF NOT EXISTS daily_stats (
    date TEXT PRIMARY KEY, -- YYYY-MM-DD
    new_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    emails_created INTEGER DEFAULT 0,
    messages_received INTEGER DEFAULT 0,
    commands_used INTEGER DEFAULT 0,
    live_sessions INTEGER DEFAULT 0
);

-- Broadcasts table
CREATE TABLE IF NOT EXISTS broadcasts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL REFERENCES users(id),
    text TEXT NOT NULL,
    total_target INTEGER DEFAULT 0,
    total_success INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    started_at INTEGER NOT NULL,
    finished_at INTEGER
);

-- Views
CREATE VIEW IF NOT EXISTS v_user_overview AS
SELECT 
    u.id,
    u.telegram_id,
    u.username,
    u.first_name,
    u.role,
    u.is_banned,
    COUNT(DISTINCT e.id) AS active_emails_count,
    u.total_messages_received,
    u.last_seen_at
FROM users u
LEFT JOIN emails e ON e.user_id = u.id AND e.status = 'active'
GROUP BY u.id;

CREATE VIEW IF NOT EXISTS v_email_overview AS
SELECT 
    e.id AS email_id,
    e.address,
    e.status,
    e.user_id,
    u.telegram_id,
    u.username,
    COUNT(m.id) AS msg_count,
    e.created_at
FROM emails e
JOIN users u ON u.id = e.user_id
LEFT JOIN messages m ON m.email_id = e.id
GROUP BY e.id;

-- Triggers for auto update counters and updated_at
CREATE TRIGGER IF NOT EXISTS trg_messages_after_insert
AFTER INSERT ON messages
BEGIN
    UPDATE emails 
    SET total_messages = total_messages + 1,
        unread_count = unread_count + 1,
        last_message_at = NEW.received_at,
        updated_at = NEW.fetched_at
    WHERE id = NEW.email_id;

    UPDATE users 
    SET total_messages_received = total_messages_received + 1,
        updated_at = NEW.fetched_at
    WHERE id = NEW.user_id;
END;
