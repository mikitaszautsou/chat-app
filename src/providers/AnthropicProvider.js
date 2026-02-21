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
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
      { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5' },
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
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
   * Preserves thinking blocks with signatures in assistant messages for multi-turn conversations
   */
  formatMessages(messages) {
    return messages.map(msg => {
      if (typeof msg.content === 'string') {
        return { role: msg.role, content: msg.content }
      }

      if (msg.role === 'assistant') {
        // Include thinking blocks with signatures for multi-turn conversations
        return {
          role: msg.role,
          content: msg.content
            .filter(c => c.type === 'thinking' || c.type === 'text')
            .map(c => {
              if (c.type === 'thinking') {
                return { type: 'thinking', thinking: c.thinking, signature: c.signature }
              }
              return { type: 'text', text: c.text }
            })
        }
      }

      // For user messages, only send text content
      return {
        role: msg.role,
        content: msg.content.filter(c => c.type === 'text').map(c => ({
          type: 'text',
          text: c.text
        }))
      }
    })
  }

  async sendMessage(messages, onChunk, options = {}) {
    const {
      model = 'claude-sonnet-4-5-20250929',
      maxTokens = 20000,
      temperature = 1,
      thinking = true,
      system = undefined,
    } = options

    const formattedMessages = this.formatMessages(messages)

    let fullContent = []
    let textContent = ''
    let thinkingContent = ''
    let thinkingSignature = ''

    // Determine if this model supports extended output (128k tokens)
    const isOpusModel = model.includes('opus')
    const isExtendedModel = isOpusModel || model === 'claude-sonnet-4-6'

    // Configure max tokens and thinking budget based on model
    const effectiveMaxTokens = isExtendedModel ? 128000 : maxTokens
    const thinkingBudget = isExtendedModel ? 102400 : 16000

    try {
      const requestConfig = {
        model,
        max_tokens: effectiveMaxTokens,
        temperature,
        messages: formattedMessages,
        stream: true,
      }

      // Add system prompt if provided
      if (system) {
        requestConfig.system = system
      }

      // Add thinking configuration if enabled
      if (thinking) {
        requestConfig.thinking = {
          type: 'enabled',
          budget_tokens: thinkingBudget,
        }
      }

      // Add output config for Opus models (max effort thinking)
      if (isOpusModel) {
        requestConfig.output_config = { effort: 'max' }
      }

      const stream = await this.client.messages.create(requestConfig)

      for await (const event of stream) {
        if (event.type === 'content_block_start') {
          if (event.content_block.type === 'thinking') {
            thinkingContent = ''
            thinkingSignature = ''
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
          } else if (event.delta.type === 'signature_delta') {
            thinkingSignature = event.delta.signature
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
              signature: thinkingSignature,
            })
            thinkingContent = '' // Reset after adding
          }
          if (textContent) {
            fullContent.push({
              type: 'text',
              text: textContent,
            })
            textContent = '' // Reset after adding
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
