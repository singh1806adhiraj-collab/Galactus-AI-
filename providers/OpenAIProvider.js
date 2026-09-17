/* Galactus AI - OpenAI Provider */
import { BaseProvider } from './BaseProvider.js';

// OpenAI model capability mapping
// Based on OpenAI's model capabilities as of 2024
const OPENAI_MODEL_CAPABILITIES = {
  // Chat models (support /chat/completions)
  'gpt-4o': { chat: true, completion: false, embedding: false, image: false, audio: false },
  'gpt-4o-mini': { chat: true, completion: false, embedding: false, image: false, audio: false },
  'gpt-4o-2024-05-13': { chat: true, completion: false, embedding: false, image: false, audio: false },
  'gpt-4o-2024-08-06': { chat: true, completion: false, embedding: false, image: false, audio: false },
  'gpt-4-turbo': { chat: true, completion: false, embedding: false, image: false, audio: false },
  'gpt-4-turbo-2024-04-09': { chat: true, completion: false, embedding: false, image: false, audio: false },
  'gpt-4': { chat: true, completion: false, embedding: false, image: false, audio: false },
  'gpt-4-0613': { chat: true, completion: false, embedding: false, image: false, audio: false },
  'gpt-4-32k': { chat: true, completion: false, embedding: false, image: false, audio: false },
  'gpt-4-32k-0613': { chat: true, completion: false, embedding: false, image: false, audio: false },
  'gpt-3.5-turbo': { chat: true, completion: false, embedding: false, image: false, audio: false },
  'gpt-3.5-turbo-0125': { chat: true, completion: false, embedding: false, image: false, audio: false },
  'gpt-3.5-turbo-1106': { chat: true, completion: false, embedding: false, image: false, audio: false },
  'gpt-3.5-turbo-16k': { chat: true, completion: false, embedding: false, image: false, audio: false },
  'gpt-3.5-turbo-16k-0613': { chat: true, completion: false, embedding: false, image: false, audio: false },
  'gpt-3.5-turbo-0613': { chat: true, completion: false, embedding: false, image: false, audio: false },
  'gpt-3.5-turbo-instruct': { chat: false, completion: true, embedding: false, image: false, audio: false },

  // o1 series
  'o1-preview': { chat: true, completion: false, embedding: false, image: false, audio: false },
  'o1-mini': { chat: true, completion: false, embedding: false, image: false, audio: false },
  'o1-2024-12-17': { chat: true, completion: false, embedding: false, image: false, audio: false },

  // Embedding models (NOT chat)
  'text-embedding-ada-002': { chat: false, completion: false, embedding: true, image: false, audio: false },
  'text-embedding-3-small': { chat: false, completion: false, embedding: true, image: false, audio: false },
  'text-embedding-3-large': { chat: false, completion: false, embedding: true, image: false, audio: false },

  // Image models (NOT chat)
  'dall-e-2': { chat: false, completion: false, embedding: false, image: true, audio: false },
  'dall-e-3': { chat: false, completion: false, embedding: false, image: true, audio: false },

  // Audio models (NOT chat)
  'whisper-1': { chat: false, completion: false, embedding: false, image: false, audio: true },
  'tts-1': { chat: false, completion: false, embedding: false, image: false, audio: true },
  'tts-1-hd': { chat: false, completion: false, embedding: false, image: false, audio: true },

  // Moderation (NOT chat)
  'text-moderation-latest': { chat: false, completion: false, embedding: false, image: false, audio: false, moderation: true },
  'text-moderation-stable': { chat: false, completion: false, embedding: false, image: false, audio: false, moderation: true },
};

// Model ID patterns for capability inference
const MODEL_PATTERNS = [
  { pattern: /^gpt-4/, capabilities: { chat: true, completion: false, embedding: false, image: false, audio: false } },
  { pattern: /^gpt-3\.5-turbo(?!-instruct)/, capabilities: { chat: true, completion: false, embedding: false, image: false, audio: false } },
  { pattern: /^gpt-3\.5-turbo-instruct/, capabilities: { chat: false, completion: true, embedding: false, image: false, audio: false } },
  { pattern: /^o1-/, capabilities: { chat: true, completion: false, embedding: false, image: false, audio: false } },
  { pattern: /^text-embedding-/, capabilities: { chat: false, completion: false, embedding: true, image: false, audio: false } },
  { pattern: /^dall-e-/, capabilities: { chat: false, completion: false, embedding: false, image: true, audio: false } },
  { pattern: /^whisper-/, capabilities: { chat: false, completion: false, embedding: false, image: false, audio: true } },
  { pattern: /^tts-/, capabilities: { chat: false, completion: false, embedding: false, image: false, audio: true } },
  { pattern: /^text-moderation-/, capabilities: { chat: false, completion: false, embedding: false, image: false, audio: false, moderation: true } },
];

