/* Galactus AI - Provider Registry */
import { OpenAIProvider } from './OpenAIProvider.js';
import { AnthropicProvider } from './AnthropicProvider.js';
import { GeminiProvider } from './GeminiProvider.js';
import { DeepSeekProvider } from './DeepSeekProvider.js';
import { OpenRouterProvider } from './OpenRouterProvider.js';
import { MistralProvider } from './MistralProvider.js';
import { GrokProvider } from './GrokProvider.js';
import { GroqProvider } from './GroqProvider.js';

export const PROVIDER_REGISTRY = {
  openai: OpenAIProvider,
  anthropic: AnthropicProvider,
  google: GeminiProvider,
  deepseek: DeepSeekProvider,
  openrouter: OpenRouterProvider,
  mistral: MistralProvider,
  xai: GrokProvider,
  groq: GroqProvider,
};

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