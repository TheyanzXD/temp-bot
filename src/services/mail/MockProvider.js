/**
 * Mock MailProvider implementation for offline testing.
 */
const MailProvider = require('./MailProvider');
const { REQUIRED_DOMAIN } = require('../../config/constants');
const { nowSeconds } = require('../../utils/time');

class MockProvider extends MailProvider {
  constructor() {
    super();
    this.mailboxes = new Map();
  }

  async createMailbox({ localPart }) {
    const address = `${localPart}@${REQUIRED_DOMAIN}`;
    this.mailboxes.set(address, []);
    return {
      address,
      providerRef: localPart,
      expiresAt: nowSeconds() + 3600,
    };
  }

  async listMessages({ address }) {
    if (!this.mailboxes.has(address)) {
      this.mailboxes.set(address, []);
    }
    const list = this.mailboxes.get(address);

    // Seed mock verification OTP email if empty for demonstration
    if (list.length === 0) {
      const mockMsg = {
        id: `mock_${Date.now()}`,
        fromAddress: 'no-reply@service.com',
        fromName: 'Verification Service',
        toAddress: address,
        subject: 'Kode Verifikasi Akun Anda',
        snippet: 'Kode verifikasi keamanan Anda adalah 482913. Berlaku selama 10 menit.',
        bodyText: 'Halo,\n\nKode verifikasi keamanan Anda adalah 482913. Berlaku selama 10 menit.\nJangan berikan kode ini kepada siapapun.',
        bodyHtml: '<p>Halo,<br>Kode verifikasi keamanan Anda adalah <b>482913</b>.</p>',
        attachments: [],
        receivedAt: nowSeconds(),
      };
      list.push(mockMsg);
    }

    return list.map((m) => ({
      id: m.id,
      fromAddress: m.fromAddress,
      fromName: m.fromName,
      toAddress: address,
      subject: m.subject,
      snippet: m.snippet,
      receivedAt: m.receivedAt,
    }));
  }

  async getMessage({ address, id }) {
    const list = this.mailboxes.get(address) || [];
    const found = list.find((m) => m.id === id);
    if (found) return found;

    return {
      id,
      fromAddress: 'no-reply@service.com',
      fromName: 'Verification Service',
      toAddress: address,
      subject: 'Kode Verifikasi Akun Anda',
      bodyText: 'Halo,\n\nKode verifikasi keamanan Anda adalah 482913. Berlaku selama 10 menit.',
      bodyHtml: '<p>Halo,<br>Kode verifikasi keamanan Anda adalah <b>482913</b>.</p>',
      snippet: 'Kode verifikasi keamanan Anda adalah 482913.',
      attachments: [],
      receivedAt: nowSeconds(),
    };
  }

  async deleteMailbox({ address }) {
    this.mailboxes.delete(address);
    return true;
  }

  async healthCheck() {
    return true;
  }
}

module.exports = MockProvider;
