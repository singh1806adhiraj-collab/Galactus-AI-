/* Galactus AI - Chat Routes with Debug */
import express from 'express';
import jwt from 'jsonwebtoken';
import { providerService } from '../providers/ProviderService.js';
import { createProvider } from '../providers/index.js';

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

// Streaming chat completion
router.post('/stream', authenticateToken, async (req, res) => {
  console.log('[DEBUG] /api/chat/stream received request');
  console.log('  userId:', req.userId);
  console.log('  body:', JSON.stringify(req.body, null, 2));

  try {
    const { messages, provider, model, options } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.log('[DEBUG] Missing messages');
      return res.status(400).json({ error: 'Messages are required' });
    }

    if (!provider) {
      console.log('[DEBUG] Missing provider');
      return res.status(400).json({ error: 'Provider is required' });
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    console.log('[DEBUG] Headers set, starting stream...');
    let totalContent = '';
    let chunkCount = 0;

    for await (const chunk of providerService.streamChatCompletion(req.userId, provider, messages, {
      model,
    })) {
      chunkCount++;
      totalContent += chunk;
      console.log(`[DEBUG] Sending chunk ${chunkCount}:`, chunk.substring(0, 100));
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    }

    console.log(`[DEBUG] Stream complete, total chunks: ${chunkCount}, total content: ${totalContent.length} chars`);
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('[DEBUG] Streaming chat error:', error);
    console.error('[DEBUG] Error stack:', error.stack);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

export default router;