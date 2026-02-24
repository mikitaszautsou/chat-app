/**
 * Provider utility functions for API key management and validation
 */

const PROVIDER_API_KEY_MAP = {
  anthropic: import.meta.env.VITE_ANTHROPIC_API_KEY,
  gemini: import.meta.env.VITE_GEMINI_API_KEY,
  deepseek: import.meta.env.VITE_DEEPSEEK_API_KEY,
  kimi: import.meta.env.VITE_KIMI_API_KEY,
};

/**
 * Get the API key for a given provider
 * @param {string} providerName - The name of the provider (anthropic, gemini, deepseek)
 * @returns {string|undefined} The API key for the provider, or undefined if not set
 */
export function getApiKeyForProvider(providerName) {
  const normalizedName = providerName.toLowerCase();
  return PROVIDER_API_KEY_MAP[normalizedName];
}

/**
 * Check if a provider has a valid (non-empty) API key configured
 * @param {string} providerName - The name of the provider
 * @returns {boolean} True if the provider has a valid API key
 */
export function hasValidApiKey(providerName) {
  const apiKey = getApiKeyForProvider(providerName);
  return Boolean(apiKey && apiKey.trim().length > 0);
}

/**
 * Get a list of all providers that have valid API keys configured
 * @returns {string[]} Array of provider names that have valid keys
 */
export function getProvidersWithKeys() {
  return Object.keys(PROVIDER_API_KEY_MAP).filter(hasValidApiKey);
}

/**
 * Get display name for a provider
 * @param {string} providerName - The internal provider name
 * @returns {string} The display name
 */
export function getProviderDisplayName(providerName) {
  const displayNames = {
    anthropic: 'Anthropic (Claude)',
    gemini: 'Google Gemini',
    deepseek: 'DeepSeek',
    kimi: 'Kimi (Moonshot)',
  };
  return displayNames[providerName.toLowerCase()] || providerName;
}
