/* Galactus AI - Usage Routes */
import express from 'express';
import jwt from 'jsonwebtoken';
import { getDb, generateId, now } from '../db/database.js';

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

// Log usage
router.post('/', authenticateToken, (req, res) => {
  try {
    const { provider, model, inputTokens, outputTokens, latencyMs, status } = req.body;

    if (!provider || !model) {
      return res.status(400).json({ error: 'Provider and model are required' });
    }

    const db = getDb();
    const usageId = generateId();
    const timestamp = now();

    db.prepare(`
      INSERT INTO usage_logs (id, user_id, provider, model, input_tokens, output_tokens, latency_ms, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(usageId, req.userId, provider, model, inputTokens || 0, outputTokens || 0, latencyMs || 0, status || 'success', timestamp);

    res.status(201).json({ message: 'Usage logged' });
  } catch (error) {
    console.error('Log usage error:', error);
    res.status(500).json({ error: 'Failed to log usage' });
  }
});

// Get usage stats for user
router.get('/stats', authenticateToken, (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const db = getDb();

    let dateFilter = '';
    const params = [req.userId];

    if (startDate) {
      dateFilter += ' AND created_at >= ?';
      params.push(parseInt(startDate));
    }
    if (endDate) {
      dateFilter += ' AND created_at <= ?';
      params.push(parseInt(endDate));
    }

    // Total usage
    const totalUsage = db.prepare(`
      SELECT
        COUNT(*) as total_requests,
        SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens,
        AVG(latency_ms) as avg_latency
      FROM usage_logs
      WHERE user_id = ? ${dateFilter}
    `).get(...params);

    // By provider
    const byProvider = db.prepare(`
      SELECT
        provider,
        COUNT(*) as requests,
        SUM(input_tokens) as input_tokens,
        SUM(output_tokens) as output_tokens,
        AVG(latency_ms) as avg_latency
      FROM usage_logs
      WHERE user_id = ? ${dateFilter}
      GROUP BY provider
    `).all(...params);

    // By model
    const byModel = db.prepare(`
      SELECT
        model,
        COUNT(*) as requests,
        SUM(input_tokens) as input_tokens,
        SUM(output_tokens) as output_tokens,
        AVG(latency_ms) as avg_latency
      FROM usage_logs
      WHERE user_id = ? ${dateFilter}
      GROUP BY model
    `).all(...params);

    // Daily usage (last 30 days)
    const thirtyDaysAgo = now() - 30 * 24 * 60 * 60 * 1000;
    const dailyUsage = db.prepare(`
      SELECT
        DATE(created_at / 1000, 'unixepoch') as date,
        COUNT(*) as requests,
        SUM(input_tokens) as input_tokens,
        SUM(output_tokens) as output_tokens
      FROM usage_logs
      WHERE user_id = ? AND created_at >= ?
      GROUP BY date
      ORDER BY date DESC
    `).all(req.userId, thirtyDaysAgo);

    res.json({
      total: totalUsage,
      byProvider,
      byModel,
      daily: dailyUsage,
    });
  } catch (error) {
    console.error('Get usage stats error:', error);
    res.status(500).json({ error: 'Failed to get usage stats' });
  }
});

// Get recent usage logs
router.get('/logs', authenticateToken, (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const db = getDb();

    const logs = db.prepare(`
      SELECT id, provider, model, input_tokens, output_tokens, latency_ms, status, created_at
      FROM usage_logs
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(req.userId, parseInt(limit), parseInt(offset));

    const total = db.prepare('SELECT COUNT(*) as count FROM usage_logs WHERE user_id = ?').get(req.userId);

    res.json({ logs, total: total.count });
  } catch (error) {
    console.error('Get usage logs error:', error);
    res.status(500).json({ error: 'Failed to get usage logs' });
  }
});

export default router;