/* Frontend provider metadata module tests */
import { describe, it, expect } from 'vitest';
import {
  PROVIDER_METADATA,
  getProviderMetadata,
  getAllProvidersMetadata,
  getAvailableProviders,
} from '../index.js';

const EXPECTED_IDS = ['openai', 'anthropic', 'google', 'deepseek', 'openrouter', 'mistral', 'xai', 'groq'];

describe('frontend provider metadata module', () => {
  it('exposes metadata for every provider', () => {
    const all = getAllProvidersMetadata();
    expect(all).toHaveLength(EXPECTED_IDS.length);
    const ids = all.map((m) => m.id).sort();
    expect(ids).toEqual([...EXPECTED_IDS].sort());
  });

  it('includes an icon on every entry so cards never fall back to the default emoji', () => {
    for (const m of getAllProvidersMetadata()) {
      expect(m.icon).toBeTruthy();
      expect(m).toMatchObject({
        name: expect.any(String),
        color: expect.any(String),
        description: expect.any(String),
        requiresApiKey: true,
      });
    }
  });

  it('resolves metadata for a known id', () => {
    expect(getProviderMetadata('openai')).toEqual(PROVIDER_METADATA.openai);
  });

  it('returns null for unknown ids', () => {
    expect(getProviderMetadata('nope')).toBeNull();
  });

  it('lists available provider ids', () => {
    expect(getAvailableProviders().sort()).toEqual([...EXPECTED_IDS].sort());
  });
});