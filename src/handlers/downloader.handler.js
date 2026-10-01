const { InputFile } = require('grammy');
const axios = require('axios');
const {
  fetchPlayTerabox,
  extractTwitterVideo,
  fetchInstagramV1,
  fetchInstagramV2,
  fetchInstagramV3,
  youtubeDownloader,
  teraplayerDownloader,
} = require('../services/downloader.service');
const escapeHtml = require('../utils/escape-html');
const logger = require('../utils/logger');

const igCache = new Map();

/**
 * /yt command handler
 */
async function handleYoutube(ctx) {
  const link = (ctx.match || '').trim() || ctx.message?.text?.split(' ').slice(1).join(' ').trim();
  if (!link || (!link.includes('youtube.com') && !link.includes('youtu.be'))) {
    return ctx.reply('⚠️ Kirim link YouTube yang valid!\n\n<b>Contoh:</b> <code>/yt https://youtu.be/...</code>', {
      parse_mode: 'HTML',
    });
  }

  const waitMsg = await ctx.reply('⏳ <i>Sedang mengambil media YouTube...</i>', { parse_mode: 'HTML' });

  try {
    const res = await youtubeDownloader(link);
    if (!res.status || !res.medias || res.medias.length === 0) {
      await ctx.api.editMessageText(ctx.chat.id, waitMsg.message_id, `❌ <b>Gagal Extract YouTube!</b>\n${escapeHtml(res.msg || 'Tidak ada media ditemukan.')}`, {
        parse_mode: 'HTML',
      });
      return;
    }

    let messageText = `🔴 <b>YOUTUBE DOWNLOADER</b>\n\n`;
    messageText += `🎬 <b>Judul:</b> ${escapeHtml(res.title)}\n`;
    if (res.duration) messageText += `⏱ <b>Durasi:</b> ${escapeHtml(res.duration)}\n`;
    messageText += `\n<b>Pilihan Unduhan:</b>\n`;

    res.medias.slice(0, 10).forEach((m, idx) => {
      const icon = m.type === 'audio' ? '🎵' : '🎥';
      const sizeText = m.sizeStr ? ` (${m.sizeStr})` : '';
      messageText += `${icon} <b>${escapeHtml(m.quality)}</b> [${escapeHtml(m.extension)}]${sizeText}: <a href="${m.url}">Download Direct</a>\n`;
    });

    await ctx.api.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => null);

    if (res.thumbnail) {
      await ctx.replyWithPhoto(res.thumbnail, {
        caption: messageText,
        parse_mode: 'HTML',
      }).catch(async () => {
        await ctx.reply(messageText, { parse_mode: 'HTML', disable_web_page_preview: true });
      });
    } else {
      await ctx.reply(messageText, { parse_mode: 'HTML', disable_web_page_preview: true });
    }
  } catch (err) {
    logger.error(`[YouTube] ERROR: ${err.message}`);
    await ctx.api.editMessageText(ctx.chat.id, waitMsg.message_id, `❌ <b>YouTube Error!</b>\nAlasan: ${escapeHtml(err.message)}`, {
      parse_mode: 'HTML',
    }).catch(() => null);
  }
}

/**
 * /tb command handler (Teraplayer API alternative)
 */
