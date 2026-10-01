const { getServerStatus } = require('../services/server-info.service');
const { formatWib, nowSeconds } = require('../utils/time');
const escapeHtml = require('../utils/escape-html');
const { SEPARATOR } = require('../views/messages');

module.exports = async function serverHandler(ctx) {
  const info = getServerStatus();

  let text = `🖥 <b>SERVER DIAGNOSTIC & MONITORING</b>\n`;
  text += `${SEPARATOR}\n`;
  text += `💻 <b>Host & System OS</b>\n`;
  text += `• <b>Hostname:</b> <code>${escapeHtml(info.hostname)}</code>\n`;
  text += `• <b>OS Name:</b> <code>${escapeHtml(info.osName)}</code>\n`;
  text += `• <b>Node.js:</b> <code>${escapeHtml(info.nodeVersion)}</code> (PID: <code>${info.pid}</code>)\n`;
  text += `• <b>CPU:</b> <code>${escapeHtml(info.cpuModel)}</code> (${info.cpuCores} Cores)\n`;
  text += `• <b>Load Avg:</b> <code>${info.loadAvg}</code>\n\n`;

  text += `📊 <b>Memory / RAM Status</b>\n`;
  text += `• <b>System RAM Used:</b> <code>${info.usedMem}</code> / <code>${info.totalMem}</code> (<b>${info.ramUsagePercent}</b>)\n`;
  text += `• <b>System RAM Free:</b> <code>${info.freeMem}</code>\n`;
  text += `• <b>Process RSS:</b> <code>${info.processRss}</code>\n`;
  text += `• <b>Heap Memory:</b> <code>${info.processHeapUsed}</code> / <code>${info.processHeapTotal}</code>\n\n`;

  text += `⚡ <b>Services & Uptime</b>\n`;
  text += `• <b>System Uptime:</b> <code>${info.sysUptime}</code>\n`;
  text += `• <b>Process Uptime:</b> <code>${info.procUptime}</code>\n`;
  text += `• <b>Active Live Sessions:</b> <code>${info.activeLiveSessions}</code>\n`;
  text += `• <b>Active Temp Emails:</b> <code>${info.activeEmails}</code>\n`;
  text += `• <b>Total Users Registered:</b> <code>${info.totalUsers}</code>\n\n`;

  text += `📁 <b>Storage, Logs & Tasks</b>\n`;
  text += `• <b>Database Size:</b> <code>${info.dbSize}</code>\n`;
  text += `• <b>Log Files Size:</b> <code>${info.logsSize}</code> (${info.logsFileCount} files)\n`;
  text += `• <b>Backup Files Size:</b> <code>${info.backupSize}</code> (${info.backupFileCount} files)\n`;
  text += `${SEPARATOR}\n`;
  text += `⏱ <i>Waktu Cek: ${formatWib(nowSeconds())}</i>`;

  await ctx.reply(text, { parse_mode: 'HTML' });
};
