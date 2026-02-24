import OpenAI from 'openai'
import BaseProvider from './BaseProvider'

class KimiProvider extends BaseProvider {
  constructor(apiKey) {
    super(apiKey)
    this.client = new OpenAI({
      apiKey: apiKey,
      baseURL: `${window.location.origin}/api/moonshot`,
      dangerouslyAllowBrowser: true,
    })
    this.models = [
      { id: 'kimi-k2.5', name: 'Kimi K2.5' },
    ]
  }

  getName() {
    return 'Kimi'
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
      model = 'kimi-k2.5',
      temperature = 1,
      system = undefined,
    } = options

    const maxTokens = options.maxTokens || 32768

    const formattedMessages = this.formatMessages(messages)

    const messagesWithSystem = system
      ? [{ role: 'system', content: system }, ...formattedMessages]
      : formattedMessages

    let fullContent = []
    let textContent = ''
    let thinkingContent = ''
    let hasThinking = false

    try {
      const stream = await this.client.chat.completions.create({
        model,
        messages: messagesWithSystem,
        max_tokens: maxTokens,
        temperature,
        top_p: 0.95,
        stream: true,
      })

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta

        if (!delta) continue

        // Handle reasoning content (thinking)
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

        if (chunk.choices[0]?.finish_reason) {
          break
        }
      }

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
      console.error('Kimi API error:', error)
      throw error
    }
  }
}

export default KimiProvider
