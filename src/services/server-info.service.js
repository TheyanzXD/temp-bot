const os = require('os');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const db = require('../database/connection');
const { formatBytes } = require('../views/formatters');

function formatDuration(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

function getDirectorySize(dirPath) {
  let size = 0;
  let fileCount = 0;
  if (!fs.existsSync(dirPath)) return { size, fileCount };

  try {
    const files = fs.readdirSync(dirPath);
    files.forEach((file) => {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      if (stat.isFile()) {
        size += stat.size;
        fileCount++;
      }
    });
  } catch (e) {
    // Ignore error
  }
  return { size, fileCount };
}

function getServerStatus() {
  // System metrics
  const hostname = os.hostname();
  const platform = os.platform();
  const type = os.type();
  const release = os.release();
  const arch = os.arch();
  const osName = `${type} (${platform} ${arch} ${release})`;

  const cpus = os.cpus();
  const cpuModel = cpus.length > 0 ? cpus[0].model.trim() : 'Unknown';
  const cpuCores = cpus.length;
  const loadAvg = os.loadavg().map((l) => l.toFixed(2)).join(', ');

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const ramUsagePercent = ((usedMem / totalMem) * 100).toFixed(1);

  // Process metrics
  const procMem = process.memoryUsage();
  const processRss = procMem.rss;
  const processHeapUsed = procMem.heapUsed;
  const processHeapTotal = procMem.heapTotal;
  const nodeVersion = process.version;
  const pid = process.pid;

  const sysUptime = formatDuration(os.uptime());
  const procUptime = formatDuration(process.uptime());

  // Directory / Storage metrics
  const logsInfo = getDirectorySize(path.resolve(process.cwd(), 'logs'));
  const backupInfo = getDirectorySize(path.resolve(process.cwd(), 'data/backup'));

  let dbSizeBytes = 0;
  try {
    const stat = fs.statSync(config.dbPath);
    dbSizeBytes = stat.size;
  } catch (e) {
    dbSizeBytes = 0;
  }

  // Application & Tasks metrics
  let totalUsers = 0;
  let activeEmails = 0;
  let totalMessages = 0;
  let activeLiveSessions = 0;

  try {
    totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
    activeEmails = db.prepare("SELECT COUNT(*) as c FROM emails WHERE status = 'active'").get().c;
    totalMessages = db.prepare('SELECT COUNT(*) as c FROM messages').get().c;
    activeLiveSessions = db.prepare('SELECT COUNT(*) as c FROM live_sessions WHERE is_active = 1').get().c;
  } catch (e) {
    // Ignore DB fetch errors
  }

  return {
    hostname,
    osName,
    platform,
    arch,
    cpuModel,
    cpuCores,
    loadAvg,
    totalMem: formatBytes(totalMem),
    freeMem: formatBytes(freeMem),
    usedMem: formatBytes(usedMem),
    ramUsagePercent: `${ramUsagePercent}%`,
    processRss: formatBytes(processRss),
    processHeapUsed: formatBytes(processHeapUsed),
    processHeapTotal: formatBytes(processHeapTotal),
    nodeVersion,
    pid,
    sysUptime,
    procUptime,
    logsSize: formatBytes(logsInfo.size),
    logsFileCount: logsInfo.fileCount,
    backupSize: formatBytes(backupInfo.size),
    backupFileCount: backupInfo.fileCount,
    dbSize: formatBytes(dbSizeBytes),
    totalUsers,
    activeEmails,
    totalMessages,
    activeLiveSessions,
  };
}

module.exports = {
  getServerStatus,
  formatDuration,
};
