/* Individual provider instance tests (network fully mocked) */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createProvider } from '../../providers/index.js';

const PROVIDER_IDS = ['openai', 'anthropic', 'google', 'deepseek', 'openrouter', 'mistral', 'xai', 'groq'];

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Wire-format fixture per provider so each normalization path is exercised.
function chatWireBody(id) {
  if (id === 'anthropic') {
    return {
      content: [{ type: 'text', text: 'Hello' }],
      model: 'claude-test',
      usage: { input_tokens: 5, output_tokens: 2 },
    };
  }
  if (id === 'google') {
    return {
      candidates: [
        {
          content: { parts: [{ text: 'Hello' }] },
          usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 2, totalTokenCount: 7 },
        },
      ],
    };
  }
  return {
    choices: [{ message: { content: 'Hello' } }],
    model: `test-${id}`,
    usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
  };
}

describe.each(PROVIDER_IDS)('%s provider', (id) => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('reports a name', () => {
    expect(createProvider(id).getName()).toBeTruthy();
  });

  it('lists models with id and name', () => {
    const models = createProvider(id).getModels();
    expect(models.length).toBeGreaterThan(0);
    for (const m of models) {
      expect(m.id).toBeTruthy();
      expect(m.name).toBeTruthy();
    }
  });

  it('fails testConnection without a key', async () => {
    const result = await createProvider(id).testConnection();
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/API key/i);
  });

  it('rejects chatCompletion without a key', async () => {
    await expect(
      createProvider(id).chatCompletion([{ role: 'user', content: 'hi' }])
    ).rejects.toThrow();
  });

  it('testConnection succeeds with a mocked 200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ data: [] })));
    const result = await createProvider(id, { apiKey: 'test-key' }).testConnection();
    expect(result.success).toBe(true);
  });

  it('testConnection reports Invalid API key on 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    const result = await createProvider(id, { apiKey: 'bad-key' }).testConnection();
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid API key');
  });

  it('normalizes chatCompletion responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(chatWireBody(id))));
    const result = await createProvider(id, { apiKey: 'k' }).chatCompletion([
      { role: 'user', content: 'hi' },
    ]);
    expect(result.content).toBe('Hello');
    expect(typeof result.model).toBe('string');
    expect(result.usage).toEqual({ inputTokens: 5, outputTokens: 2, totalTokens: 7 });
  });

  it('propagates provider errors when chatCompletion fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: { message: 'boom' } }, 400)));
    await expect(
      createProvider(id, { apiKey: 'k' }).chatCompletion([{ role: 'user', content: 'hi' }])
    ).rejects.toThrow();
  });
});