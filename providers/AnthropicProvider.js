/* Galactus AI - Anthropic Provider */
import { BaseProvider } from './BaseProvider.js';

export class AnthropicProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';
    this.version = config.version || '2023-06-01';
  }

  getName() {
    return 'Anthropic';
  }

  getModels() {
    return [
      { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', context: '200k', tier: 'flagship' },
      { id: 'claude-3.5-haiku', name: 'Claude 3.5 Haiku', context: '200k', tier: 'fast' },
      { id: 'claude-3-opus', name: 'Claude 3 Opus', context: '200k', tier: 'flagship' },
      { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', context: '200k', tier: 'flagship' },
      { id: 'claude-3-haiku', name: 'Claude 3 Haiku', context: '200k', tier: 'fast' },
    ];
  }

  async testConnection() {
    if (!this.apiKey) {
      return { success: false, error: 'No API key configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': this.version,
        },
        body: JSON.stringify({
          model: 'claude-3.5-haiku',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'test' }],
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          return { success: false, error: 'Invalid API key' };
        }
        return { success: false, error: `Connection failed: ${response.status}` };
      }

      return { success: true, message: 'Anthropic connection successful' };
    } catch (error) {
      return { success: false, error: this.handleError(error).message };
    }
  }

  async chatCompletion(messages, options = {}) {
    if (!this.apiKey) {
      throw new Error('No API key configured');
    }

    const model = options.model || this.getDefaultModel();
    const formattedMessages = this.formatMessages(messages);

    // Anthropic uses system prompt separately
    let systemPrompt = '';
    const filteredMessages = formattedMessages.filter(msg => {
      if (msg.role === 'system') {
        systemPrompt = msg.content;
        return false;
      }
      return true;
    });

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': this.version,
      },
      body: JSON.stringify({
        model,
        messages: filteredMessages,
        system: systemPrompt || undefined,
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0.7,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw this.handleError(new Error(error.error?.message || `API error: ${response.status}`));
    }

    const data = await response.json();
    return {
      content: data.content[0]?.text || '',
      model: data.model,
      usage: data.usage ? {
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      } : null,
    };
  }

  async *streamChatCompletion(messages, options = {}) {
    if (!this.apiKey) {
      throw new Error('No API key configured');
    }

    const model = options.model || this.getDefaultModel();
    const formattedMessages = this.formatMessages(messages);

    let systemPrompt = '';
    const filteredMessages = formattedMessages.filter(msg => {
      if (msg.role === 'system') {
        systemPrompt = msg.content;
        return false;
      }
      return true;
    });

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': this.version,
      },
      body: JSON.stringify({
        model,
        messages: filteredMessages,
        system: systemPrompt || undefined,
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw this.handleError(new Error(error.error?.message || `API error: ${response.status}`));
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              yield parsed.delta.text;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }
  }
}