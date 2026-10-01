/**
 * Email address generator service.
 * Enforces domain @yaoi.web.id under all circumstances.
 */
const { generateRandomLocalPart } = require('../utils/random');
const { CUSTOM_EMAIL_BLACKLIST, REQUIRED_DOMAIN } = require('../config/constants');
const emailsRepo = require('../database/repositories/emails.repo');
const usersRepo = require('../database/repositories/users.repo');
const activityRepo = require('../database/repositories/activity.repo');
const { getMailProvider } = require('./mail');
const config = require('../config');

class EmailGeneratorService {
  /**
   * Validate custom local part string syntax and blacklist
   */
  validateCustomLocalPart(input) {
    if (!input) return { valid: false, reason: 'Input tidak boleh kosong.' };

    let localPart = input.trim().toLowerCase();
    // Strip trailing @domain if user manually typed @yaoi.web.id or @gmail.com
    if (localPart.includes('@')) {
      localPart = localPart.split('@')[0];
    }

    if (localPart.length < 4 || localPart.length > 32) {
      return { valid: false, reason: 'Panjang nama email harus antara 4 sampai 32 karakter.' };
    }

    const regex = /^[a-z0-9._-]+$/;
    if (!regex.test(localPart)) {
      return { valid: false, reason: 'Nama email hanya boleh berisi huruf kecil, angka, titik, minus, dan underscore.' };
    }

    if (/^[._-]/.test(localPart) || /[._-]$/.test(localPart)) {
      return { valid: false, reason: 'Nama email tidak boleh diawali atau diakhiri titik, minus, atau underscore.' };
    }

    if (/\.\./.test(localPart)) {
      return { valid: false, reason: 'Nama email tidak boleh berisi titik berturut-turut (..).' };
    }

    if (CUSTOM_EMAIL_BLACKLIST.includes(localPart)) {
      return { valid: false, reason: `Nama email '${localPart}' dilarang karena kata sistem sensitif.` };
    }

    return { valid: true, localPart };
  }

  /**
   * Create a random @yaoi.web.id email for user
   */
  async generateRandomEmail(user) {
    const activeCount = emailsRepo.countActiveByUser(user.id);
    if (activeCount >= config.maxEmailsPerUser) {
      throw new Error(`Batas maksimal email aktif (${config.maxEmailsPerUser}) telah tercapai.`);
    }

    let localPart = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      localPart = generateRandomLocalPart(8);
      const fullAddr = `${localPart}@${REQUIRED_DOMAIN}`;
      const existing = emailsRepo.findByAddress(fullAddr);
      if (!existing) isUnique = true;
      attempts++;
    }

    const provider = getMailProvider();
    const mailbox = await provider.createMailbox({ localPart });

    const newEmail = emailsRepo.createEmail({
      userId: user.id,
      localPart,
      generationType: 'random',
      provider: config.mailProvider,
      providerRef: mailbox.providerRef,
      ttlMinutes: config.emailTtlMinutes,
    });

    // Set as active email for user
    usersRepo.setActiveEmail(user.id, newEmail.id);
    usersRepo.incrementCounter(user.id, 'total_emails_created');

    activityRepo.logActivity({
      userId: user.id,
      action: 'generate_email',
      detail: { address: newEmail.address, type: 'random' },
      emailId: newEmail.id,
    });

    return newEmail;
  }

  /**
   * Create custom @yaoi.web.id email for user
   */
  async generateCustomEmail(user, rawInput) {
    const activeCount = emailsRepo.countActiveByUser(user.id);
    if (activeCount >= config.maxEmailsPerUser) {
      throw new Error(`Batas maksimal email aktif (${config.maxEmailsPerUser}) telah tercapai.`);
    }

    const validation = this.validateCustomLocalPart(rawInput);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    const localPart = validation.localPart;
    const fullAddr = `${localPart}@${REQUIRED_DOMAIN}`;

    const existing = emailsRepo.findByAddress(fullAddr);
    if (existing) {
      throw new Error(`Alamat '${fullAddr}' sudah digunakan. Silakan pilih nama lain.`);
    }

    const provider = getMailProvider();
    const mailbox = await provider.createMailbox({ localPart });

    const newEmail = emailsRepo.createEmail({
      userId: user.id,
      localPart,
      generationType: 'custom',
      provider: config.mailProvider,
      providerRef: mailbox.providerRef,
      ttlMinutes: config.emailTtlMinutes,
    });

    usersRepo.setActiveEmail(user.id, newEmail.id);
    usersRepo.incrementCounter(user.id, 'total_emails_created');

    activityRepo.logActivity({
      userId: user.id,
      action: 'custom_email',
      detail: { address: newEmail.address, type: 'custom' },
      emailId: newEmail.id,
    });

    return newEmail;
  }
}

module.exports = new EmailGeneratorService();
