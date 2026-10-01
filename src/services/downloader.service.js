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
const crypto = require('crypto');
const cheerio = require('cheerio');
const { addExtra } = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const puppeteer = addExtra(require('puppeteer'));
puppeteer.use(StealthPlugin());

const TARGET_SITE = 'https://fastdl.app';

class FastDlDirectBot {
  async downloadInstagram(instagramUrl) {
    let browser = null;
    try {
      browser = await puppeteer.launch({
        executablePath: puppeteer.executablePath(),
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ]
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1366, height: 768 });

      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        window.chrome = { runtime: {} };
        Object.defineProperty(navigator, 'languages', { get: () => ['id-ID', 'id', 'en-US', 'en'] });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      });

      await page.goto(TARGET_SITE, { waitUntil: 'networkidle2', timeout: 35000 });
      await new Promise(r => setTimeout(r, 1500));

      let apiResponse = null;
      let apiResponseRaw = null;

      page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('/api/convert')) {
          try {
            apiResponseRaw = await response.text();
            try {
              apiResponse = JSON.parse(apiResponseRaw);
            } catch (e) {
              const jsonMatch = apiResponseRaw.match(/\{[\s\S]*\}/);
              if (jsonMatch) apiResponse = JSON.parse(jsonMatch[0]);
            }
          } catch (e) {
            // ignore parse error
          }
        }
      });

      const inputFound = await page.evaluate((url) => {
        const selectors = [
          'input[type="text"]', 'input[type="url"]',
          'input[name="url"]', 'input[placeholder*="URL"]',
          'input[placeholder*="url"]', 'input[placeholder*="link"]',
          '#url-input', '#url', '.url-input', 'form input'
        ];
        let input = null;
        for (const sel of selectors) {
          input = document.querySelector(sel);
          if (input) break;
        }
        if (!input) return false;

        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, 'value'
        ).set;

        nativeInputValueSetter.call(input, url);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
        return true;
      }, instagramUrl);

      if (!inputFound) throw new Error('Input URL tidak ditemukan.');

      await new Promise(r => setTimeout(r, 1000));

      const btnClicked = await page.evaluate(() => {
        const selectors = [
          'button[type="submit"]', 'button.btn',
          '.download-btn', '.btn-download', 'form button',
          '[class*="download"]', '[class*="submit"]', '[class*="convert"]'
        ];
        for (const sel of selectors) {
          const btns = document.querySelectorAll(sel);
          for (const btn of btns) {
            if (btn.offsetParent !== null && btn.textContent.trim().length > 0) {
              btn.click();
              return btn.textContent.trim().substring(0, 30);
            }
          }
        }
        const form = document.querySelector('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { bubbles: true }));
          return 'form_submit';
        }
        return null;
      });

      if (!btnClicked) throw new Error('Tombol download tidak ditemukan.');

      let waitTime = 0;
      const maxWait = 35000;
      while (!apiResponse && waitTime < maxWait) {
        await new Promise(r => setTimeout(r, 500));
        waitTime += 500;
      }

      if (!apiResponse) throw new Error('Respons API FastDL timeout.');

      let data = apiResponse;
      if (data?.url && Array.isArray(data.url) && data.url.length > 0) {
        const bestMedia = data.url.reduce((prev, curr) =>
          ((curr.quality || 0) > (prev.quality || 0)) ? curr : prev
        );

        return {
          status: true,
          mediaUrl: bestMedia.url,
          isVideo: (bestMedia.type || bestMedia.ext || '').includes('mp4') || bestMedia.ext === 'mp4',
          title: data.meta?.title || 'Instagram Post',
          username: data.meta?.username || 'unknown',
          thumbnail: data.meta?.thumbnail || null,
        };
      }

      throw new Error('FastDL tidak mengembalikan link media.');
    } finally {
      if (browser) await browser.close().catch(() => null);
    }
  }
}

/**
 * Clean Instagram URL helper
 */
function cleanInstagramUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    return u.origin + u.pathname;
  } catch (e) {
    return url.split('?')[0];
  }
}

/**
 * Generate Token for Terabox API
 */
function generateTeraboxToken(timestamp) {
  const salt = "T9do@SM1?xGn5";
  const path = "/api/stream.php";
  const stringToHash = salt + timestamp + path;
  return crypto.createHash('md5').update(stringToHash).digest('hex');
}

/**
 * Fetch Terabox Video & Download Links
 */
async function fetchPlayTerabox(teraboxUrl) {
  const timestamp = Math.floor(Date.now() / 1000);
  const token = generateTeraboxToken(timestamp);
  const endpoint = `https://playterabox.com/api/fetch-video?token=${token}&t=${timestamp}`;
  const payload = { url: teraboxUrl };

  const headers = {
    'Accept': '*/*',
    'Content-Type': 'application/json',
    'Origin': 'https://playterabox.com',
    'Referer': 'https://playterabox.com/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  try {
    const { data } = await axios.post(endpoint, payload, { headers, timeout: 30000 });

    if (data && data.status === 'success') {
      return {
        status: true,
        totalFiles: data.total_files,
        totalFolders: data.total_folders,
        files: (data.list || []).map(file => ({
          name: file.name,
          size: file.size_formatted,
          sizeBytes: file.size,
          duration: file.duration,
          quality: file.quality,
          thumbnail: file.thumbnail,
          downloadLink: file.download_link,
          normalDlink: file.normal_dlink,
          fastStreamUrl: file.fast_stream_url,
          subtitleUrl: file.subtitle_url
        }))
      };
    }

    return {
      status: false,
      msg: data?.message || 'Gagal mengekstrak file.'
    };
  } catch (error) {
    if (error.response) {
      return { status: false, msg: `API Error (${error.response.status}): ${JSON.stringify(error.response.data)}` };
    }
    return { status: false, msg: error.message };
  }
}

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

/**
 * Instagram V1 (Deline API with Image/Video support)
 */
async function fetchInstagramV1(rawLink) {
  const link = cleanInstagramUrl(rawLink);
  const res = await axios.get(`https://api.deline.web.id/downloader/ig?url=${encodeURIComponent(link)}`, { timeout: 30000 });
  const media = res.data?.result?.media || res.data?.result;
  
  let mediaUrl = null;
  let isVideo = false;

  if (media) {
    if (Array.isArray(media.videos) && media.videos.length > 0) {
      mediaUrl = media.videos[0];
      isVideo = true;
    } else if (Array.isArray(media.images) && media.images.length > 0) {
      mediaUrl = media.images[0];
      isVideo = false;
    } else if (typeof media.url === 'string') {
      mediaUrl = media.url;
      isVideo = mediaUrl.includes('.mp4');
    } else if (Array.isArray(media) && media.length > 0) {
      mediaUrl = media[0]?.url || media[0];
      isVideo = typeof mediaUrl === 'string' && mediaUrl.includes('.mp4');
    }
  }

  if (!mediaUrl || typeof mediaUrl !== 'string') {
    throw new Error("Gagal mendapatkan URL media dari API V1.");
  }

  return { videoUrl: mediaUrl, mediaUrl, isVideo };
}

/**
 * Instagram V2 (Ikyyxd API)
 */
async function fetchInstagramV2(rawLink) {
  const link = cleanInstagramUrl(rawLink);
  const res = await axios.get(`https://api.ikyyxd.my.id/download/igv2?url=${encodeURIComponent(link)}`, { timeout: 30000 });
  const result = res.data?.result;
  const mediaUrl = Array.isArray(result) ? (result[0]?.url || result[0]) : (result?.url || result);
  
  if (!mediaUrl || typeof mediaUrl !== 'string') {
    throw new Error("Gagal mendapatkan URL media dari API V2.");
  }
  
  const isVideo = mediaUrl.includes('.mp4');
  return { videoUrl: mediaUrl, mediaUrl, isVideo };
}