async function handleTeraboxAlt(ctx) {
  const link = (ctx.match || '').trim() || ctx.message?.text?.split(' ').slice(1).join(' ').trim();
  if (!link || (!link.includes('terabox') && !link.includes('1024tera') && !link.includes('teraplayer'))) {
    return ctx.reply('⚠️ Kirim link Terabox yang valid!\n\n<b>Contoh:</b> <code>/tb https://www.1024tera.com/sharing/link?surl=...</code>', {
      parse_mode: 'HTML',
    });
  }

  const waitMsg = await ctx.reply('⏳ <i>Sedang mengambil data Terabox via Teraplayer...</i>', { parse_mode: 'HTML' });

  try {
    let res = await teraplayerDownloader(link);
    if (!res.status || !res.files || res.files.length === 0) {
      // Fallback to fetchPlayTerabox
      res = await fetchPlayTerabox(link);
    }

    if (!res.status || !res.files || res.files.length === 0) {
      await ctx.api.editMessageText(ctx.chat.id, waitMsg.message_id, `❌ <b>Gagal Extract Terabox!</b>\n${escapeHtml(res.msg || 'Tidak ada file ditemukan.')}`, {
        parse_mode: 'HTML',
      });
      return;
    }

    let messageText = `📦 <b>TERABOX DOWNLOADER (Teraplayer)</b>\n\n`;
    res.files.forEach((file, index) => {
      messageText += `<b>${index + 1}. ${escapeHtml(file.name)}</b>\n`;
      if (file.size) messageText += `📊 Ukuran: <code>${file.size}</code>\n`;
      if (file.quality) messageText += `🎬 Kualitas: <code>${file.quality}</code>\n`;
      if (file.downloadLink) messageText += `🚀 <a href="${file.downloadLink}">Download Direct</a>\n`;
      if (file.streamUrl) messageText += `▶️ <a href="${file.streamUrl}">Stream Video Direct</a>\n`;
      messageText += `\n`;
    });

    const firstThumbnail = res.files[0]?.thumbnail;
    await ctx.api.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => null);

    if (firstThumbnail) {
      await ctx.replyWithPhoto(firstThumbnail, {
        caption: messageText,
        parse_mode: 'HTML',
      }).catch(async () => {
        await ctx.reply(messageText, { parse_mode: 'HTML', disable_web_page_preview: true });
      });
    } else {
      await ctx.reply(messageText, { parse_mode: 'HTML', disable_web_page_preview: true });
    }
  } catch (err) {
    logger.error(`[TeraboxAlt] ERROR: ${err.message}`);
    await ctx.api.editMessageText(ctx.chat.id, waitMsg.message_id, `❌ <b>Terabox Error!</b>\nAlasan: ${escapeHtml(err.message)}`, {
      parse_mode: 'HTML',
    }).catch(() => null);
  }
}

/**
 * /ig command handler
 */
async function handleInstagram(ctx) {
  const link = (ctx.match || '').trim() || ctx.message?.text?.split(' ').slice(1).join(' ').trim();
  if (!link || !link.includes('instagram.com')) {
    return ctx.reply('⚠️ Kirim link Instagram yang valid!\n\n<b>Contoh:</b> <code>/ig https://www.instagram.com/reel/...</code>', {
      parse_mode: 'HTML',
    });
  }

  const userId = ctx.from.id;
  igCache.set(userId, link);

  await ctx.reply('<blockquote>📥 <b>INSTAGRAM DOWNLOADER</b></blockquote>\nPilih server:', {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'V1', callback_data: 'ig_v1' }, { text: 'V2', callback_data: 'ig_v2' }],
        [{ text: 'V3', callback_data: 'ig_v3' }],
      ],
    },
  });
}

/**
 * Instagram Callback Action Handler (ig_v1, ig_v2, ig_v3)
 */
