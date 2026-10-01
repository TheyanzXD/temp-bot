/**
 * Implementation of MailProvider for temp.yaoi.web.id API v1.
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

  /**
   * Helper to parse date string or timestamp into epoch seconds
   */
  _parseEpoch(val) {
    if (!val) return nowSeconds();
    if (typeof val === 'number') {
      return val > 1e11 ? Math.floor(val / 1000) : val;
    }
    const parsed = Date.parse(val);
    return isNaN(parsed) ? nowSeconds() : Math.floor(parsed / 1000);
  }

  async createMailbox({ localPart }) {
    const address = `${localPart}@${this.domain}`;
    let providerRef = localPart;

    try {
      const resp = await this._fetch(YAOI_ENDPOINTS.CREATE_MAILBOX, {
        method: 'POST',
        body: { username: localPart, domain: this.domain, lifetimeMinutes: config.emailTtlMinutes || 60 },
      });

      if (resp && resp.data && resp.data.id) {
        providerRef = resp.data.id;
      } else if (resp && (resp.id || resp.ref)) {
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

  async listMessages({ address }) {
    const endpoint = YAOI_ENDPOINTS.LIST_MESSAGES.replace(':address', encodeURIComponent(address));
    
    let rawMessages = [];
    try {
      const resp = await this._fetch(endpoint);
      if (resp && resp.data && Array.isArray(resp.data.messages)) {
        rawMessages = resp.data.messages;
      } else if (resp && Array.isArray(resp.data)) {
        rawMessages = resp.data;
      } else if (resp && Array.isArray(resp.messages)) {
        rawMessages = resp.messages;
      } else if (Array.isArray(resp)) {
        rawMessages = resp;
      }
    } catch (err) {
      logger.error({ err: err.message, address }, 'Failed to list messages from YaoiProvider');
      return [];
    }

    return rawMessages.map((m) => {
      const fromAddr = m.from ? (m.from.address || m.from) : (m.from_address || 'unknown@domain.com');
      const fromNm = m.from ? (m.from.name || '') : (m.from_name || '');
      const rAt = this._parseEpoch(m.receivedAt || m.timestamp || m.created_at);

      return {
        id: String(m.id || m.message_id || Math.random().toString(36).substring(2)),
        fromAddress: fromAddr,
        fromName: fromNm,
        toAddress: address,
        subject: m.subject || '(Tanpa Subjek)',
        snippet: m.preview || m.snippet || m.intro || (m.text ? m.text.substring(0, 100) : ''),
        receivedAt: rAt,
      };
    });
  }

  async getMessage({ address, id }) {
    const endpoint = YAOI_ENDPOINTS.GET_MESSAGE
      .replace(':address', encodeURIComponent(address))
      .replace(':id', encodeURIComponent(id));

    let m = null;
    try {
      const resp = await this._fetch(endpoint);
      if (resp && resp.data) {
        m = resp.data;
      } else {
        m = resp;
      }
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

    const fromAddr = m.from ? (m.from.address || m.from) : (m.from_address || 'unknown@domain.com');
    const fromNm = m.from ? (m.from.name || '') : (m.from_name || '');
    const rAt = this._parseEpoch(m.receivedAt || m.timestamp || m.created_at);

    return {
      id: String(m.id || id),
      fromAddress: fromAddr,
      fromName: fromNm,
      toAddress: address,
      subject: m.subject || '(Tanpa Subjek)',
      bodyText: m.textBody || m.preview || m.body_text || m.text || m.content || '',
      bodyHtml: m.htmlBody || m.sanitizedHtml || m.body_html || m.html || '',
      snippet: m.preview || m.snippet || '',
      attachments: Array.isArray(m.attachments) ? m.attachments : [],
      receivedAt: rAt,
    };
  }

  async deleteMailbox({ address }) {
    const endpoint = YAOI_ENDPOINTS.DELETE_MAILBOX.replace(':address', encodeURIComponent(address));
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
      return resp && resp.ok ? true : false;
    } catch (e) {
      return false;
    }
  }
}

module.exports = YaoiProvider;
