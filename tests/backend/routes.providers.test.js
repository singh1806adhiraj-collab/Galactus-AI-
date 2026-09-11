/* Provider routes integration tests (supertest + in-memory DB) */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { initDatabase, closeDatabase } from '../../db/database.js';

function okJson(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Provider routes', () => {
  const agent = request.agent(app);

  beforeAll(async () => {
    closeDatabase();
    await initDatabase();

    // Register a real user so the agent holds an auth cookie.
    const reg = await agent.post('/api/auth/register').send({
      name: 'Provider Tester',
      email: 'providers@test.local',
      password: 'password123',
    });
    expect(reg.status).toBe(201);

    // Configure the openai provider for this user.
    const save = await agent.post('/api/providers').send({
      provider: 'openai',
      config: { apiKey: 'sk-test' },
      enabled: true,
    });
    expect(save.status).toBe(200);
  });

  afterAll(async () => {
    closeDatabase();
  });

  beforeEach(() => {
    const mockFetch = vi.fn((url) => {
      if (url.includes('/models')) {
        // For both testConnection and fetchModels, return model data
        return okJson({
          data: [
            { id: 'gpt-4o', name: 'GPT-4o', context_length: 128000 },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', context_length: 128000 }
          ]
        });
      }
      return okJson({ data: [] });
    });
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('serves provider metadata publicly', async () => {
    const res = await request(app).get('/api/providers/metadata');
    expect(res.status).toBe(200);
    expect(res.body.providers).toHaveLength(8);
    expect(res.body.providers[0]).toHaveProperty('requiresApiKey');
  });

  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/providers');
    expect(res.status).toBe(401);
  });

  it('lists the configured provider with enabled as boolean', async () => {
    const res = await agent.get('/api/providers');
    expect(res.status).toBe(200);
    const found = res.body.providers.find((p) => p.provider === 'openai');
    expect(found).toBeTruthy();
    expect(found.enabled).toBe(true);
    expect(found.metadata.name).toBe('OpenAI');
  });

  it('tests a configured provider', async () => {
    const res = await agent.post('/api/providers/openai/test').send({});
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.models.length).toBeGreaterThan(0);
  });

  it('tests an unsaved API key without a stored config', async () => {
    const res = await agent.post('/api/providers/deepseek/test').send({ apiKey: 'unsaved' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('reports failure when testing an unconfigured provider with no key', async () => {
    const res = await agent.post('/api/providers/groq/test').send({});
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: false, error: 'Provider not configured' });
  });

  it('lists models for a configured provider', async () => {
    const res = await agent.get('/api/providers/openai/models');
    expect(res.status).toBe(200);
    expect(res.body.models.length).toBeGreaterThan(0);
    expect(res.body.models[0]).toHaveProperty('id');
  });

  it('returns 404 for models of an unconfigured provider', async () => {
    const res = await agent.get('/api/providers/mistral/models');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not configured/i);
  });

  it('rejects an unknown provider id on save', async () => {
    const res = await agent.post('/api/providers').send({ provider: 'fake', config: { apiKey: 'x' } });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/unknown provider/i);
  });

  it('requires an API key when saving', async () => {
    const res = await agent.post('/api/providers').send({ provider: 'openai', config: {} });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/API key is required/i);
  });

  it('toggles a provider', async () => {
    const res = await agent.patch('/api/providers/openai/toggle').send({ enabled: false });
    expect(res.status).toBe(200);
    const list = await agent.get('/api/providers');
    const found = list.body.providers.find((p) => p.provider === 'openai');
    expect(found.enabled).toBe(false);
    // restore for later tests
    await agent.patch('/api/providers/openai/toggle').send({ enabled: true });
  });

  it('returns 404 when toggling an unconfigured provider', async () => {
    const res = await agent.patch('/api/providers/groq/toggle').send({ enabled: false });
    expect(res.status).toBe(404);
  });

  it('deletes a provider config', async () => {
    // Configure a disposable provider first
    await agent.post('/api/providers').send({
      provider: 'groq',
      config: { apiKey: 'sk-groq' },
      enabled: true,
    });
    const res = await agent.delete('/api/providers/groq');
    expect(res.status).toBe(200);
    const again = await agent.delete('/api/providers/groq');
    expect(again.status).toBe(404);
  });

  it('returns 404 for health of an unconfigured provider', async () => {
    const res = await agent.get('/api/providers/groq/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('not_configured');
  });
});