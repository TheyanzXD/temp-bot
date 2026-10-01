/**
 * Logger module using Pino with console and file output support.
 */
const pino = require('pino');
const path = require('path');
const fs = require('fs');

const logDir = path.resolve(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logLevel = process.env.LOG_LEVEL || 'info';

const transport = pino.transport({
  targets: [
    {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:yyyy-mm-dd HH:MM:ss' },
      level: logLevel,
    },
    {
      target: 'pino/file',
      options: { destination: path.join(logDir, 'app.log') },
      level: logLevel,
    },
  ],
});

const logger = pino({ level: logLevel }, transport);

module.exports = logger;
