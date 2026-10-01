/**
 * Implementation of MailProvider for temp.yaoi.web.id
 */
const { request } = require('undici');
const MailProvider = require('./MailProvider');
const config = require('../../config');
const { REQUIRED_DOMAIN, YAOI_ENDPOINTS } = require('../../config/constants');
const logger = require('../../utils/logger');
const { nowSeconds } = require('../../utils/time');

class YaoiProvider extends MailProvider {
  constructor() {
    super();
    this.apiBase = config.mailApiBase;
    this.apiKey = config.mailApiKey;
    this.domain = REQUIRED_DOMAIN;
  }

  /**
   * Helper request wrapper with 10s timeout and 2 retries.
   */
  async _fetch(urlPath, options = {}) {
    const fullUrl = `${this.apiBase}${urlPath}`;
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'YaoiTempMailBot/1.0',
      ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}),
      ...(options.headers || {}),
    };

    let retries = 2;
    while (retries >= 0) {
      try {
        const res = await request(fullUrl, {
          method: options.method || 'GET',
          headers,
          body: options.body ? JSON.stringify(options.body) : null,
          headersTimeout: 10000,
          bodyTimeout: 10000,
        });

        if (res.statusCode >= 200 && res.statusCode < 300) {
          const text = await res.body.text();
          try {
            return JSON.parse(text);
          } catch (e) {
            return text;
          }
        } else {
          logger.warn({ statusCode: res.statusCode, fullUrl }, 'YaoiProvider API non-200 response');
        }
      } catch (err) {
        logger.error({ err: err.message, fullUrl, retries }, 'YaoiProvider HTTP request error');
        if (retries === 0) throw err;
      }
      retries--;
    }
    return null;
  }

  async createMailbox({ localPart, password }) {
    const address = `${localPart}@${this.domain}`;
    // Attempt API creation if endpoint exists, otherwise fallback gracefully
    let providerRef = localPart;
    try {
      const resp = await this._fetch(YAOI_ENDPOINTS.CREATE_MAILBOX, {
        method: 'POST',
        body: { local_part: localPart, domain: this.domain, password },
      });
      if (resp && (resp.id || resp.ref)) {
        providerRef = resp.id || resp.ref;
      }
    } catch (err) {
      logger.info({ address }, 'YaoiProvider API createMailbox endpoint unreached, using local part ref');
    }

    return {
      address,
      providerRef,
      expiresAt: nowSeconds() + (config.emailTtlMinutes * 60),
    };
  }

  async listMessages({ address, providerRef }) {
    const localPart = address.split('@')[0];
    const endpoint = YAOI_ENDPOINTS.LIST_MESSAGES.replace(':ref', providerRef || localPart);
    
    let rawMessages = [];
    try {
      const resp = await this._fetch(endpoint);
      if (Array.isArray(resp)) {
        rawMessages = resp;
      } else if (resp && Array.isArray(resp.data)) {
        rawMessages = resp.data;
      } else if (resp && Array.isArray(resp.messages)) {
        rawMessages = resp.messages;
      } else if (resp && Array.isArray(resp.mails)) {
        rawMessages = resp.mails;
      }
    } catch (err) {
      logger.error({ err: err.message, address }, 'Failed to list messages from YaoiProvider');
      return [];
    }

    // Standardize array response
    return rawMessages.map((m) => ({
      id: String(m.id || m.message_id || m.mail_id || Math.random().toString(36).substring(2)),
      fromAddress: m.from_address || m.from || 'unknown@domain.com',
      fromName: m.from_name || m.sender_name || '',
      toAddress: address,
      subject: m.subject || '(Tanpa Subjek)',
      snippet: m.snippet || m.intro || (m.text ? m.text.substring(0, 100) : ''),
      receivedAt: m.timestamp || m.created_at || nowSeconds(),
    }));
  }

  async getMessage({ address, providerRef, id }) {
    const endpoint = YAOI_ENDPOINTS.GET_MESSAGE.replace(':id', id);
    let m = null;
    try {
      m = await this._fetch(endpoint);
    } catch (err) {
      logger.error({ err: err.message, id }, 'Failed to fetch detailed message from YaoiProvider');
    }

    if (!m) {
      return {
        id,
        fromAddress: 'unknown@domain.com',
        fromName: '',
        toAddress: address,
        subject: '(Pesan Tidak Ditemukan)',
        bodyText: 'Detail pesan tidak dapat dimuat dari server.',
        bodyHtml: '',
        snippet: '',
        attachments: [],
        receivedAt: nowSeconds(),
      };
    }

    return {
      id: String(m.id || id),
      fromAddress: m.from_address || m.from || 'unknown@domain.com',
      fromName: m.from_name || '',
      toAddress: address,
      subject: m.subject || '(Tanpa Subjek)',
      bodyText: m.body_text || m.text || m.content || '',
      bodyHtml: m.body_html || m.html || '',
      snippet: m.snippet || '',
      attachments: Array.isArray(m.attachments) ? m.attachments : [],
      receivedAt: m.timestamp || m.created_at || nowSeconds(),
    };
  }

  async deleteMailbox({ address, providerRef }) {
    const localPart = address.split('@')[0];
    const endpoint = YAOI_ENDPOINTS.DELETE_MAILBOX.replace(':ref', providerRef || localPart);
    try {
      await this._fetch(endpoint, { method: 'DELETE' });
      return true;
    } catch (e) {
      return false;
    }
  }

  async healthCheck() {
    try {
      const resp = await this._fetch(YAOI_ENDPOINTS.HEALTH_CHECK);
      return resp ? true : false;
    } catch (e) {
      return false;
    }
  }
}

module.exports = YaoiProvider;