async function handleInstagramCallback(ctx) {
  const server = ctx.callbackQuery.data; // ig_v1, ig_v2, ig_v3
  const userId = ctx.from.id;
  const link = igCache.get(userId);

  if (!link) {
    return ctx.answerCallbackQuery({ text: '❌ Link hilang, kirim ulang /ig', show_alert: true });
  }

  await ctx.answerCallbackQuery({ text: '📥 Sedang Mengunduh...' });

  try {
    await ctx.editMessageText(`⏳ <b>${server.toUpperCase()}</b> sedang memproses video...`, {
      parse_mode: 'HTML',
    }).catch(() => null);

    let videoUrl = '';
    let caption = '🎬 <b>I N S T A G R A M</b>';

    if (server === 'ig_v1') {
      const res = await fetchInstagramV1(link);
      videoUrl = res.videoUrl;
    } else if (server === 'ig_v2') {
      const res = await fetchInstagramV2(link);
      videoUrl = res.videoUrl;
    } else if (server === 'ig_v3') {
      const res = await fetchInstagramV3(link);
      videoUrl = res.videoUrl;
      if (res.username) {
        const cleanCaption = res.caption ? escapeHtml(res.caption) : '-';
        caption += `\n\n👤 <b>User</b>: ${escapeHtml(res.username)}\n📝 <b>Caption</b>: ${cleanCaption}`;
      }
    }

    if (!videoUrl) throw new Error('Gagal mendapatkan URL video dari API.');

    await ctx.editMessageText(`🚀 Sedang mendownload video...`, { parse_mode: 'HTML' }).catch(() => null);

    const videoBuffer = await axios.get(videoUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
      },
      timeout: 60000,
    });

    const replyMsgId = ctx.callbackQuery.message?.reply_to_message?.message_id;

    await ctx.replyWithVideo(new InputFile(Buffer.from(videoBuffer.data), 'instagram.mp4'), {
      caption: caption,
      parse_mode: 'HTML',
      reply_parameters: replyMsgId ? { message_id: replyMsgId } : undefined,
    });

    await ctx.deleteMessage().catch(() => null);
    igCache.delete(userId);
  } catch (err) {
    logger.error(`[${server}] ERROR: ${err.message}`);
    await ctx.editMessageText(`❌ <b>${server.toUpperCase()} Gagal!</b>\nAlasan: ${escapeHtml(err.message)}\nCoba server lain, jir.`, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 Coba V1', callback_data: 'ig_v1' }, { text: '🔄 Coba V2', callback_data: 'ig_v2' }],
          [{ text: '🔄 Coba V3', callback_data: 'ig_v3' }],
        ],
      },
    }).catch(() => null);
  }
}

/**
 * /terabox command handler
 */
async function handleTerabox(ctx) {
  const link = (ctx.match || '').trim() || ctx.message?.text?.split(' ').slice(1).join(' ').trim();
  if (!link || (!link.includes('terabox') && !link.includes('1024terabox'))) {
    return ctx.reply('⚠️ Kirim link Terabox yang valid!\n\n<b>Contoh:</b> <code>/terabox https://1024terabox.com/s/...</code>', {
      parse_mode: 'HTML',
    });
  }

  const waitMsg = await ctx.reply('⏳ <i>Sedang mengambil data Terabox...</i>', { parse_mode: 'HTML' });

  try {
    const res = await fetchPlayTerabox(link);
    if (!res.status || !res.files || res.files.length === 0) {
      await ctx.api.editMessageText(ctx.chat.id, waitMsg.message_id, `❌ <b>Gagal Extract Terabox!</b>\n${escapeHtml(res.msg || 'Tidak ada file ditemukan.')}`, {
        parse_mode: 'HTML',
      });
      return;
    }

    let messageText = `📦 <b>TERABOX DOWNLOADER</b>\n\n`;
    messageText += `📁 Total Files: <b>${res.totalFiles || res.files.length}</b>\n`;
    messageText += `📂 Total Folders: <b>${res.totalFolders || 0}</b>\n\n`;

    res.files.forEach((file, index) => {
      messageText += `<b>${index + 1}. ${escapeHtml(file.name)}</b>\n`;
      if (file.size) messageText += `📊 Ukuran: <code>${file.size}</code>\n`;
      if (file.duration) messageText += `⏱ Durasi: <code>${file.duration}</code>\n`;
      if (file.quality) messageText += `🎬 Kualitas: <code>${file.quality}</code>\n`;
      if (file.downloadLink) messageText += `🚀 <a href="${file.downloadLink}">Download HD Direct</a>\n`;
      if (file.fastStreamUrl) {
        const streamUrl = typeof file.fastStreamUrl === 'string' ? file.fastStreamUrl : (file.fastStreamUrl.h264 || file.fastStreamUrl.url || Object.values(file.fastStreamUrl)[0]);
        if (streamUrl) messageText += `▶️ <a href="${streamUrl}">Stream Video Direct</a>\n`;
      }
      messageText += `\n`;
    });

    const firstThumbnail = res.files[0]?.thumbnail;
    await ctx.api.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => null);

    if (firstThumbnail) {
      await ctx.replyWithPhoto(firstThumbnail, {
        caption: messageText,
        parse_mode: 'HTML',
      }).catch(async () => {
        await ctx.reply(messageText, { parse_mode: 'HTML', disable_web_page_preview: true });
      });
    } else {
      await ctx.reply(messageText, { parse_mode: 'HTML', disable_web_page_preview: true });
    }
  } catch (err) {
    logger.error(`[Terabox] ERROR: ${err.message}`);
    await ctx.api.editMessageText(ctx.chat.id, waitMsg.message_id, `❌ <b>Terabox Error!</b>\nAlasan: ${escapeHtml(err.message)}`, {
      parse_mode: 'HTML',
    }).catch(() => null);
  }
}

