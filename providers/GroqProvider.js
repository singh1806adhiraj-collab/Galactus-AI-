/* Galactus AI - Groq Provider */
import { BaseProvider } from './BaseProvider.js';

export class GroqProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.baseUrl = config.baseUrl || 'https://api.groq.com/openai/v1';
  }

  getName() {
    return 'Groq';
  }

  getModels() {
    // Current official Groq production chat-capable models (as of 2026)
    // Deprecated models (llama-3.1-8b-instant, llama-3.3-70b-versatile) removed per Groq deprecation Aug 16, 2026
    return [
      { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B', context: '128k', tier: 'flagship' },
      { id: 'openai/gpt-oss-20b', name: 'GPT-OSS 20B', context: '128k', tier: 'fast' },
      { id: 'qwen/qwen3-32b', name: 'Qwen 3 32B', context: '128k', tier: 'flagship' },
      { id: 'qwen/qwen3-8b', name: 'Qwen 3 8B', context: '128k', tier: 'fast' },
      { id: 'groq/compound', name: 'Compound', context: '128k', tier: 'flagship' },
      { id: 'groq/compound-mini', name: 'Compound Mini', context: '128k', tier: 'fast' },
    ];
  }

  async testConnection() {
    if (!this.apiKey) {
      return { success: false, error: 'No API key configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          return { success: false, error: 'Invalid API key' };
        }
        return { success: false, error: `Connection failed: ${response.status}` };
      }

      return { success: true, message: 'Groq connection successful' };
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

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw this.handleError(new Error(error.error?.message || `API error: ${response.status}`));
    }

    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || '',
      model: data.model,
      usage: data.usage ? {
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : null,
    };
  }

  async *streamChatCompletion(messages, options = {}) {
    if (!this.apiKey) {
      throw new Error('No API key configured');
    }

    const model = options.model || this.getDefaultModel();
    const formattedMessages = this.formatMessages(messages);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
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
            const content = parsed.choices[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }
  }
}