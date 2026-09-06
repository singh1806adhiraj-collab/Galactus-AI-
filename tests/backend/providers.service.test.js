/* ProviderService tests (in-memory DB, network mocked) */
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { initDatabase, closeDatabase, getDb } from '../../db/database.js';
import { providerService } from '../../providers/ProviderService.js';

const USER = 'u-test';

function okJson(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// provider_configs has a FK to users, so a real user row must exist.
function createTestUser(id = USER) {
  const ts = Date.now();
  getDb().prepare(`
    INSERT INTO users (id, name, email, password_hash, is_guest, created_at, updated_at)
    VALUES (?, ?, ?, ?, 0, ?, ?)
  `).run(id, 'Tester', `${id}@test.local`, 'not-a-real-hash', ts, ts);
}

beforeEach(async () => {
  closeDatabase();
  await initDatabase();
  createTestUser();
});

afterAll(() => {
  closeDatabase();
});

describe('ProviderService', () => {
  it('starts with no configured providers', async () => {
    expect(await providerService.getUserProviders(USER)).toEqual([]);
  });

  it('saves and reads back a provider config (encryption roundtrip)', async () => {
    await providerService.saveProviderConfig(USER, 'openai', { apiKey: 'sk-test-123' }, true);
    const cfg = await providerService.getUserProvider(USER, 'openai');
    expect(cfg).not.toBeNull();
    expect(cfg.enabled).toBe(true);
    expect(cfg.config.apiKey).toBe('sk-test-123');
    expect(cfg.metadata.name).toBe('OpenAI');
  });

  it('upserts an existing config instead of duplicating', async () => {
    await providerService.saveProviderConfig(USER, 'openai', { apiKey: 'one' }, true);
    await providerService.saveProviderConfig(USER, 'openai', { apiKey: 'two' }, false);
    const list = await providerService.getUserProviders(USER);
    expect(list).toHaveLength(1);
    const cfg = await providerService.getUserProvider(USER, 'openai');
    expect(cfg.config.apiKey).toBe('two');
    expect(cfg.enabled).toBe(false);
  });

  it('lists configured providers with enabled as boolean', async () => {
    await providerService.saveProviderConfig(USER, 'openai', { apiKey: 'x' }, true);
    await providerService.saveProviderConfig(USER, 'anthropic', { apiKey: 'y' }, true);
    const list = await providerService.getUserProviders(USER);
    expect(list.map((p) => p.provider).sort()).toEqual(['anthropic', 'openai']);
    expect(list.every((p) => typeof p.enabled === 'boolean')).toBe(true);
  });

  it('deletes a provider config (and reports miss on repeat)', async () => {
    await providerService.saveProviderConfig(USER, 'openai', { apiKey: 'x' }, true);
    expect(await providerService.deleteProviderConfig(USER, 'openai')).toBe(true);
    expect(await providerService.deleteProviderConfig(USER, 'openai')).toBe(false);
  });

  it('reports not configured when testing an unconfigured provider', async () => {
    const result = await providerService.testProviderConnection(USER, 'openai');
    expect(result).toEqual({ success: false, error: 'Provider not configured' });
  });

  it('tests a configured provider and returns its models', async () => {
    await providerService.saveProviderConfig(USER, 'openai', { apiKey: 'k' }, true);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okJson({ data: [] })));
    const result = await providerService.testProviderConnection(USER, 'openai');
    expect(result.success).toBe(true);
    expect(Array.isArray(result.models)).toBe(true);
    expect(result.models.length).toBeGreaterThan(0);
    vi.unstubAllGlobals();
  });

  it('tests an unsaved API key without a stored config', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okJson({ data: [] })));
    const result = await providerService.testProviderConnection(USER, 'openai', 'unsaved-key');
    expect(result.success).toBe(true);
    vi.unstubAllGlobals();
  });

  it('reports invalid key on a failing test', async () => {
    await providerService.saveProviderConfig(USER, 'openai', { apiKey: 'bad' }, true);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    const result = await providerService.testProviderConnection(USER, 'openai');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid API key');
    vi.unstubAllGlobals();
  });

  it('reports provider health states', async () => {
    expect((await providerService.getProviderHealth(USER, 'openai')).status).toBe('not_configured');

    await providerService.saveProviderConfig(USER, 'openai', { apiKey: 'k' }, true);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okJson({ data: [] })));
    const healthy = await providerService.getProviderHealth(USER, 'openai');
    expect(healthy.status).toBe('healthy');
    expect(healthy.enabled).toBe(true);
    vi.unstubAllGlobals();

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    const unhealthy = await providerService.getProviderHealth(USER, 'openai');
    expect(unhealthy.status).toBe('unhealthy');
    vi.unstubAllGlobals();
  });

  it('chatCompletion rejects without a stored config', async () => {
    await expect(
      providerService.chatCompletion(USER, 'openai', [{ role: 'user', content: 'hi' }])
    ).rejects.toThrow('Provider not configured');
  });

  it('chatCompletion rejects when the provider is disabled', async () => {
    await providerService.saveProviderConfig(USER, 'openai', { apiKey: 'k' }, false);
    await expect(
      providerService.chatCompletion(USER, 'openai', [{ role: 'user', content: 'hi' }])
    ).rejects.toThrow('Provider is disabled');
  });
});