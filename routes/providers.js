/* Galactus AI - Provider Config Routes */
import express from 'express';
import jwt from 'jsonwebtoken';
import { getDb, generateId, encrypt, decrypt, now } from '../db/database.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Get all provider configs for user
router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const configs = db.prepare(`
      SELECT id, provider, enabled, created_at, updated_at
      FROM provider_configs
      WHERE user_id = ?
    `).all(req.userId);

    // Don't return encrypted config
    res.json({ providers: configs });
  } catch (error) {
    console.error('Get providers error:', error);
    res.status(500).json({ error: 'Failed to get providers' });
  }
});

// Save/update provider config
router.post('/', authenticateToken, (req, res) => {
  try {
    const { provider, config, enabled } = req.body;

    if (!provider || !config) {
      return res.status(400).json({ error: 'Provider and config are required' });
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM provider_configs WHERE user_id = ? AND provider = ?').get(req.userId, provider);
    const timestamp = now();
    const encryptedConfig = encrypt(JSON.stringify(config));

    if (existing) {
      db.prepare(`
        UPDATE provider_configs SET encrypted_config = ?, enabled = ?, updated_at = ? WHERE id = ?
      `).run(encryptedConfig, enabled ? 1 : 0, timestamp, existing.id);
    } else {
      const configId = generateId();
      db.prepare(`
        INSERT INTO provider_configs (id, user_id, provider, encrypted_config, enabled, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(configId, req.userId, provider, encryptedConfig, enabled ? 1 : 0, timestamp, timestamp);
    }

    res.json({ message: 'Provider configuration saved' });
  } catch (error) {
    console.error('Save provider error:', error);
    res.status(500).json({ error: 'Failed to save provider configuration' });
  }
});

// Get specific provider config (with decrypted config for editing)
router.get('/:provider', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const config = db.prepare(`
      SELECT id, provider, encrypted_config, enabled, created_at, updated_at
      FROM provider_configs
      WHERE user_id = ? AND provider = ?
    `).get(req.userId, req.params.provider);

    if (!config) {
      return res.status(404).json({ error: 'Provider configuration not found' });
    }

    // Decrypt config for editing
    let decryptedConfig = {};
    try {
      decryptedConfig = JSON.parse(decrypt(config.encrypted_config));
    } catch (e) {
      console.error('Failed to decrypt config:', e);
    }

    res.json({
      provider: {
        ...config,
        config: decryptedConfig,
      },
    });
  } catch (error) {
    console.error('Get provider error:', error);
    res.status(500).json({ error: 'Failed to get provider' });
  }
});

// Delete provider config
router.delete('/:provider', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM provider_configs WHERE user_id = ? AND provider = ?').run(req.userId, req.params.provider);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Provider configuration not found' });
    }

    res.json({ message: 'Provider configuration deleted' });
  } catch (error) {
    console.error('Delete provider error:', error);
    res.status(500).json({ error: 'Failed to delete provider' });
  }
});

export default router;