/**
 * /twitter or /x command handler
 */
async function handleTwitter(ctx) {
  const link = (ctx.match || '').trim() || ctx.message?.text?.split(' ').slice(1).join(' ').trim();
  if (!link || (!link.includes('twitter.com') && !link.includes('x.com'))) {
    return ctx.reply('⚠️ Kirim link Twitter / X yang valid!\n\n<b>Contoh:</b> <code>/twitter https://x.com/user/status/...</code>', {
      parse_mode: 'HTML',
    });
  }

  const waitMsg = await ctx.reply('⏳ <i>Sedang mengambil video Twitter / X...</i>', { parse_mode: 'HTML' });

  try {
    const res = await extractTwitterVideo(link);
    if (!res.status || !res.videos || res.videos.length === 0) {
      await ctx.api.editMessageText(ctx.chat.id, waitMsg.message_id, `❌ <b>Gagal Extract Twitter!</b>\n${escapeHtml(res.msg || 'Tidak ada video ditemukan.')}`, {
        parse_mode: 'HTML',
      });
      return;
    }

    let messageText = `🐤 <b>TWITTER / X DOWNLOADER</b>\n\n`;
    res.videos.forEach((vid, i) => {
      messageText += `🎥 <b>Resolusi:</b> ${escapeHtml(vid.quality || 'HD')} (${escapeHtml(vid.type || 'mp4')})\n`;
      messageText += `📥 <a href="${vid.link}">Download Video ${i + 1}</a>\n\n`;
    });

    const bestVideo = res.videos[0];
    await ctx.api.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => null);

    if (bestVideo && bestVideo.link) {
      // Try sending video directly first
      try {
        const videoBuffer = await axios.get(bestVideo.link, {
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          timeout: 60000,
        });

        await ctx.replyWithVideo(new InputFile(Buffer.from(videoBuffer.data), 'twitter.mp4'), {
          caption: messageText,
          parse_mode: 'HTML',
        });
        return;
      } catch (e) {
        logger.warn(`Could not fetch direct video buffer for Twitter: ${e.message}`);
      }
    }

    await ctx.reply(messageText, { parse_mode: 'HTML', disable_web_page_preview: true });
  } catch (err) {
    logger.error(`[Twitter] ERROR: ${err.message}`);
    await ctx.api.editMessageText(ctx.chat.id, waitMsg.message_id, `❌ <b>Twitter Error!</b>\nAlasan: ${escapeHtml(err.message)}`, {
      parse_mode: 'HTML',
    }).catch(() => null);
  }
}

module.exports = {
  handleInstagram,
  handleInstagramCallback,
  handleTerabox,
  handleTwitter,
  handleYoutube,
  handleTeraboxAlt,
  igCache,
};
