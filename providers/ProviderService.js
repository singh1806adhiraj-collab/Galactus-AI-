/* Galactus AI - Provider Service */
import crypto from 'crypto';
import { getDb, decrypt as decryptDb, now } from '../db/database.js';
import { createProvider, getProviderMetadata, getAvailableProviders } from './index.js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16;

// Make encrypt/decrypt available as static methods
class CryptoUtils {
  static encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  static decrypt(encryptedText) {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}

// Backward compatibility
function encrypt(text) {
  return CryptoUtils.encrypt(text);
}

function decrypt(encryptedText) {
  return CryptoUtils.decrypt(encryptedText);
}

// Make encrypt/decrypt available as static methods
class CryptoUtils {
  static encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  static decrypt(encryptedText) {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}

class ProviderService {
  async getUserProviders(userId) {
    const db = getDb();
    const providers = db.prepare(`
      SELECT id, provider, enabled, created_at, updated_at
      FROM provider_configs
      WHERE user_id = ?
    `).all(userId);

    return providers.map(p => ({
      ...p,
      enabled: p.enabled === 1,
      metadata: getProviderMetadata(p.provider),
    }));
  }

  async getUserProvider(userId, providerId) {
    const db = getDb();
    const config = db.prepare(`
      SELECT id, provider, encrypted_config, enabled, created_at, updated_at
      FROM provider_configs
      WHERE user_id = ? AND provider = ?
    `).get(userId, providerId);

    if (!config) return null;

    let decryptedConfig = {};
    try {
      decryptedConfig = JSON.parse(CryptoUtils.decrypt(config.encrypted_config));
    } catch (e) {
      console.error('Failed to decrypt provider config:', e);
    }

    return {
      ...config,
      enabled: config.enabled === 1,
      config: decryptedConfig,
      metadata: getProviderMetadata(config.provider),
    };
  }

  async saveProviderConfig(userId, providerId, configData, enabled = true) {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM provider_configs WHERE user_id = ? AND provider = ?').get(userId, providerId);
    const timestamp = now();
    const encryptedConfig = CryptoUtils.encrypt(JSON.stringify(configData));

    if (existing) {
      db.prepare(`
        UPDATE provider_configs SET encrypted_config = ?, enabled = ?, updated_at = ? WHERE id = ?
      `).run(encryptedConfig, enabled ? 1 : 0, timestamp, existing.id);
    } else {
      const configId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO provider_configs (id, user_id, provider, encrypted_config, enabled, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(configId, userId, providerId, encryptedConfig, enabled ? 1 : 0, timestamp, timestamp);
    }
  }

  async deleteProviderConfig(userId, providerId) {
    const db = getDb();
    const result = db.prepare('DELETE FROM provider_configs WHERE user_id = ? AND provider = ?').run(userId, providerId);
    return result.changes > 0;
  }

  async testProviderConnection(userId, providerId) {
    const providerConfig = await this.getUserProvider(userId, providerId);
    if (!providerConfig) {
      return { success: false, error: 'Provider not configured' };
    }

    const provider = createProvider(providerId, {
      apiKey: providerConfig.config.apiKey,
      enabled: providerConfig.enabled,
    });

    return await provider.testConnection();
  }

  async chatCompletion(userId, providerId, messages, options = {}) {
    const providerConfig = await this.getUserProvider(userId, providerId);
    if (!providerConfig) {
      throw new Error('Provider not configured');
    }

    if (!providerConfig.enabled) {
      throw new Error('Provider is disabled');
    }

    const provider = createProvider(providerId, {
      apiKey: providerConfig.config.apiKey,
      enabled: true,
    });

    const model = options.model || provider.getDefaultModel();
    if (!provider.validateModel(model)) {
      throw new Error(`Model ${model} not supported by ${providerId}`);
    }

    const startTime = Date.now();
    let result;

    try {
      result = await provider.chatCompletion(messages, { ...options, model });

      // Log usage
      await this.logUsage(userId, providerId, model, {
        inputTokens: result.usage?.inputTokens || 0,
        outputTokens: result.usage?.outputTokens || 0,
        latencyMs: Date.now() - startTime,
        status: 'success',
      });

      return result;
    } catch (error) {
      // Log failed usage
      await this.logUsage(userId, providerId, model, {
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: Date.now() - startTime,
        status: 'error',
      });
      throw error;
    }
  }

  async *streamChatCompletion(userId, providerId, messages, options = {}) {
    const providerConfig = await this.getUserProvider(userId, providerId);
    if (!providerConfig) {
      throw new Error('Provider not configured');
    }

    if (!providerConfig.enabled) {
      throw new Error('Provider is disabled');
    }

    const provider = createProvider(providerId, {
      apiKey: providerConfig.config.apiKey,
      enabled: true,
    });

    const model = options.model || provider.getDefaultModel();
    if (!provider.validateModel(model)) {
      throw new Error(`Model ${model} not supported by ${providerId}`);
    }

    const startTime = Date.now();
    let totalTokens = { input: 0, output: 0 };

    try {
      for await (const chunk of provider.streamChatCompletion(messages, { ...options, model })) {
        totalTokens.output++;
        yield chunk;
      }

      // Log usage (approximate)
      await this.logUsage(userId, providerId, model, {
        inputTokens: totalTokens.input,
        outputTokens: totalTokens.output,
        latencyMs: Date.now() - startTime,
        status: 'success',
      });
    } catch (error) {
      await this.logUsage(userId, providerId, model, {
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: Date.now() - startTime,
        status: 'error',
      });
      throw error;
    }
  }

  async logUsage(userId, provider, model, { inputTokens, outputTokens, latencyMs, status }) {
    const db = getDb();
    const usageId = crypto.randomUUID();
    const timestamp = Date.now();

    db.prepare(`
      INSERT INTO usage_logs (id, user_id, provider, model, input_tokens, output_tokens, latency_ms, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(usageId, userId, provider, model, inputTokens || 0, outputTokens || 0, latencyMs || 0, status, Date.now());
  }

  async getProviderHealth(userId, providerId) {
    const providerConfig = await this.getUserProvider(userId, providerId);
    if (!providerConfig) {
      return { status: 'not_configured', message: 'Provider not configured' };
    }

    const testResult = await this.testProviderConnection(userId, providerId);

    return {
      provider: providerId,
      enabled: providerConfig.enabled,
      status: testResult.success ? 'healthy' : 'unhealthy',
      message: testResult.message || testResult.error,
      lastChecked: new Date().toISOString(),
    };
  }
}

export const providerService = new ProviderService();