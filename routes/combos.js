/* Galactus AI - Combos Routes */
import express from 'express';
import jwt from 'jsonwebtoken';
import { getDb, generateId, now } from '../db/database.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

function authenticateToken(req, res, next) {
  let token = null;

  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // Check cookies
  if (!token && req.cookies && req.cookies.access_token) {
    token = req.cookies.access_token;
  }

  // Fallback: manually parse cookie header
  if (!token && req.headers.cookie) {
    const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      if (key && value) acc[key] = value;
      return acc;
    }, {});
    if (cookies.access_token) {
      token = cookies.access_token;
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Get all user combos
router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const combos = db.prepare(`
      SELECT id, name, models, priority, description, created_at, updated_at
      FROM combos
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `).all(req.userId);

    res.json({
      combos: combos.map(c => ({
        ...c,
        models: JSON.parse(c.models),
      }))
    });
  } catch (error) {
    console.error('Get combos error:', error);
    res.status(500).json({ error: 'Failed to get combos' });
  }
});

// Create new combo
router.post('/', authenticateToken, (req, res) => {
  try {
    const { name, models, priority, description } = req.body;

    if (!name || !models || !Array.isArray(models) || models.length === 0) {
      return res.status(400).json({ error: 'Name and at least one model are required' });
    }

    const validModels = models.filter(m => m && typeof m === 'string');
    if (validModels.length === 0) {
      return res.status(400).json({ error: 'At least one valid model is required' });
    }

    const db = getDb();
    const comboId = generateId();
    const timestamp = now();

    db.prepare(`
      INSERT INTO combos (id, user_id, name, models, priority, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(comboId, req.userId, name, JSON.stringify(validModels), priority || 'Balanced', description || '', timestamp, timestamp);

    res.status(201).json({
      message: 'Combo created',
      combo: { id: comboId, name, models: validModels, priority: priority || 'Balanced', description: description || '', created_at: timestamp, updated_at: timestamp }
    });
  } catch (error) {
    console.error('Create combo error:', error);
    res.status(500).json({ error: 'Failed to create combo' });
  }
});

// Update combo
router.patch('/:id', authenticateToken, (req, res) => {
  try {
    const { name, models, priority, description } = req.body;
    const comboId = req.params.id;

    const db = getDb();
    const existing = db.prepare('SELECT id FROM combos WHERE id = ? AND user_id = ?').get(comboId, req.userId);

    if (!existing) {
      return res.status(404).json({ error: 'Combo not found' });
    }

    const updates = [];
    const params = [];

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ error: 'Name cannot be empty' });
      }
      updates.push('name = ?');
      params.push(name.trim());
    }

    if (models !== undefined) {
      if (!Array.isArray(models) || models.length === 0) {
        return res.status(400).json({ error: 'At least one model is required' });
      }
      const validModels = models.filter(m => m && typeof m === 'string');
      if (validModels.length === 0) {
        return res.status(400).json({ error: 'At least one valid model is required' });
      }
      updates.push('models = ?');
      params.push(JSON.stringify(validModels));
    }

    if (priority !== undefined) {
      updates.push('priority = ?');
      params.push(priority);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description || '');
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    updates.push('updated_at = ?');
    params.push(now());
    params.push(comboId, req.userId);

    db.prepare(`UPDATE combos SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);

    const updated = db.prepare('SELECT * FROM combos WHERE id = ?').get(comboId);

    res.json({
      message: 'Combo updated',
      combo: { ...updated, models: JSON.parse(updated.models) }
    });
  } catch (error) {
    console.error('Update combo error:', error);
    res.status(500).json({ error: 'Failed to update combo' });
  }
});

// Delete combo
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const comboId = req.params.id;
    const db = getDb();

    const result = db.prepare('DELETE FROM combos WHERE id = ? AND user_id = ?').run(comboId, req.userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Combo not found' });
    }

    res.json({ message: 'Combo deleted' });
  } catch (error) {
    console.error('Delete combo error:', error);
    res.status(500).json({ error: 'Failed to delete combo' });
  }
});

export default router;