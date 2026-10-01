/**
 * Abstract MailProvider contract class.
 * All email providers MUST inherit and implement these methods.
 */
class MailProvider {
  /**
   * Create a new mailbox
   * @param {Object} params
   * @param {string} params.localPart
   * @param {string} [params.password]
   * @returns {Promise<{ address: string, providerRef: string, expiresAt: number|null }>}
   */
  async createMailbox({ localPart, password }) {
    throw new Error('Method createMailbox() must be implemented.');
  }

  /**
   * List messages in a mailbox
   * @param {Object} params
   * @param {string} params.address
   * @param {string} [params.providerRef]
   * @returns {Promise<Array<{ id: string, fromAddress: string, fromName: string, toAddress: string, subject: string, snippet: string, receivedAt: number }>>}
   */
  async listMessages({ address, providerRef }) {
    throw new Error('Method listMessages() must be implemented.');
  }

  /**
   * Get detailed message with body and attachments
   * @param {Object} params
   * @param {string} params.address
   * @param {string} [params.providerRef]
   * @param {string} params.id
   * @returns {Promise<{ id: string, fromAddress: string, fromName: string, toAddress: string, subject: string, bodyText: string, bodyHtml: string, snippet: string, attachments: Array, receivedAt: number }>}
   */
  async getMessage({ address, providerRef, id }) {
    throw new Error('Method getMessage() must be implemented.');
  }

  /**
   * Delete a mailbox
   * @param {Object} params
   * @param {string} params.address
   * @param {string} [params.providerRef]
   * @returns {Promise<boolean>}
   */
  async deleteMailbox({ address, providerRef }) {
    throw new Error('Method deleteMailbox() must be implemented.');
  }

  /**
   * Health check of provider service
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    throw new Error('Method healthCheck() must be implemented.');
  }
}

module.exports = MailProvider;
