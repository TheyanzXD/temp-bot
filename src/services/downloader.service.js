if (typeof globalThis.File === 'undefined') {
  const { Blob, File } = require('node:buffer');
  globalThis.File = File || class File extends Blob {
    constructor(sources, name, options = {}) {
      super(sources, options);
      this.name = name;
      this.lastModified = options.lastModified || Date.now();
    }
  };
}

const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Extract Twitter / X Video Links via twmate.com
 */
async function extractTwitterVideo(twitterUrl) {
  const BASE_URL = "https://twmate.com/id2/?";
  const formData = new URLSearchParams({
    page: twitterUrl,
    ftype: "all",
    ajax: "1"
  }).toString();

  try {
    const { data } = await axios.post(BASE_URL, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://twmate.com/',
        'X-Requested-With': 'XMLHttpRequest'
      },
      timeout: 30000
    });

    const $ = cheerio.load(data);
    const videos = [];
    $('.files-table tbody tr').each((i, elem) => {
      const quality = $(elem).find('td').eq(0).text().trim();
      const type = $(elem).find('td').eq(1).text().trim();
      const downloadBtn = $(elem).find('td').eq(2).find('a');
      const link = downloadBtn.attr('href') || $(elem).find('a').attr('href');
      if (link) {
        videos.push({ quality, type, link });
      }
    });

    if (videos.length === 0) {
      $('a.download-btn, a[href*="twmate"]').each((i, elem) => {
        const link = $(elem).attr('href');
        const text = $(elem).text().trim();
        if (link) videos.push({ quality: text || 'HD', type: 'mp4', link });
      });
    }

    if (videos.length === 0) {
      return { status: false, msg: 'Tidak ditemukan link video Twitter/X pada URL tersebut.' };
    }

    return { status: true, videos };
  } catch (err) {
    return { status: false, msg: err.message };
  }
}

module.exports = {
  extractTwitterVideo,
};
