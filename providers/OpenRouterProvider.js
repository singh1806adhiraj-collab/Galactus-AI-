/* Galactus AI - OpenRouter Provider */
import { BaseProvider } from './BaseProvider.js';

export class OpenRouterProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.baseUrl = config.baseUrl || 'https://openrouter.ai/api/v1';
    this.siteUrl = config.siteUrl || 'https://galactus.ai';
    this.siteName = config.siteName || 'Galactus AI';
  }

  getName() {
    return 'OpenRouter';
  }

  getModels() {
    return [
      { id: 'openai/gpt-4o', name: 'GPT-4o (OpenRouter)', context: '128k', tier: 'flagship' },
      { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini (OpenRouter)', context: '128k', tier: 'fast' },
      { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (OpenRouter)', context: '200k', tier: 'flagship' },
      { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku (OpenRouter)', context: '200k', tier: 'fast' },
      { id: 'google/gemini-1.5-pro', name: 'Gemini 1.5 Pro (OpenRouter)', context: '2M', tier: 'flagship' },
      { id: 'google/gemini-1.5-flash', name: 'Gemini 1.5 Flash (OpenRouter)', context: '1M', tier: 'fast' },
      { id: 'deepseek/deepseek-v3', name: 'DeepSeek V3 (OpenRouter)', context: '128k', tier: 'flagship' },
      { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (OpenRouter)', context: '128k', tier: 'reasoning' },
      { id: 'meta-llama/llama-3.1-405b', name: 'Llama 3.1 405B (OpenRouter)', context: '128k', tier: 'flagship' },
      { id: 'meta-llama/llama-3.1-70b', name: 'Llama 3.1 70B (OpenRouter)', context: '128k', tier: 'flagship' },
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
          'HTTP-Referer': this.siteUrl,
          'X-Title': this.siteName,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          return { success: false, error: 'Invalid API key' };
        }
        return { success: false, error: `Connection failed: ${response.status}` };
      }

      return { success: true, message: 'OpenRouter connection successful' };
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
        'HTTP-Referer': this.siteUrl,
        'X-Title': this.siteName,
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
        'HTTP-Referer': this.siteUrl,
        'X-Title': this.siteName,
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