import AnthropicProvider from './AnthropicProvider'
import GeminiProvider from './GeminiProvider'
import DeepSeekProvider from './DeepSeekProvider'
import KimiProvider from './KimiProvider'
import EmojiProvider from './EmojiProvider'

const PROVIDERS = {
  anthropic: AnthropicProvider,
  gemini: GeminiProvider,
  deepseek: DeepSeekProvider,
  kimi: KimiProvider,
}

/**
 * Create a provider instance
 * @param {string} providerName - Name of the provider (e.g., 'anthropic')
 * @param {string} apiKey - API key for the provider
 * @returns {BaseProvider} - Provider instance
 */
export function createProvider(providerName, apiKey) {
  const ProviderClass = PROVIDERS[providerName]
  if (!ProviderClass) {
    throw new Error(`Unknown provider: ${providerName}`)
  }
  return new ProviderClass(apiKey)
}

/**
 * Get list of available providers
 * @returns {Array<string>} - Array of provider names
 */
export function getAvailableProviders() {
  return Object.keys(PROVIDERS)
}

export { default as BaseProvider } from './BaseProvider'
export { default as AnthropicProvider } from './AnthropicProvider'
export { default as GeminiProvider } from './GeminiProvider'
export { default as DeepSeekProvider } from './DeepSeekProvider'
export { default as KimiProvider } from './KimiProvider'
export { default as EmojiProvider } from './EmojiProvider'
