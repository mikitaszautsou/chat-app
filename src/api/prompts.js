// API for managing prompts
const PROMPTS_STORAGE_KEY = 'chat-app-prompts'

const getDefaultPrompts = () => [
  {
    id: Date.now(),
    title: 'General Assistant',
    icon: '💬',
    provider: 'Anthropic',
    model: 'claude-sonnet-4-5-20250929',
    systemPrompt: '',
    timestamp: new Date().toISOString(),
  },
  {
    id: Date.now() + 1,
    title: 'Code Helper',
    icon: '💻',
    provider: 'Anthropic',
    model: 'claude-sonnet-4-5-20250929',
    systemPrompt: 'You are an expert programming assistant. Help users write clean, efficient, and well-documented code. Explain your solutions clearly and suggest best practices. When providing code examples, include comments to explain key concepts.',
    timestamp: new Date().toISOString(),
  },
  {
    id: Date.now() + 2,
    title: 'Math Tutor',
    icon: '🔢',
    provider: 'Anthropic',
    model: 'claude-sonnet-4-5-20250929',
    systemPrompt: 'You are a patient and knowledgeable math tutor. Help students understand mathematical concepts by breaking them down step-by-step. Use LaTeX notation for formulas and equations. Encourage learning through examples and practice problems.',
    timestamp: new Date().toISOString(),
  }
]

export const promptsAPI = {
  async getAll() {
    try {
      const stored = localStorage.getItem(PROMPTS_STORAGE_KEY)
      if (!stored) {
        // Initialize with default prompts
        const defaults = getDefaultPrompts()
        localStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(defaults))
        return defaults
      }
      return JSON.parse(stored)
    } catch (error) {
      console.error('Error loading prompts:', error)
      return getDefaultPrompts()
    }
  },

  async getById(id) {
    const prompts = await this.getAll()
    return prompts.find(p => p.id === id)
  },

  async save(prompt) {
    try {
      const prompts = await this.getAll()
      const index = prompts.findIndex(p => p.id === prompt.id)

      if (index >= 0) {
        prompts[index] = prompt
      } else {
        prompts.unshift(prompt)
      }

      localStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(prompts))
      return prompt
    } catch (error) {
      console.error('Error saving prompt:', error)
      throw error
    }
  },

  async delete(id) {
    try {
      const prompts = await this.getAll()
      const filtered = prompts.filter(p => p.id !== id)
      localStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(filtered))
    } catch (error) {
      console.error('Error deleting prompt:', error)
      throw error
    }
  }
}
