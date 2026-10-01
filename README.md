# 📧 BOT TELEGRAM TEMP MAIL `@yaoi.web.id` & MEDIA DOWNLOADER

Bot Telegram Email Sementara (Temp Mail) dan Media Downloader berarsitektur modular yang dibangun menggunakan **Node.js**, **grammY framework**, dan **SQLite** (`better-sqlite3` dengan WAL mode enabled). Semua email yang digenerate **WAJIB berakhiran `@yaoi.web.id`**.

---

## 🌟 FITUR UTAMA BOT

### 1. 📧 Temp Mail Service (`@yaoi.web.id`)
- **Random Email Generator**: Buat email acak sekali klik.
- **Custom Email Generator**: Buat email dengan nama pilihan sendiri (`nama@yaoi.web.id`).
- **Live Inbox Streaming**: Pemantauan pesan masuk secara realtime (auto refresh tiap 5 detik).
- **OTP Auto Detector**: Deteksi otomatis kode verifikasi / OTP dengan tombol salin instan.
- **Manajemen Email & Inbox**: Riwayat email, baca isi pesan, dan hapus email.

### 2. 📥 Media Downloader
- **🐤 Twitter / X Downloader (`/twitter` / `/x`)**: Extract & direct download video postingan X/Twitter.

### 3. 🖥 System & Server Monitoring (`/server`)
- Pemantauan metrik server lengkap: Memory (RAM System & Process), System Uptime, Process Uptime, OS Name, Hostname, CPU Cores, Load Average, Log Storage, Database Size, dan Active Poller Sessions.

---

## 📋 DAFTAR PERINTAH BOT

| Perintah | Kategori | Deskripsi |
| :--- | :--- | :--- |
| `/start` | Utama | Menampilkan pesan selamat datang & menu utama |
| `/menu` | Utama | Buka menu navigasi utama |
| `/new` | Temp Mail | Buat email sementara acak `@yaoi.web.id` |
| `/custom` | Temp Mail | Buat email custom sesuai keinginan |
| `/inbox` | Temp Mail | Buka pesan masuk email aktif |
| `/live` | Temp Mail | Mode live streaming inbox 5 detik |
| `/history` | Temp Mail | Riwayat daftar email sementara |
| `/profile` | User | Detail statistik & profil pengguna |
| `/twitter <url>` | Downloader | Download Video Twitter / X |
| `/x <url>` | Downloader | Alias untuk downloader Twitter |
| `/server` | System | Cek RAM, Memory, CPU, OS, Logs & Task Status |
| `/help` | Bantuan | Panduan lengkap penggunaan bot |
| `/admin` | Admin | Dashboard manajemen bot untuk Admin & Owner |

---

## 📋 PERSYARATAN SYSTEM

- Node.js >= 18.0.0
- SQLite3
- PM2 (opsional, untuk manajemen proses produksi)

---

## 🛠 INSTALASI

1. Clone repository atau salin folder proyek ini:
   ```bash
   cd temp-bot
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
