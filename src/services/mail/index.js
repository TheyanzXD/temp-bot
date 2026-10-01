/**
 * Factory module for selecting the active MailProvider instance.
 */
const config = require('../../config');
const YaoiProvider = require('./YaoiProvider');
const MockProvider = require('./MockProvider');
const logger = require('../../utils/logger');

let providerInstance = null;

function getMailProvider() {
  if (!providerInstance) {
    if (config.mailProvider.toLowerCase() === 'mock') {
      logger.info('Using MockProvider for mail service.');
      providerInstance = new MockProvider();
    } else {
      logger.info('Using YaoiProvider for mail service (@yaoi.web.id).');
      providerInstance = new YaoiProvider();
    }
  }
  return providerInstance;
}

module.exports = {
  getMailProvider,
};
