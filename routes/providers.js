/* Galactus AI - Provider Config Routes */
import express from 'express';
import jwt from 'jsonwebtoken';
import { providerService } from '../providers/ProviderService.js';
import { createProvider, getProviderMetadata, getAllProvidersMetadata, getAvailableProviders } from '../providers/index.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

function authenticateToken(req, res, next) {
  let token = null;

  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // Check cookies - try multiple sources
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

  console.log('DEBUG AUTH: token found:', !!token, 'token prefix:', token?.substring(0, 20));
  console.log('DEBUG AUTH: req.cookies:', req.cookies);
  console.log('DEBUG AUTH: req.headers.cookie:', req.headers.cookie);

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

// Get all available provider metadata (public)
router.get('/metadata', (req, res) => {
  res.json({ providers: getAllProvidersMetadata() });
});

// Get user's configured providers
router.get('/', authenticateToken, async (req, res) => {
  try {
    const providers = await providerService.getUserProviders(req.userId);
    res.json({ providers });
  } catch (error) {
    console.error('Get providers error:', error);
    res.status(500).json({ error: 'Failed to get providers' });
  }
});

// Get specific provider config
router.get('/:provider', authenticateToken, async (req, res) => {
  try {
    const providerConfig = await providerService.getUserProvider(req.userId, req.params.provider);

    if (!providerConfig) {
      return res.status(404).json({ error: 'Provider configuration not found' });
    }

    res.json({
      provider: {
        ...providerConfig,
        metadata: getProviderMetadata(providerConfig.provider),
      },
    });
  } catch (error) {
    console.error('Get provider error:', error);
    res.status(500).json({ error: 'Failed to get provider' });
  }
});

// Save/update provider config
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { provider, config, enabled } = req.body;

    if (!provider || !config) {
      return res.status(400).json({ error: 'Provider and config are required' });
    }

    // Validate provider exists
    if (!getAvailableProviders().includes(provider)) {
      return res.status(400).json({ error: 'Unknown provider' });
    }

    // Validate required config fields
    const metadata = getProviderMetadata(provider);
    if (metadata?.requiresApiKey && !config.apiKey) {
      return res.status(400).json({ error: 'API key is required for this provider' });
    }

    await providerService.saveProviderConfig(req.userId, provider, config, enabled);

    res.json({ message: 'Provider configuration saved' });
  } catch (error) {
    console.error('Save provider error:', error);
    res.status(500).json({ error: 'Failed to save provider configuration' });
  }
});

// Test provider connection (optional apiKey tests an unsaved key)
router.post('/:provider/test', authenticateToken, async (req, res) => {
  try {
    const result = await providerService.testProviderConnection(req.userId, req.params.provider, req.body?.apiKey);
    res.json(result);
  } catch (error) {
    console.error('Test provider error:', error);
    res.status(500).json({ error: 'Failed to test provider connection' });
  }
});

// Get models available for a provider
router.get('/:provider/models', authenticateToken, async (req, res) => {
  try {
    const providerConfig = await providerService.getUserProvider(req.userId, req.params.provider);

    if (!providerConfig) {
      return res.status(404).json({ error: 'Provider not configured' });
    }

    const provider = createProvider(req.params.provider, {
      apiKey: providerConfig.config.apiKey,
    });

    res.json({ models: provider.getModels() });
  } catch (error) {
    console.error('Get provider models error:', error);
    res.status(500).json({ error: 'Failed to get models' });
  }
});

// Enable/disable provider
router.patch('/:provider/toggle', authenticateToken, async (req, res) => {
  try {
    const { enabled } = req.body;
    const providerConfig = await providerService.getUserProvider(req.userId, req.params.provider);

    if (!providerConfig) {
      return res.status(404).json({ error: 'Provider configuration not found' });
    }

    await providerService.saveProviderConfig(req.userId, req.params.provider, providerConfig.config, enabled);

    res.json({ message: `Provider ${enabled ? 'enabled' : 'disabled'}` });
  } catch (error) {
    console.error('Toggle provider error:', error);
    res.status(500).json({ error: 'Failed to update provider status' });
  }
});

// Get provider health
router.get('/:provider/health', authenticateToken, async (req, res) => {
  try {
    const health = await providerService.getProviderHealth(req.userId, req.params.provider);
    res.json(health);
  } catch (error) {
    console.error('Provider health error:', error);
    res.status(500).json({ error: 'Failed to get provider health' });
  }
});

// Delete provider config
router.delete('/:provider', authenticateToken, async (req, res) => {
  try {
    const deleted = await providerService.deleteProviderConfig(req.userId, req.params.provider);

    if (!deleted) {
      return res.status(404).json({ error: 'Provider configuration not found' });
    }

    res.json({ message: 'Provider configuration deleted' });
  } catch (error) {
    console.error('Delete provider error:', error);
    res.status(500).json({ error: 'Failed to delete provider' });
  }
});

export default router;