const axios = require('axios');
const crypto = require('crypto');
const cheerio = require('cheerio');

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
 * Instagram Download APIs
 */
async function fetchInstagramV1(link) {
  const res = await axios.get(`https://api.deline.web.id/downloader/ig?url=${encodeURIComponent(link)}`, { timeout: 30000 });
  const videoUrl = res.data?.result?.media?.videos?.[0] || res.data?.result?.videos?.[0];
  if (!videoUrl) throw new Error("Gagal mendapatkan URL video dari API V1.");
  return { videoUrl };
}

async function fetchInstagramV2(link) {
  const res = await axios.get(`https://api.ikyyxd.my.id/download/igv2?url=${encodeURIComponent(link)}`, { timeout: 30000 });
  const videoUrl = res.data?.result?.[0]?.url;
  if (!videoUrl) throw new Error("Gagal mendapatkan URL video dari API V2.");
  return { videoUrl };
}

async function fetchInstagramV3(link) {
  const res = await axios.get(`https://api.zenzxz.my.id/download/instagram?url=${encodeURIComponent(link)}`, { timeout: 30000 });
  const data = res.data?.result;
  if (!data || !data.url) throw new Error("Gagal mendapatkan URL video dari API V3.");
  return {
    videoUrl: data.url,
    username: data.username,
    caption: data.caption
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
  fetchPlayTerabox,
  extractTwitterVideo,
  fetchInstagramV1,
  fetchInstagramV2,
  fetchInstagramV3,
  youtubeDownloader,
  teraplayerDownloader,
};
