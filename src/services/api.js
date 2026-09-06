/* Galactus AI - API Service */
const API_BASE = '/api';

async function fetchWithAuth(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Auth
  async login(email, password, rememberMe = false) {
    return fetchWithAuth('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, rememberMe }),
    });
  },

  async signup(name, email, password) {
    return fetchWithAuth('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  },

  async guestLogin() {
    return fetchWithAuth('/auth/guest', {
      method: 'POST',
    });
  },

  async logout() {
    return fetchWithAuth('/auth/logout', {
      method: 'POST',
    });
  },

  async verifyAuth() {
    return fetchWithAuth('/auth/verify');
  },

  // Providers
  async getProviderMetadata() {
    return fetchWithAuth('/providers/metadata');
  },

  async getUserProviders() {
    return fetchWithAuth('/providers');
  },

  async getProviderConfig(providerId) {
    return fetchWithAuth(`/providers/${providerId}`);
  },

  async saveProviderConfig(providerId, config, enabled = true) {
    return fetchWithAuth('/providers', {
      method: 'POST',
      body: JSON.stringify({ provider: providerId, config, enabled }),
    });
  },

  async testProviderConnection(providerId, apiKey) {
    return fetchWithAuth(`/providers/${providerId}/test`, {
      method: 'POST',
      body: JSON.stringify({ apiKey }),
    });
  },

  async toggleProvider(providerId, enabled) {
    return fetchWithAuth(`/providers/${providerId}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    });
  },

  async getProviderHealth(providerId) {
    return fetchWithAuth(`/providers/${providerId}/health`);
  },

  async deleteProvider(providerId) {
    return fetchWithAuth(`/providers/${providerId}`, {
      method: 'DELETE',
    });
  },

  async getProviderModels(providerId) {
    return fetchWithAuth(`/providers/${providerId}/models`);
  },

  // Chat
  async sendMessage(messages, options = {}) {
    return fetchWithAuth('/chat/complete', {
      method: 'POST',
      body: JSON.stringify({ messages, ...options }),
    });
  },

  async *streamMessage(messages, options = {}) {
    const response = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages, ...options }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Stream failed' }));
      throw new Error(error.error || 'Stream failed');
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
            if (parsed.content) {
              yield parsed.content;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }
  },

  // Conversations
  async getConversations() {
    return fetchWithAuth('/conversations');
  },

  async createConversation(title) {
    return fetchWithAuth('/conversations', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  },

  async getConversation(id) {
    return fetchWithAuth(`/conversations/${id}`);
  },

  async updateConversation(id, title) {
    return fetchWithAuth(`/conversations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
  },

  async deleteConversation(id) {
    return fetchWithAuth(`/conversations/${id}`, {
      method: 'DELETE',
    });
  },

  // Usage
  async getUsageStats(startDate, endDate) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return fetchWithAuth(`/usage/stats?${params}`);
  },

  async getUsageLogs(limit = 50, offset = 0) {
    return fetchWithAuth(`/usage/logs?limit=${limit}&offset=${offset}`);
  },
};

export default api;