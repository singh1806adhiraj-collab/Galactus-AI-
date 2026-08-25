/* Galactus AI - Google Gemini Provider */
import { BaseProvider } from './BaseProvider.js';

export class GeminiProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
  }

  getName() {
    return 'Google';
  }

  getModels() {
    return [
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', context: '2M', tier: 'flagship' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', context: '1M', tier: 'fast' },
      { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro', context: '32k', tier: 'fast' },
    ];
  }

  async testConnection() {
    if (!this.apiKey) {
      return { success: false, error: 'No API key configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/models?key=${this.apiKey}`, {
        method: 'GET',
      });

      if (!response.ok) {
        if (response.status === 400 || response.status === 401) {
          return { success: false, error: 'Invalid API key' };
        }
        return { success: false, error: `Connection failed: ${response.status}` };
      }

      return { success: true, message: 'Google Gemini connection successful' };
    } catch (error) {
      return { success: false, error: this.handleError(error).message };
    }
  }

  async chatCompletion(messages, options = {}) {
    if (!this.apiKey) {
      throw new Error('No API key configured');
    }

    const model = options.model || this.getDefaultModel();
    const formattedMessages = this.formatMessagesForGemini(messages);

    const response = await fetch(`${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: formattedMessages,
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens ?? 4096,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw this.handleError(new Error(error.error?.message || `API error: ${response.status}`));
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];

    if (!candidate?.content?.parts?.[0]?.text) {
      return { content: '', model, usage: null };
    }

    return {
      content: candidate.content.parts[0].text,
      model,
      usage: candidate.usageMetadata ? {
        inputTokens: candidate.usageMetadata.promptTokenCount || 0,
        outputTokens: candidate.usageMetadata.candidatesTokenCount || 0,
        totalTokens: candidate.usageMetadata.totalTokenCount || 0,
      } : null,
    };
  }

  async *streamChatCompletion(messages, options = {}) {
    if (!this.apiKey) {
      throw new Error('No API key configured');
    }

    const model = options.model || this.getDefaultModel();
    const formattedMessages = this.formatMessagesForGemini(messages);

    const response = await fetch(`${this.baseUrl}/models/${model}:streamGenerateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: formattedMessages,
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens ?? 4096,
        },
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
        try {
          const data = JSON.parse(line);
          const candidate = data.candidates?.[0];
          const text = candidate?.content?.parts?.[0]?.text;
          if (text) {
            yield text;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }

  formatMessagesForGemini(messages) {
    return messages
      .filter(msg => msg.role !== 'system') // System handled separately if needed
      .map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));
  }

  formatMessages(messages) {
    // Override to use Gemini format
    return this.formatMessagesForGemini(messages);
  }
}