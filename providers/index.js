/* Galactus AI - Provider Registry */
import { OpenAIProvider } from './OpenAIProvider.js';
import { AnthropicProvider } from './AnthropicProvider.js';
import { GeminiProvider } from './GeminiProvider.js';
import { DeepSeekProvider } from './DeepSeekProvider.js';
import { OpenRouterProvider } from './OpenRouterProvider.js';

export const PROVIDER_REGISTRY = {
  openai: OpenAIProvider,
  anthropic: AnthropicProvider,
  google: GeminiProvider,
  deepseek: DeepSeekProvider,
  openrouter: OpenRouterProvider,
};

export const PROVIDER_METADATA = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    color: '#00A67E',
    description: 'GPT models from OpenAI',
    requiresApiKey: true,
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    color: '#D97757',
    description: 'Claude models from Anthropic',
    requiresApiKey: true,
  },
  google: {
    id: 'google',
    name: 'Google',
    color: '#4285F4',
    description: 'Gemini models from Google',
    requiresApiKey: true,
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    color: '#FF6B35',
    description: 'DeepSeek models',
    requiresApiKey: true,
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    color: '#6366F1',
    description: 'Access 100+ models via OpenRouter',
    requiresApiKey: true,
  },
};

export function createProvider(providerId, config = {}) {
  const ProviderClass = PROVIDER_REGISTRY[providerId];
  if (!ProviderClass) {
    throw new Error(`Unknown provider: ${providerId}`);
  }
  return new ProviderClass(config);
}

export function getProviderMetadata(providerId) {
  return PROVIDER_METADATA[providerId] || null;
}

export function getAllProvidersMetadata() {
  return Object.values(PROVIDER_METADATA);
}

export function getAvailableProviders() {
  return Object.keys(PROVIDER_REGISTRY);
}