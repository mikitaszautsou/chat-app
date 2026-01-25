import { GoogleGenerativeAI } from '@google/generative-ai'
import BaseProvider from './BaseProvider'

class GeminiProvider extends BaseProvider {
  constructor(apiKey) {
    super(apiKey)
    this.client = new GoogleGenerativeAI(apiKey)
    this.models = [
      { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro Preview' },
      { id: 'gemini-2.0-flash-thinking-exp', name: 'Gemini 2.0 Flash Thinking (Experimental)' },
      { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Experimental)' },
    ]
  }

  getName() {
    return 'Gemini'
  }

  getModels() {
    return this.models
  }

  /**
   * Convert our message format to Gemini format
   * Gemini uses {role: 'user' | 'model', parts: [{text}]}
   */
  formatMessages(messages) {
    return messages.map(msg => {
      const role = msg.role === 'assistant' ? 'model' : msg.role

      let text = ''
      if (typeof msg.content === 'string') {
        text = msg.content
      } else {
        // Extract text from content array, ignoring thinking blocks
        text = msg.content
          .filter(c => c.type === 'text')
          .map(c => c.text)
          .join('\n')
      }

      return {
        role,
        parts: [{ text }]
      }
    })
  }

  async sendMessage(messages, onChunk, options = {}) {
    const {
      model = 'gemini-3-pro-preview',
      maxTokens = 20000,
      temperature = 1,
      thinking = true,
    } = options

    const formattedMessages = this.formatMessages(messages)

    let fullContent = []
    let textContent = ''
    let thinkingContent = ''
    let inThinkingBlock = false

    try {
      const genModel = this.client.getGenerativeModel({
        model,
        ...(thinking && {
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature,
          },
          thinkingConfig: {
            thinkingLevel: 'HIGH'
          }
        })
      })

      // Split messages into history and current prompt
      const history = formattedMessages.slice(0, -1)
      const currentMessage = formattedMessages[formattedMessages.length - 1]

      const chat = genModel.startChat({
        history,
      })

      const result = await chat.sendMessageStream(currentMessage.parts)

      for await (const chunk of result.stream) {
        const chunkText = chunk.text()

        if (!chunkText) continue

        // Detect thinking blocks in the response
        // Gemini may output thinking in special markers or as regular text
        // For now, we'll treat all streamed content as text
        // TODO: Adjust based on actual API response format for thinking

        if (chunkText.includes('<thinking>')) {
          inThinkingBlock = true
          const parts = chunkText.split('<thinking>')
          if (parts[0]) {
            textContent += parts[0]
            onChunk({
              type: 'text',
              content: textContent,
              isPartial: true,
            })
          }
          thinkingContent = parts[1] || ''
        } else if (chunkText.includes('</thinking>')) {
          inThinkingBlock = false
          const parts = chunkText.split('</thinking>')
          thinkingContent += parts[0] || ''

          // Emit complete thinking block
          onChunk({
            type: 'thinking',
            content: thinkingContent,
            isPartial: false,
          })

          fullContent.push({
            type: 'thinking',
            thinking: thinkingContent,
          })

          thinkingContent = ''

          if (parts[1]) {
            textContent += parts[1]
            onChunk({
              type: 'text',
              content: textContent,
              isPartial: true,
            })
          }
        } else if (inThinkingBlock) {
          thinkingContent += chunkText
          onChunk({
            type: 'thinking',
            content: thinkingContent,
            isPartial: true,
          })
        } else {
          textContent += chunkText
          onChunk({
            type: 'text',
            content: textContent,
            isPartial: true,
          })
        }
      }

      // Add any remaining content
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

      return {
        role: 'assistant',
        content: fullContent,
      }
    } catch (error) {
      console.error('Gemini API error:', error)
      throw error
    }
  }
}

export default GeminiProvider
