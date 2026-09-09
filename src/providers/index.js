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
    icon: '/icons/openai.svg',
    iconFallback: '🤖',
    description: 'GPT models from OpenAI',
    requiresApiKey: true,
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    color: '#D97757',
    icon: '/icons/anthropic.svg',
    iconFallback: '✨',
    description: 'Claude models from Anthropic',
    requiresApiKey: true,
  },
  google: {
    id: 'google',
    name: 'Google',
    color: '#4285F4',
    icon: '/icons/google.svg',
    iconFallback: '🔮',
    description: 'Gemini models from Google',
    requiresApiKey: true,
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    color: '#FF6B35',
    icon: '/icons/deepseek.svg',
    iconFallback: '🔍',
    description: 'DeepSeek models',
    requiresApiKey: true,
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    color: '#6366F1',
    icon: '/icons/openrouter.svg',
    iconFallback: '🔀',
    description: 'Access 100+ models via OpenRouter',
    requiresApiKey: true,
  },
  mistral: {
    id: 'mistral',
    name: 'Mistral',
    color: '#FFA500',
    icon: '/icons/mistral.svg',
    iconFallback: '💨',
    description: 'Mistral models',
    requiresApiKey: true,
  },
  xai: {
    id: 'xai',
    name: 'Grok',
    color: '#000000',
    icon: '/icons/grok.svg',
    iconFallback: '⚙️',
    description: 'Grok models from xAI',
    requiresApiKey: true,
  },
  groq: {
    id: 'groq',
    name: 'Groq',
    color: '#FF6900',
    icon: '/icons/groq.svg',
    iconFallback: '🚀',
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