import { GoogleGenAI } from '@google/genai'
import BaseProvider from './BaseProvider'

class GeminiProvider extends BaseProvider {
  constructor(apiKey) {
    super(apiKey)
    this.client = new GoogleGenAI({ apiKey })
    this.models = [
      { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview' },
      { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro Preview' },
      { id: 'gemini-2.5-flash-preview-05-20', name: 'Gemini 2.5 Flash Preview' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
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
      model = 'gemini-3.1-pro-preview',
      maxTokens = 65536,
      temperature = 1,
      thinking = true,
      system = undefined,
    } = options

    const formattedMessages = this.formatMessages(messages)

    let fullContent = []
    let textContent = ''
    let thinkingContent = ''

    try {
      const config = {
        maxOutputTokens: maxTokens,
        temperature,
      }

      if (thinking) {
        config.thinkingConfig = {
          thinkingBudget: 32768,
        }
      }

      if (system) {
        config.systemInstruction = system
      }

      const response = await this.client.models.generateContentStream({
        model,
        config,
        contents: formattedMessages,
      })

      for await (const chunk of response) {
        const parts = chunk.candidates?.[0]?.content?.parts
        if (!parts) continue

        for (const part of parts) {
          if (!part.text) continue

          if (part.thought) {
            thinkingContent += part.text
            onChunk({
              type: 'thinking',
              content: thinkingContent,
              isPartial: true,
            })
          } else {
            textContent += part.text
            onChunk({
              type: 'text',
              content: textContent,
              isPartial: true,
            })
          }
        }
      }

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
