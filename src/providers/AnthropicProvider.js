import Anthropic from '@anthropic-ai/sdk'
import BaseProvider from './BaseProvider'

class AnthropicProvider extends BaseProvider {
  constructor(apiKey) {
    super(apiKey)
    this.client = new Anthropic({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true, // Note: In production, use a backend proxy
    })
    this.models = [
      { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5' },
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4' },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
    ]
  }

  getName() {
    return 'Anthropic'
  }

  getModels() {
    return this.models
  }

  /**
   * Convert our message format to Anthropic format
   */
  formatMessages(messages) {
    return messages.map(msg => ({
      role: msg.role,
      content: typeof msg.content === 'string'
        ? msg.content
        : msg.content.filter(c => c.type === 'text').map(c => ({
            type: 'text',
            text: c.text
          }))
    }))
  }

  async sendMessage(messages, onChunk, options = {}) {
    const {
      model = 'claude-sonnet-4-5-20250929',
      maxTokens = 20000,
      temperature = 1,
      thinking = true,
    } = options

    const formattedMessages = this.formatMessages(messages)

    let fullContent = []
    let textContent = ''
    let thinkingContent = ''

    try {
      const stream = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        messages: formattedMessages,
        stream: true,
        ...(thinking && {
          thinking: {
            type: 'enabled',
            budget_tokens: 16000,
          },
        }),
      })

      for await (const event of stream) {
        if (event.type === 'content_block_start') {
          if (event.content_block.type === 'thinking') {
            thinkingContent = ''
          } else if (event.content_block.type === 'text') {
            textContent = ''
          }
        } else if (event.type === 'content_block_delta') {
          if (event.delta.type === 'thinking_delta') {
            thinkingContent += event.delta.thinking
            onChunk({
              type: 'thinking',
              content: thinkingContent,
              isPartial: true,
            })
          } else if (event.delta.type === 'text_delta') {
            textContent += event.delta.text
            onChunk({
              type: 'text',
              content: textContent,
              isPartial: true,
            })
          }
        } else if (event.type === 'content_block_stop') {
          if (thinkingContent) {
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
        } else if (event.type === 'message_stop') {
          break
        }
      }

      return {
        role: 'assistant',
        content: fullContent,
      }
    } catch (error) {
      console.error('Anthropic API error:', error)
      throw error
    }
  }
}

export default AnthropicProvider