/**
 * Instagram V3 (Zenzxz / Backup API)
 */
async function fetchInstagramV3(rawLink) {
  const link = cleanInstagramUrl(rawLink);
  const res = await axios.get(`https://api.zenzxz.my.id/download/instagram?url=${encodeURIComponent(link)}`, { timeout: 30000 });
  const data = res.data?.result;
  const mediaUrl = data?.url || (Array.isArray(data) ? data[0]?.url : null);
  
  if (!mediaUrl || typeof mediaUrl !== 'string') {
    throw new Error("Gagal mendapatkan URL media dari API V3.");
  }
  
  return {
    videoUrl: mediaUrl,
    mediaUrl,
    username: data?.username,
    caption: data?.caption,
    isVideo: mediaUrl.includes('.mp4')
  };
}

/**
 * Instagram V4 (FastDL Stealth Scraper)
 */
async function fetchInstagramFastDL(rawLink) {
  const link = cleanInstagramUrl(rawLink);
  const fastdl = new FastDlDirectBot();
  const res = await fastdl.downloadInstagram(link);
  return {
    videoUrl: res.mediaUrl,
    mediaUrl: res.mediaUrl,
    isVideo: res.isVideo,
    username: res.username,
    title: res.title,
    thumbnail: res.thumbnail
  };
}

/**
 * YouTube Downloader via ytultra API
 */
async function youtubeDownloader(url) {
  try {
    const { data } = await axios.post(
      'https://api.ytultra.com/ikool/youtube/download',
      { url },
      {
        headers: {
          'Content-Type': 'application/json',
          'referer': 'https://www.ytultra.com/id/youtube-video-downloader/',
          'origin': 'https://www.ytultra.com',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 30000,
      }
    );

    if (data && data.data && Array.isArray(data.data.medias)) {
      return {
        status: true,
        title: data.data.title || 'YouTube Video',
        duration: data.data.duration || null,
        thumbnail: data.data.thumbnail || null,
        medias: data.data.medias.map((m) => ({
          url: m.url,
          quality: m.quality || m.resolution || 'HD',
          extension: m.extension || m.ext || 'mp4',
          type: m.type || (m.extension === 'm4a' || m.extension === 'mp3' ? 'audio' : 'video'),
          sizeStr: m.sizeStr || m.fileSize || null,
        })),
      };
    }
    return { status: false, msg: 'Gagal mengekstrak media dari YouTube.' };
  } catch (error) {
    return { status: false, msg: error.message };
  }
}

/**
 * Terabox Downloader via Teraplayer API
 */
async function teraplayerDownloader(url) {
  try {
    const { data } = await axios.post(
      'https://teraplayer-backend-temp.onrender.com/api/preview',
      { url: url, password: '' },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'origin': 'https://www.teraplayer.in',
          'referer': 'https://www.teraplayer.in/',
        },
        timeout: 30000,
      }
    );

    if (data && Array.isArray(data.list) && data.list.length > 0) {
      return {
        status: true,
        files: data.list.map((f) => ({
          name: f.name,
          size: f.size_str || (f.size ? (f.size / 1024 / 1024).toFixed(2) + ' MB' : null),
          quality: f.resolution || 'HD',
          thumbnail: f.thumbnail,
          downloadLink: f.download_url || f.stream_url,
          streamUrl: f.stream_url,
        })),
      };
    }
    return { status: false, msg: 'Gagal mengekstrak data Terabox via Teraplayer.' };
  } catch (error) {
    return { status: false, msg: error.message };
  }
}

module.exports = {
  cleanInstagramUrl,
  fetchPlayTerabox,
  extractTwitterVideo,
  fetchInstagramV1,
  fetchInstagramV2,
  fetchInstagramV3,
  fetchInstagramFastDL,
  youtubeDownloader,
  teraplayerDownloader,
};
