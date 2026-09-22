/* Galactus AI - Google Gemini Provider */
import { BaseProvider } from './BaseProvider.js';

export class GeminiProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
    this._cachedModels = null;
    this._modelsFetched = false;
  }

  getName() {
    return 'Google';
  }

  getModels() {
    // Current Google Gemini models (as of 2025)
    // Using -latest aliases which always point to the latest stable version
    return [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', context: '2M', tier: 'flagship' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', context: '1M', tier: 'fast' },
      { id: 'gemini-1.5-pro-latest', name: 'Gemini 1.5 Pro (Latest)', context: '2M', tier: 'flagship' },
      { id: 'gemini-1.5-flash-latest', name: 'Gemini 1.5 Flash (Latest)', context: '1M', tier: 'fast' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', context: '1M', tier: 'fast' },
    ];
  }

  async _getAllModels() {
    if (this._modelsFetched && this._cachedModels) {
      return this._cachedModels;
    }
    const models = await this.fetchModels();
    this._cachedModels = models;
    this._modelsFetched = true;
    return models;
  }

  validateModel(model) {
    const models = this._cachedModels || this.getModels();
    return models.some(m => m.id === model);
  }

  async validateModelAsync(model) {
    const models = await this._getAllModels();
    return models.some(m => m.id === model);
  }

  async fetchModels() {
    if (!this.apiKey) {
      return this.getModels();
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${this.baseUrl}/models?key=${this.apiKey}`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn('[GEMINI] fetchModels failed:', response.status);
        return this.getModels();
      }

      const data = await response.json();

      if (data.models && Array.isArray(data.models)) {
        // Filter for text generation models (exclude embedding, vision-only, etc.)
        const textModels = data.models
          .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
          .map(model => ({
            id: model.name.replace('models/', ''),
            name: model.displayName || model.name.replace('models/', ''),
            context: model.inputTokenLimit ? `${Math.round(model.inputTokenLimit / 1000)}k` : 'unknown',
            tier: model.name.includes('pro') ? 'flagship' : 'fast',
          }));

        console.log(`[GEMINI] Fetched ${textModels.length} text-generation models`);

        if (textModels.length === 0) {
          console.warn('[GEMINI] No text models found, falling back to defaults');
          return this.getModels();
        }

        return textModels;
      }

      return this.getModels();
    } catch (error) {
      console.warn('[GEMINI] fetchModels error:', error.message);
      return this.getModels();
    }
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

    // Use x-goog-api-key header for authentication (recommended by Google)
    const response = await fetch(`${this.baseUrl}/models/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey,
      },
      body: JSON.stringify({
        contents: formattedMessages,
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens ?? 4096,
        },
      }),
    });

    console.log('[GEMINI] chatCompletion:', { model, status: response.status, endpoint: `${this.baseUrl}/models/${model}:generateContent` });

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

    // Use x-goog-api-key header for authentication (recommended by Google)
    const response = await fetch(`${this.baseUrl}/models/${model}:streamGenerateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey,
      },
      body: JSON.stringify({
        contents: formattedMessages,
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens ?? 4096,
        },
      }),
    });

    console.log('[GEMINI] streamChatCompletion:', { model, status: response.status, endpoint: `${this.baseUrl}/models/${model}:streamGenerateContent` });

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