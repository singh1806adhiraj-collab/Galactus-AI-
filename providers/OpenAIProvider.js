/* Galactus AI - OpenAI Provider */
import { BaseProvider } from './BaseProvider.js';

export class OpenAIProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.baseUrl = config.baseUrl || 'http://localhost:20128/v1';
    console.log('[DEBUG] OpenAIProvider created with baseUrl:', this.baseUrl);
  }

  getName() {
    return 'OpenAI';
  }

  getModels() {
    // Default models for official OpenAI API
    const defaultModels = [
      { id: 'gpt-4o', name: 'GPT-4o', context: '128k', tier: 'flagship' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', context: '128k', tier: 'fast' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', context: '128k', tier: 'flagship' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', context: '16k', tier: 'fast' },
    ];

    // If using a custom baseUrl (not official OpenAI), we should fetch models from the API
    // This is handled asynchronously via fetchModels() method
    return defaultModels;
  }

  // Cache for dynamically fetched models
  _cachedModels = null;
  _modelsFetched = false;

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
    // For synchronous validation, use cached models or fallback
    const models = this._cachedModels || this.getModels();
    return models.some(m => m.id === model);
  }

  async validateModelAsync(model) {
    // Async validation that fetches models if needed
    const models = await this._getAllModels();
    return models.some(m => m.id === model);
  }

  async fetchModels() {
    if (!this.apiKey) {
      return this.getModels();
    }

    // Only fetch dynamically if using a custom baseUrl (not official OpenAI)
    const isOfficialOpenAI = this.baseUrl === 'https://api.openai.com/v1' || this.baseUrl === 'https://api.openai.com/v1/';

    if (isOfficialOpenAI) {
      return this.getModels();
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn('[DEBUG] fetchModels failed:', response.status);
        return this.getModels();
      }

      const data = await response.json();

      // Convert OpenAI-compatible model list to our format
      if (data.data && Array.isArray(data.data)) {
        return data.data.map(model => ({
          id: model.id,
          name: model.id,
          context: model.context_length ? `${Math.round(model.context_length / 1000)}k` : 'unknown',
          tier: 'custom'
        }));
      }

      return this.getModels();
    } catch (error) {
      console.warn('[DEBUG] fetchModels error:', error.message);
      return this.getModels();
    }
  }

  async testConnection() {
    if (!this.apiKey) {
      return { success: false, error: 'No API key configured' };
    }

    console.log('[DEBUG] OpenAIProvider.testConnection to:', this.baseUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('[DEBUG] OpenAIProvider.testConnection response:', { status: response.status, ok: response.ok });

      if (!response.ok) {
        if (response.status === 401) {
          return { success: false, error: 'Invalid API key' };
        }
        const errorText = await response.text().catch(() => '');
        return { success: false, error: `Connection failed: ${response.status} ${errorText.substring(0, 100)}` };
      }

      return { success: true, message: 'OpenAI connection successful' };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        return { success: false, error: 'Connection timeout - provider did not respond within 15 seconds' };
      }
      return { success: false, error: this.handleError(error).message };
    }
  }

  async chatCompletion(messages, options = {}) {
    if (!this.apiKey) {
      throw new Error('No API key configured');
    }

    const model = options.model || this.getDefaultModel();
    const formattedMessages = this.formatMessages(messages);

    const requestBody = {
      model,
      messages: formattedMessages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      stream: false,
    };

    console.log('[DEBUG] OpenAIProvider.chatCompletion:', { baseUrl: this.baseUrl, model, messagesCount: formattedMessages.length });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

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
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - provider did not respond within 60 seconds');
      }
      throw error;
    }
  }

  async *streamChatCompletion(messages, options = {}) {
    if (!this.apiKey) {
      throw new Error('No API key configured');
    }

    const model = options.model || this.getDefaultModel();
    const formattedMessages = this.formatMessages(messages);

    console.log('[DEBUG] OpenAIProvider.streamChatCompletion:');
    console.log('  baseUrl:', this.baseUrl);
    console.log('  model:', model);
    console.log('  messages length:', formattedMessages.length);
    console.log('  first message:', formattedMessages[0]?.content?.substring(0, 50) + '...');

    const requestBody = {
      model,
      messages: formattedMessages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      stream: true,
    };

    console.log('  request body:', JSON.stringify(requestBody));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout for streaming

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      console.log('  response status:', response.status);
      console.log('  response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('  error response:', errorText);
        throw this.handleError(new Error(`API error: ${response.status}`));
      }

      clearTimeout(timeoutId);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      console.log('  Starting to read stream...');
      let chunkCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('  Stream ended, total chunks:', chunkCount);
          break;
        }

        chunkCount++;
        const chunk = decoder.decode(value);

        if (chunkCount <= 3) { // Log first few chunks
          console.log(`  Chunk ${chunkCount}:`, chunk.substring(0, 200));
        }

        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              console.log('  Received [DONE] marker');
              return;
            }

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
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - provider did not respond within 120 seconds');
      }
      throw error;
    }
  }
}