/* Galactus AI - Conversation Routes */
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

// Get all conversations for user
router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const conversations = db.prepare(`
      SELECT id, title, created_at, updated_at
      FROM conversations
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `).all(req.userId);

    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

// Create new conversation
router.post('/', authenticateToken, (req, res) => {
  try {
    const { title } = req.body;
    const conversationId = generateId();
    const timestamp = now();

    const db = getDb();
    db.prepare(`
      INSERT INTO conversations (id, user_id, title, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(conversationId, req.userId, title || 'New Conversation', timestamp, timestamp);

    res.status(201).json({
      conversation: { id: conversationId, title: title || 'New Conversation', createdAt: timestamp, updatedAt: timestamp },
    });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Get conversation with messages
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const conversation = db.prepare(`
      SELECT id, title, created_at, updated_at
      FROM conversations
      WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.userId);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const messages = db.prepare(`
      SELECT id, role, content, model, provider, created_at
      FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `).all(req.params.id);

    res.json({ conversation, messages });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

// Update conversation title
router.patch('/:id', authenticateToken, (req, res) => {
  try {
    const { title } = req.body;
    const db = getDb();

    const result = db.prepare(`
      UPDATE conversations SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?
    `).run(title, now(), req.params.id, req.userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ message: 'Conversation updated' });
  } catch (error) {
    console.error('Update conversation error:', error);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

// Delete conversation
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ message: 'Conversation deleted' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// Add message to conversation
router.post('/:id/messages', authenticateToken, (req, res) => {
  try {
    const { role, content, model, provider } = req.body;
    const messageId = generateId();
    const timestamp = now();

    const db = getDb();
    const conversation = db.prepare('SELECT id FROM conversations WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, model, provider, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(messageId, req.params.id, role, content, model, provider, timestamp);

    // Update conversation timestamp
    db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(timestamp, req.params.id);

    res.status(201).json({
      message: { id: messageId, role, content, model, provider, createdAt: timestamp },
    });
  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

export default router;