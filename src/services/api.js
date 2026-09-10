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

  async testProviderConnection(providerId, apiKey, baseUrl) {
    return fetchWithAuth(`/providers/${providerId}/test`, {
      method: 'POST',
      body: JSON.stringify({ apiKey, baseUrl }),
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
    console.log('[DEBUG] api.streamMessage called:', {
      messagesCount: messages.length,
      provider: options.provider,
      model: options.model
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 180 second timeout

    try {
      const response = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages, ...options }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('[DEBUG] Stream response:', {
        ok: response.ok,
        status: response.status,
        contentType: response.headers.get('content-type')
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Stream failed' }));
        throw new Error(error.error || 'Stream failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let chunkCount = 0;

      let contentChunksYielded = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('[DEBUG] Stream reader done, total SSE chunks:', chunkCount, 'content chunks yielded:', contentChunksYielded);

          // If we never yielded any content, the provider returned an empty response
          if (contentChunksYielded === 0) {
            throw new Error('Provider returned empty response - check API key and model configuration');
          }
          break;
        }

        chunkCount++;
        const chunk = decoder.decode(value);

        if (chunkCount <= 3) {
          console.log(`[DEBUG] Raw SSE chunk ${chunkCount}:`, chunk.substring(0, 200));
        }

        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              console.log('[DEBUG] Received [DONE] marker');
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                console.error('[DEBUG] Server error in stream:', parsed.error);
                throw new Error(parsed.error);
              }
              if (parsed.content) {
                contentChunksYielded++;
                console.log('[DEBUG] Yielding content:', parsed.content.substring(0, 50));
                yield parsed.content;
              }
            } catch (e) {
              // Ignore parse errors
              console.warn('[DEBUG] Parse error:', e.message, 'for line:', line);
            }
          }
        }
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - server did not respond within 3 minutes');
      }
      console.error('[DEBUG] Stream error:', error);
      throw error;
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