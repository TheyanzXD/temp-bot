/**
 * UI Message templates for Telegram bot responses.
 */
const escapeHtml = require('../utils/escape-html');
const { formatWib, formatRelative } = require('../utils/time');
const { formatBytes, truncateText } = require('./formatters');

const SEPARATOR = '━━━━━━━━━━━━━━━━━━';

module.exports = {
  SEPARATOR,

  startMessage(firstName, forceJoinEnabled, channelUrl) {
    return (
      `👋 <b>Halo, ${escapeHtml(firstName)}!</b>\n` +
      `${SEPARATOR}\n` +
      `Selamat datang di <b>Yaoi Temp Mail Bot</b>!\n` +
      `Layanan generator email sementara resmi berbasis domain <code>@yaoi.web.id</code>.\n\n` +
      `⚡ <i>Gunakan email sementara ini untuk mendaftar layanan tanpa takut spam.</i>\n` +
      `${SEPARATOR}\n` +
      `Silakan pilih menu di bawah ini untuk memulai.`
    );
  },

  forceJoinLockMessage() {
    return (
      `🔒 <b>AKSES TERKUNCI</b>\n` +
      `${SEPARATOR}\n` +
      `Untuk memakai bot ini, kamu wajib bergabung ke channel resmi kami dulu.\n\n` +
      `👇 Klik tombol di bawah, lalu tekan <b>"Saya Sudah Join"</b>.`
    );
  },

  forceJoinSuccessMessage() {
    return (
      `✅ <b>AKSES DIBUKA!</b>\n` +
      `${SEPARATOR}\n` +
      `Terima kasih telah bergabung dengan channel resmi kami. Selamat menggunakan bot!`
    );
  },

  mainMenuMessage(activeEmailAddress, unreadCount = 0) {
    const activeText = activeEmailAddress
      ? `<code>${escapeHtml(activeEmailAddress)}</code>`
      : '<i>(Belum ada email aktif)</i>';

    return (
      `🏠 <b>MENU UTAMA TEMP MAIL</b>\n` +
      `${SEPARATOR}\n` +
      `📧 <b>Email Aktif:</b> ${activeText}\n` +
      `📩 <b>Pesan Belum Dibaca:</b> ${unreadCount}\n` +
      `${SEPARATOR}\n` +
      `Gunakan tombol di bawah untuk membuat, mengecek, atau mengelola email sementara kamu.`
    );
  },

  emailCreatedSuccess(address, expiresAt) {
    const expireText = expiresAt ? formatWib(expiresAt) : 'Tidak kedaluwarsa';
    return (
      `✅ <b>EMAIL BERHASIL DIBUAT</b>\n` +
      `${SEPARATOR}\n` +
      `📧 <b>Alamat:</b>\n` +
      `<code>${escapeHtml(address)}</code>\n\n` +
      `⏱ <b>Masa aktif:</b> ${expireText}\n` +
      `📥 <b>Pesan masuk:</b> 0\n` +
      `${SEPARATOR}\n` +
      `💡 <i>Tap alamat di atas untuk menyalin, lalu gunakan untuk mendaftar di layanan mana pun. Pesan akan muncul otomatis.</i>`
    );
  },

  customEmailPrompt() {
    return (
      `✏️ <b>BUAT EMAIL CUSTOM</b>\n` +
      `${SEPARATOR}\n` +
      `Ketik nama email yang kamu inginkan (bagian sebelum <code>@yaoi.web.id</code>).\n\n` +
      `📌 <b>Aturan:</b>\n` +
      `• Panjang 4 - 32 karakter (huruf kecil, angka, titik, minus, underscore)\n` +
      `• Tidak boleh diawali/diakhiri titik atau minus\n` +
      `• Otomatis menggunakan domain <code>@yaoi.web.id</code>\n\n` +
      `<i>Contoh: ketik <code>budi123</code> untuk menjadi <code>budi123@yaoi.web.id</code></i>`
    );
  },

  myEmailsMessage(emails, activeEmailId, currentPage, totalPages) {
    if (!emails || emails.length === 0) {
      return (
        `📧 <b>DAFTAR EMAIL SAYA</b>\n` +
        `${SEPARATOR}\n` +
        `Kamu belum memiliki email aktif.\n` +
        `Klik <b>"➕ Buat Email Baru"</b> di menu utama.`
      );
    }

    let text = `📧 <b>DAFTAR EMAIL SAYA</b> (Halaman ${currentPage}/${totalPages})\n${SEPARATOR}\n`;
    emails.forEach((e, idx) => {
      const isActive = e.id === activeEmailId ? ' 🟢 [AKTIF]' : '';
      const unread = e.unread_count > 0 ? ` (🆕 ${e.unread_count})` : '';
      text += `${idx + 1}. <code>${escapeHtml(e.address)}</code>${isActive}${unread}\n`;
      text += `   ├ Total pesan: ${e.total_messages}\n`;
      text += `   └ Dibuat: ${formatWib(e.created_at)}\n\n`;
    });
    text += `${SEPARATOR}\nTap pada email di tombol bawah untuk mengelola.`;
    return text;
  },

  emailDetailMessage(email, isActive) {
    return (
      `📧 <b>DETAIL EMAIL</b>\n` +
      `${SEPARATOR}\n` +
      `📬 <b>Alamat:</b> <code>${escapeHtml(email.address)}</code>\n` +
      `🟢 <b>Status:</b> ${isActive ? '<b>AKTIF UTAMA</b>' : 'Biasa'}\n` +
      `📩 <b>Total Pesan:</b> ${email.total_messages} (Unread: ${email.unread_count})\n` +
      `⚙️ <b>Tipe:</b> ${email.generation_type}\n` +
      `📅 <b>Dibuat:</b> ${formatWib(email.created_at)}\n` +
      `⏱ <b>Kedaluwarsa:</b> ${email.expires_at ? formatWib(email.expires_at) : 'Permanen'}\n` +
      `${SEPARATOR}`
    );
  },

  inboxViewMessage(address, messagesList, page, totalPages, isLiveMode = false) {
    let modeText = isLiveMode ? '📡 <b>LIVE INBOX (5 DETIK)</b>' : '📥 <b>INBOX PESAN</b>';
    let text = `${modeText}\n${SEPARATOR}\n📧 <b>Ke:</b> <code>${escapeHtml(address)}</code>\n${SEPARATOR}\n`;

    if (!messagesList || messagesList.length === 0) {
      text += `<i>Belum ada pesan masuk untuk email ini. Pesan akan muncul di sini secara otomatis.</i>\n`;
    } else {
      messagesList.forEach((m, idx) => {
        const badge = m.is_read ? '' : '🆕 ';
        const otpBadge = m.otp_detected ? ` 🔑 [OTP: <code>${escapeHtml(m.otp_detected)}</code>]` : '';
        text += `${idx + 1}. ${badge}<b>${escapeHtml(truncateText(m.from_name || m.from_address, 20))}</b>${otpBadge}\n`;
        text += `   <b>Subjek:</b> ${escapeHtml(truncateText(m.subject || '(Tanpa Subjek)', 30))}\n`;
        text += `   🕒 ${formatRelative(m.received_at)}\n\n`;
      });
      text += `<i>Halaman ${page}/${totalPages} • Tap nomor / pesan untuk membaca lengkap.</i>\n`;
    }
    text += `${SEPARATOR}`;
    if (isLiveMode) {
      text += `\n🔄 <i>Auto refresh tiap 5 dtk • Waktu: ${formatWib(Math.floor(Date.now() / 1000))}</i>`;
    }
    return text;
  },

  messageDetailMessage(msg) {
    const otpSection = msg.otp_detected
      ? `🔑 <b>KODE OTP DETEKSI:</b> <code>${escapeHtml(msg.otp_detected)}</code>\n${SEPARATOR}\n`
      : '';

    const attachmentsSection = msg.has_attachments
      ? `📎 <b>Lampiran tersedia. Klik tombol di bawah untuk mengunduh.</b>\n${SEPARATOR}\n`
      : '';

    return (
      `📩 <b>BACA PESAN MAIL</b>\n` +
      `${SEPARATOR}\n` +
      `📧 <b>Ke:</b> <code>${escapeHtml(msg.to_address)}</code>\n` +
      `👤 <b>Dari:</b> ${escapeHtml(msg.from_name ? `${msg.from_name} <${msg.from_address}>` : msg.from_address)}\n` +
      `📝 <b>Subjek:</b> <b>${escapeHtml(msg.subject || '(Tanpa Subjek)')}</b>\n` +
      `🕐 <b>Waktu:</b> ${formatWib(msg.received_at)}\n` +
      `${SEPARATOR}\n` +
      `${otpSection}` +
      `<b>ISI PESAN:</b>\n` +
      `${escapeHtml(truncateText(msg.body_text || 'Tidak ada teks isi pesan.', 3500))}\n\n` +
      `${SEPARATOR}\n` +
      `${attachmentsSection}`
    );
  },

  newMessageNotification(msg) {
    const otpSection = msg.otp_detected
      ? `\n🔑 <b>KODE OTP:</b> <code>${escapeHtml(msg.otp_detected)}</code>`
      : '';

    return (
      `📬 <b>PESAN BARU MASUK!</b>\n` +
      `${SEPARATOR}\n` +
      `📧 <b>Ke:</b> <code>${escapeHtml(msg.to_address)}</code>\n` +
      `👤 <b>Dari:</b> ${escapeHtml(msg.from_name ? `${msg.from_name} <${msg.from_address}>` : msg.from_address)}\n` +
      `📝 <b>Subjek:</b> ${escapeHtml(msg.subject || '(Tanpa Subjek)')}\n` +
      `🕐 <b>Waktu:</b> ${formatWib(msg.received_at)}` +
      `${otpSection}\n` +
      `${SEPARATOR}\n` +
      `💬 <b>Ringkasan:</b> <i>${escapeHtml(truncateText(msg.snippet || msg.body_text, 120))}</i>`
    );
  },

  userProfileMessage(user, activeEmailAddress, historyCount) {
    return (
      `👤 <b>PROFIL KAMU</b>\n` +
      `${SEPARATOR}\n` +
      `🆔 <b>ID:</b> <code>${user.telegram_id}</code>\n` +
      `📛 <b>Nama:</b> ${escapeHtml(user.first_name || 'User')}\n` +
      `📅 <b>Bergabung:</b> ${formatWib(user.first_seen_at)}\n` +
      `${SEPARATOR}\n` +
      `📧 <b>Email Dibuat:</b> ${user.total_emails_created}\n` +
      `📨 <b>Pesan Diterima:</b> ${user.total_messages_received}\n` +
      `🟢 <b>Email Aktif Saat Ini:</b> ${activeEmailAddress ? `<code>${escapeHtml(activeEmailAddress)}</code>` : 'Tidak ada'}\n` +
      `${SEPARATOR}\n` +
      `✅ <b>Status Channel:</b> ${user.has_joined_channel ? 'Sudah Bergabung' : 'Belum'}`
    );
  },

  adminDashboardMessage(stats) {
    return (
      `📊 <b>PANEL ADMIN & OWNER</b>\n` +
      `${SEPARATOR}\n` +
      `👥 <b>Total User:</b> ${stats.totalUsers}\n` +
      `🟢 <b>User Aktif Hari Ini:</b> ${stats.activeUsersToday}\n` +
      `📧 <b>Total Email Generated:</b> ${stats.totalEmails}\n` +
      `📨 <b>Total Pesan Diterima:</b> ${stats.totalMessages}\n` +
      `📡 <b>Live Sessions Aktif:</b> ${stats.activeLiveSessions}\n` +
      `💾 <b>Ukuran Database:</b> ${formatBytes(stats.dbSizeBytes)}\n` +
      `⏱ <b>Bot Uptime:</b> ${stats.uptimeFormatted}\n` +
      `${SEPARATOR}\n` +
      `Pilih menu manajemen di bawah.`
    );
  },

  helpMessage() {
    return (
      `❓ <b>PANDUAN BANTUAN TEMP MAIL & DOWNLOADER</b>\n` +
      `${SEPARATOR}\n` +
      `<b>Cara Penggunaan Temp Mail:</b>\n` +
      `1️⃣ Tekan <b>➕ Buat Email Baru</b> untuk membuat email random <code>@yaoi.web.id</code>.\n` +
      `2️⃣ Gunakan alamat tersebut untuk mendaftar akun / verifikasi online.\n` +
      `3️⃣ Tekan <b>📥 Inbox</b> atau <b>📡 Live Inbox</b> untuk membaca pesan yang masuk.\n` +
      `4️⃣ Jika ada OTP, bot akan mendeteksi dan menampilkan tombol salin cepat!\n\n` +
      `<b>Perintah Chat Temp Mail:</b>\n` +
      `/start - Menampilkan menu utama\n` +
      `/new - Generator email otomatis\n` +
      `/custom - Buat email nama sendiri\n` +
      `/inbox - Buka pesan masuk\n` +
      `/live - Mode live streaming 5 detik\n` +
      `/history - Riwayat email\n` +
      `/profile - Profil & statistik user\n` +
      `/server - Status server, RAM, CPU & sistem\n` +
      `/help - Bantuan ini\n\n` +
      `<b>Perintah Media Downloader:</b>\n` +
      `/twitter &lt;url&gt; atau /x &lt;url&gt; - Downloader Video Twitter / X\n\n` +
      `<b>Domain Resmi:</b> <code>@yaoi.web.id</code>`
    );
  },
};