function getModelCapabilities(modelId) {
  // First check exact match
  if (OPENAI_MODEL_CAPABILITIES[modelId]) {
    return OPENAI_MODEL_CAPABILITIES[modelId];
  }

  // Then check patterns
  for (const { pattern, capabilities } of MODEL_PATTERNS) {
    if (pattern.test(modelId)) {
      return capabilities;
    }
  }

  // Default: unknown model, assume chat-capable for safety but log warning
  console.warn(`[OPENAI] Unknown model "${modelId}" - defaulting to chat-capable`);
  return { chat: true, completion: false, embedding: false, image: false, audio: false };
}

export class OpenAIProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    console.log('[DEBUG] OpenAIProvider created with baseUrl:', this.baseUrl);
  }

  getName() {
    return 'OpenAI';
  }

  getModels() {
    // Default models for official OpenAI API (chat-capable only)
    const defaultModels = [
      { id: 'gpt-4o', name: 'GPT-4o', context: '128k', tier: 'flagship', capabilities: getModelCapabilities('gpt-4o') },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', context: '128k', tier: 'fast', capabilities: getModelCapabilities('gpt-4o-mini') },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', context: '128k', tier: 'flagship', capabilities: getModelCapabilities('gpt-4-turbo') },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', context: '16k', tier: 'fast', capabilities: getModelCapabilities('gpt-3.5-turbo') },
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

      // Convert OpenAI model list to our format, filtering for chat-capable models
      if (data.data && Array.isArray(data.data)) {
        const allModels = data.data.map(model => ({
          id: model.id,
          name: model.id,
          context: model.context_length ? `${Math.round(model.context_length / 1000)}k` : 'unknown',
          tier: 'custom',
          capabilities: getModelCapabilities(model.id)
        }));

        // Filter for chat-capable models only
        const chatModels = allModels.filter(m => m.capabilities?.chat === true);

        console.log(`[OPENAI] Fetched ${allModels.length} models, ${chatModels.length} are chat-capable`);

        if (chatModels.length === 0) {
          console.warn('[OPENAI] No chat-capable models found, falling back to defaults');
          return this.getModels();
        }

        return chatModels;
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

    const requestedModel = options.model;
    const model = requestedModel || this.getDefaultModel();

    // Validate model capability before sending request
    const capabilities = getModelCapabilities(model);
    if (!capabilities?.chat) {
      throw new Error(`Model "${model}" does not support chat completions. This model may be an embedding, image, audio, or completion-only model.`);
    }

    console.log('[MODEL DEBUG] OpenAIProvider.chatCompletion:', {
      provider: this.getName(),
      requestedModel,
      resolvedModel: model,
      baseUrl: this.baseUrl,
      capabilities
    });

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
        let errorBody;
        try {
          errorBody = await response.json();
        } catch (e) {
          errorBody = { error: { message: await response.text() } };
        }

        const errorMessage = errorBody?.error?.message || `API error: ${response.status}`;
        const errorType = errorBody?.error?.type;
        const errorCode = errorBody?.error?.code;
        const errorParam = errorBody?.error?.param;

        console.error('[OPENAI ERROR]', {
          status: response.status,
          message: errorMessage,
          type: errorType,
          code: errorCode,
          param: errorParam
        });

        // Create an error with the full provider error details
        const error = new Error(errorMessage);
        error.status = response.status;
        error.type = errorType;
        error.code = errorCode;
        error.param = errorParam;
        throw error;
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

    const requestedModel = options.model;
    const model = requestedModel || this.getDefaultModel();

    // Validate model capability before sending request
    const capabilities = getModelCapabilities(model);
    if (!capabilities?.chat) {
      throw new Error(`Model "${model}" does not support chat completions. This model may be an embedding, image, audio, or completion-only model.`);
    }

    console.log('[MODEL DEBUG] OpenAIProvider.streamChatCompletion:', {
      provider: this.getName(),
      requestedModel,
      resolvedModel: model,
      baseUrl: this.baseUrl,
      capabilities
    });

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
        let errorBody;
        try {
          errorBody = await response.json();
        } catch (e) {
          errorBody = { error: { message: await response.text() } };
        }

        const errorMessage = errorBody?.error?.message || `API error: ${response.status}`;
        const errorType = errorBody?.error?.type;
        const errorCode = errorBody?.error?.code;
        const errorParam = errorBody?.error?.param;

        console.error('[OPENAI ERROR]', {
          status: response.status,
          message: errorMessage,
          type: errorType,
          code: errorCode,
          param: errorParam
        });

        // Create an error with the full provider error details
        const error = new Error(errorMessage);
        error.status = response.status;
        error.type = errorType;
        error.code = errorCode;
        error.param = errorParam;
        throw error;
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