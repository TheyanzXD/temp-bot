const { InputFile } = require('grammy');
const axios = require('axios');
const { extractTwitterVideo } = require('../services/downloader.service');
const escapeHtml = require('../utils/escape-html');
const logger = require('../utils/logger');

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
  handleTwitter,
};
