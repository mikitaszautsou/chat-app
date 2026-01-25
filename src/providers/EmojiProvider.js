import Anthropic from '@anthropic-ai/sdk'

/**
 * Provider for generating chat emojis based on message content
 * Uses Claude Sonnet to generate contextually appropriate emojis
 */
class EmojiProvider {
  constructor(apiKey) {
    this.client = new Anthropic({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true, // Note: In production, use a backend proxy
    })
  }

  /**
   * Generate an emoji based on the first message of a chat
   * @param {string} message - The first message in the chat
   * @returns {Promise<string>} - A single emoji character
   */
  async generateEmoji(message) {
    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 50,
        temperature: 1,
        messages: [
          {
            role: 'user',
            content: `Based on this message, respond with ONLY a single emoji that best represents the topic or mood. No explanations, just the emoji character.\n\nMessage: "${message}"`
          }
        ],
      })

      // Extract emoji from response
      const emoji = response.content[0]?.text?.trim() || '💬'

      // Validate it's actually an emoji (basic check)
      // Return the first emoji found, or default to chat bubble
      const emojiMatch = emoji.match(/[\p{Emoji}]/u)
      return emojiMatch ? emojiMatch[0] : '💬'
    } catch (error) {
      console.error('Error generating emoji:', error)
      return '💬' // Default chat bubble emoji on error
    }
  }

  /**
   * Generate a title based on the first message of a chat
   * @param {string} message - The first message in the chat
   * @returns {Promise<string>} - A concise title (3-6 words)
   */
  async generateTitle(message) {
    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 100,
        temperature: 1,
        messages: [
          {
            role: 'user',
            content: `Based on this message, generate a short, descriptive title (3-6 words max) for the conversation. Respond with ONLY the title, no quotes or explanations.\n\nMessage: "${message}"`
          }
        ],
      })

      // Extract title from response
      const title = response.content[0]?.text?.trim()

      // Validate and limit length
      if (title && title.length > 0) {
        // Remove quotes if present
        const cleanTitle = title.replace(/^["']|["']$/g, '')
        // Limit to 50 characters
        return cleanTitle.length > 50 ? cleanTitle.substring(0, 47) + '...' : cleanTitle
      }

      return 'New Chat' // Default title
    } catch (error) {
      console.error('Error generating title:', error)
      return 'New Chat' // Default title on error
    }
  }
}

export default EmojiProvider
