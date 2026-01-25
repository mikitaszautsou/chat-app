/**
 * Base class for AI providers
 * All providers should extend this class and implement the required methods
 */
class BaseProvider {
  constructor(apiKey) {
    if (this.constructor === BaseProvider) {
      throw new Error("BaseProvider is abstract and cannot be instantiated directly")
    }
    this.apiKey = apiKey
  }

  /**
   * Send a message and get a streaming response
   * @param {Array} messages - Array of message objects with role and content
   * @param {Function} onChunk - Callback function called for each chunk of the response
   * @param {Object} options - Additional options (model, temperature, etc.)
   * @returns {Promise<Object>} - Complete message object
   */
  async sendMessage(messages, onChunk, options = {}) {
    throw new Error("sendMessage() must be implemented by provider")
  }

  /**
   * Get available models for this provider
   * @returns {Array<Object>} - Array of model objects with id and name
   */
  getModels() {
    throw new Error("getModels() must be implemented by provider")
  }

  /**
   * Get provider name
   * @returns {string} - Provider name
   */
  getName() {
    throw new Error("getName() must be implemented by provider")
  }
}

export default BaseProvider
