/* Provider registry tests */
import { describe, it, expect } from 'vitest';
import {
  createProvider,
  getProviderMetadata,
  getAllProvidersMetadata,
  getAvailableProviders,
  PROVIDER_REGISTRY,
} from '../../providers/index.js';
import { OpenAIProvider } from '../../providers/OpenAIProvider.js';
import { AnthropicProvider } from '../../providers/AnthropicProvider.js';
import { GeminiProvider } from '../../providers/GeminiProvider.js';
import { DeepSeekProvider } from '../../providers/DeepSeekProvider.js';
import { OpenRouterProvider } from '../../providers/OpenRouterProvider.js';
import { MistralProvider } from '../../providers/MistralProvider.js';
import { GrokProvider } from '../../providers/GrokProvider.js';
import { GroqProvider } from '../../providers/GroqProvider.js';

const EXPECTED_IDS = ['openai', 'anthropic', 'google', 'deepseek', 'openrouter', 'mistral', 'xai', 'groq'];

describe('Provider registry', () => {
  it.each([
    ['openai', OpenAIProvider],
    ['anthropic', AnthropicProvider],
    ['google', GeminiProvider],
    ['deepseek', DeepSeekProvider],
    ['openrouter', OpenRouterProvider],
    ['mistral', MistralProvider],
    ['xai', GrokProvider],
    ['groq', GroqProvider],
  ])('createProvider("%s") returns the right class', (id, ProviderClass) => {
    expect(createProvider(id)).toBeInstanceOf(ProviderClass);
  });

  it('throws for unknown providers', () => {
    expect(() => createProvider('nope')).toThrow('Unknown provider');
  });

  it('returns metadata for every registered provider', () => {
    const all = getAllProvidersMetadata();
    expect(all).toHaveLength(EXPECTED_IDS.length);
    const ids = all.map((m) => m.id).sort();
    expect(ids).toEqual([...EXPECTED_IDS].sort());
    for (const m of all) {
      expect(m).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        color: expect.any(String),
        description: expect.any(String),
        requiresApiKey: true,
      });
    }
  });

  it('getProviderMetadata returns null for unknown ids', () => {
    expect(getProviderMetadata('nope')).toBeNull();
  });

  it('getProviderMetadata resolves a known id', () => {
    expect(getProviderMetadata('openai').name).toBe('OpenAI');
  });

  it('getAvailableProviders matches the registry keys', () => {
    expect(getAvailableProviders().sort()).toEqual(Object.keys(PROVIDER_REGISTRY).sort());
  });
});