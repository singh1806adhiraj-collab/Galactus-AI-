/* Galactus AI - Frontend Provider Metadata & Helpers */
// Static metadata for the UI (icons, labels, colors). The backend remains the
// source of truth for the canonical description/requiresApiKey fields; the API
// response is merged with this module so cards can show icons without an extra
// round trip.

export const PROVIDER_METADATA = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    color: '#00A67E',
    icon: '🤖',
    description: 'GPT models from OpenAI',
    requiresApiKey: true,
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    color: '#D97757',
    icon: '✨',
    description: 'Claude models from Anthropic',
    requiresApiKey: true,
  },
  google: {
    id: 'google',
    name: 'Google',
    color: '#4285F4',
    icon: '🔮',
    description: 'Gemini models from Google',
    requiresApiKey: true,
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    color: '#FF6B35',
    icon: '🔍',
    description: 'DeepSeek models',
    requiresApiKey: true,
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    color: '#6366F1',
    icon: '🔀',
    description: 'Access 100+ models via OpenRouter',
    requiresApiKey: true,
  },
  mistral: {
    id: 'mistral',
    name: 'Mistral',
    color: '#FFA500',
    icon: '💨',
    description: 'Mistral models',
    requiresApiKey: true,
  },
  xai: {
    id: 'xai',
    name: 'Grok',
    color: '#000000',
    icon: '⚙️',
    description: 'Grok models from xAI',
    requiresApiKey: true,
  },
  groq: {
    id: 'groq',
    name: 'Groq',
    color: '#FF6900',
    icon: '🚀',
    description: 'High-speed inference with Groq',
    requiresApiKey: true,
  },
};

export function getProviderMetadata(providerId) {
  return PROVIDER_METADATA[providerId] || null;
}

export function getAllProvidersMetadata() {
  return Object.values(PROVIDER_METADATA);
}

export function getAvailableProviders() {
  return Object.keys(PROVIDER_METADATA);
}