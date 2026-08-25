/* Galactus AI - Base Provider Interface */
export class BaseProvider {
  constructor(config = {}) {
    this.config = config;
    this.apiKey = config.apiKey;
    this.enabled = config.enabled !== false;
  }

  getName() {
    throw new Error('getName() must be implemented by subclass');
  }

  getModels() {
    throw new Error('getModels() must be implemented by subclass');
  }

  async testConnection() {
    throw new Error('testConnection() must be implemented by subclass');
  }

  async chatCompletion(messages, options = {}) {
    throw new Error('chatCompletion() must be implemented by subclass');
  }

  async *streamChatCompletion(messages, options = {}) {
    throw new Error('streamChatCompletion() must be implemented by subclass');
  }

  isAvailable() {
    return this.enabled && !!this.apiKey;
  }

  getDefaultModel() {
    const models = this.getModels();
    return models[0]?.id || null;
  }

  validateModel(model) {
    const models = this.getModels();
    return models.some(m => m.id === model);
  }

  formatMessages(messages) {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  handleError(error) {
    if (error.response) {
      const status = error.response.status;
      if (status === 401) return new Error('Invalid API key');
      if (status === 429) return new Error('Rate limit exceeded');
      if (status === 404) return new Error('Model not found');
      if (status >= 500) return new Error('Provider service unavailable');
      return new Error(`API error: ${error.response.data?.error?.message || error.message}`);
    }
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return new Error('Cannot connect to provider');
    }
    return new Error(error.message || 'Unknown provider error');
  }
}