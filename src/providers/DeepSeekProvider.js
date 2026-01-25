import OpenAI from 'openai'
import BaseProvider from './BaseProvider'

class DeepSeekProvider extends BaseProvider {
  constructor(apiKey) {
    super(apiKey)
    this.client = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://api.deepseek.com',
      dangerouslyAllowBrowser: true, // Note: In production, use a backend proxy
    })
    this.models = [
      { id: 'deepseek-chat', name: 'DeepSeek Chat (V3.2)' },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner (V3.2 Thinking Mode)' },
    ]
  }

  getName() {
    return 'DeepSeek'
  }

  getModels() {
    return this.models
  }

  /**
   * Convert our message format to OpenAI format
   * Only send text content back to API, not thinking blocks
   */
  formatMessages(messages) {
    return messages.map(msg => ({
      role: msg.role,
      content: typeof msg.content === 'string'
        ? msg.content
        : msg.content
            .filter(c => c.type === 'text')
            .map(c => c.text)
            .join('\n')
    }))
  }

  async sendMessage(messages, onChunk, options = {}) {
    const {
      model = 'deepseek-chat',
      temperature = 1,
    } = options

    // Set appropriate max_tokens based on model
    // deepseek-chat: max 8K, deepseek-reasoner: max 64K
    const maxTokens = options.maxTokens || (model === 'deepseek-reasoner' ? 32000 : 4096)

    // Enforce limits based on model
    const clampedMaxTokens = model === 'deepseek-reasoner'
      ? Math.min(maxTokens, 64000)
      : Math.min(maxTokens, 8192)

    const formattedMessages = this.formatMessages(messages)

    let fullContent = []
    let textContent = ''
    let thinkingContent = ''
    let hasThinking = false

    try {
      const stream = await this.client.chat.completions.create({
        model,
        messages: formattedMessages,
        max_tokens: clampedMaxTokens,
        temperature,
        stream: true,
      })

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta

        if (!delta) continue

        // Handle reasoning content (thinking) for deepseek-reasoner model
        if (delta.reasoning_content) {
          hasThinking = true
          thinkingContent += delta.reasoning_content

          onChunk({
            type: 'thinking',
            content: thinkingContent,
            isPartial: true,
          })
        }

        // Handle regular content
        if (delta.content) {
          textContent += delta.content

          onChunk({
            type: 'text',
            content: textContent,
            isPartial: true,
          })
        }

        // Check if stream is finished
        if (chunk.choices[0]?.finish_reason) {
          break
        }
      }

      // Build final content array
      if (hasThinking && thinkingContent) {
        fullContent.push({
          type: 'thinking',
          thinking: thinkingContent,
        })
      }

      if (textContent) {
        fullContent.push({
          type: 'text',
          text: textContent,
        })
      }

      return {
        role: 'assistant',
        content: fullContent,
      }
    } catch (error) {
      console.error('DeepSeek API error:', error)
      throw error
    }
  }
}

export default DeepSeekProvider
