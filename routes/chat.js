/* Galactus AI - Chat Routes */
import express from 'express';
import jwt from 'jsonwebtoken';
import { providerService } from '../providers/ProviderService.js';

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

// Non-streaming chat completion
router.post('/complete', authenticateToken, async (req, res) => {
  try {
    const { messages, provider, model, options } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages are required' });
    }

    if (!provider) {
      return res.status(400).json({ error: 'Provider is required' });
    }

    const result = await providerService.chatCompletion(req.userId, provider, messages, {
      model,
      ...options,
    });

    res.json(result);
  } catch (error) {
    console.error('Chat completion error:', error);
    res.status(500).json({ error: error.message || 'Failed to complete chat' });
  }
});

// Streaming chat completion
router.post('/stream', authenticateToken, async (req, res) => {
  try {
    const { messages, provider, model, options } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages are required' });
    }

    if (!provider) {
      return res.status(400).json({ error: 'Provider is required' });
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let totalContent = '';

    for await (const chunk of providerService.streamChatCompletion(req.userId, provider, messages, {
      model,
    })) {
      totalContent += chunk;
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Streaming chat error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// Get available models for a provider
router.get('/models/:provider', authenticateToken, async (req, res) => {
  try {
    const { provider } = req.params;
    const providerConfig = await providerService.getUserProvider(req.userId, provider);

    if (!providerConfig) {
      return res.status(404).json({ error: 'Provider not configured' });
    }

    const providerInstance = await import(`../../providers/${providerConfig.provider}Provider.js`);
    const ProviderClass = providerInstance[`${providerConfig.provider.charAt(0).toUpperCase() + providerConfig.provider.slice(1)}Provider`];
    const instance = new ProviderClass({ apiKey: providerConfig.config.apiKey });

    res.json({ models: instance.getModels() });
  } catch (error) {
    console.error('Get models error:', error);
    res.status(500).json({ error: 'Failed to get models' });
  }
});

export default router;