# 📧 BOT TELEGRAM TEMP MAIL `@yaoi.web.id`

Bot Telegram Email Sementara (Temp Mail) berarsitektur modular yang dibangun menggunakan **Node.js**, **grammY framework**, dan **SQLite** (`better-sqlite3` dengan WAL mode enabled). Semua email yang digenerate **WAJIB berakhiran `@yaoi.web.id`**.

---

## 📋 PERSYARATAN SYSTEM

- Node.js >= 18.0.0
- SQLite3
- PM2 (opsional, untuk manajemen proses produksi)

---

## 🛠 INSTALASI

1. Clone repository atau salin folder proyek ini:
   ```bash
   cd tempmail-bot
   ```

2. Install dependency:
   ```bash
   npm install
   ```

3. Salin konfig `.env.example` ke `.env`:
   ```bash
   cp .env.example .env
   ```

---

## 🤖 CARA MEMBUAT BOT DI BOTFATHER

1. Buka Telegram dan cari [@BotFather](https://t.me/BotFather).
2. Kirim perintah `/newbot`.
3. Masukkan nama bot dan username bot (misal: `YaoiTempMailBot`).
4. Salin **API Token** yang diberikan oleh BotFather.
5. Tempel token tersebut ke variabel `BOT_TOKEN` di file `.env`.
6. Dapatkan ID Telegram Anda sendiri (gunakan bot [@userinfobot](https://t.me/userinfobot)) dan masukkan ke `OWNER_TELEGRAM_ID`.

---

## 📢 CARA MENJADIKAN BOT ADMIN DI CHANNEL (FORCE JOIN)

1. Buat atau buka channel Telegram publik Anda.
2. Tambahkan bot Anda sebagai anggota channel.
3. Ubah hak akses bot menjadi **Administrator** (minimal izin *Invite Users via Link*).
4. Masukkan username channel (contoh `@username_channel_owner`) ke `FORCE_JOIN_CHANNEL` di `.env`.
5. Masukkan URL invite channel (contoh `https://t.me/username_channel_owner`) ke `FORCE_JOIN_URL` di `.env`.

---

## 🌐 MENYESUAIKAN API `temp.yaoi.web.id`

Karena detail REST API `temp.yaoi.web.id` dapat disesuaikan dengan infrastruktur server Anda, bot ini menggunakan **abstraksi provider** (`MailProvider.js` & `YaoiProvider.js`).

### Langkah Menyesuaikan Endpoint Asli:

1. Buka browser dan buka `https://temp.yaoi.web.id/`.
2. Buka **Developer Tools** (F12) -> pilih tab **Network**.
3. Lakukan pembuatan email atau reload inbox pada web `temp.yaoi.web.id`.
4. Perhatikan URL Endpoint API yang dipanggil (misal: `POST /api/v1/mailbox`, `GET /api/v1/messages?email=...`).
5. Buka file [src/config/constants.js](file:///root/temp-bot/src/config/constants.js) dan update konstanta `YAOI_ENDPOINTS`:

```js
YAOI_ENDPOINTS: {
  CREATE_MAILBOX: '/v1/mailbox',
  LIST_MESSAGES: '/v1/mailbox/:ref/messages',
  GET_MESSAGE: '/v1/messages/:id',
  DELETE_MAILBOX: '/v1/mailbox/:ref',
  HEALTH_CHECK: '/health',
}
```

6. Jika API membutuhkan token rahasia, isi `MAIL_API_KEY` di file `.env`.
7. Jika Anda ingin melakukan pengujian secara offline tanpa API asli, ubah `MAIL_PROVIDER=mock` di file `.env`.

---

## 🚀 CARA MENJALANKAN BOT

### Mode Development (dengan Nodemon)
```bash
npm run dev
```

### Mode Production (Biasa)
```bash
npm start
```

### Mode Production (dengan PM2)
```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 logs yaoi-tempmail-bot
```

---

## 🔍 TROUBLESHOOTING

- **Error: `MAIL_DOMAIN MUST be 'yaoi.web.id'`**
  - Pastikan di `.env` nilai `MAIL_DOMAIN` adalah `yaoi.web.id`.
- **Error: `Bad Request: chat not found` saat Force Join**
  - Pastikan `FORCE_JOIN_CHANNEL` diawali `@` dan bot telah diangkat menjadi **Admin** di channel tersebut.
- **Pesan Live tidak ter-edit (`message is not modified`)**
  - Bot secara otomatis mengabaikan error ini jika isi teks inbox tidak berubah dalam interval 5 detik.
